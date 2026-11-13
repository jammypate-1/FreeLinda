// Withdrawal Plan math: how much Linda needs to pull, and which accounts to pull it from in the order that costs the
// least tax. Pure functions over the plan's own data; the page and the tests use them.
import type { AssetAccount, CashFlowItem, TaxLot, WithdrawalConfig } from '../types/financial';

export type AccountKind = 'cash' | 'taxable' | 'roth' | 'pre_tax' | 'hsa' | 'illiquid';

export const DEFAULT_WITHDRAWAL_CONFIG: WithdrawalConfig = {
  needSource: 'plan',
  customMonthlyNeed: 0,
  monthsToFund: 12,
  cashFloorMonths: 18,
  longTermGainsRate: 0.24,
  ordinaryIncomeRate: 0.35,
  earlyWithdrawalPenalty: 0.125,
  excludedAssetIds: []
};

// Which tax lots belong to which account (the same pairing App.tsx uses for live prices).
export const LOT_TICKER_BY_ASSET: Record<string, string> = { 'A-02': 'GOOG', 'A-03': 'SPCX' };

export interface MonthlyNeed {
  expenses: number;
  essential: number;
  income: number;
  gap: number;
}

export interface LotSale {
  lotId: string;
  ticker: string;
  acquisitionDate: string;
  term: TaxLot['term'];
  shares: number;
  proceeds: number;
  gain: number;
}

export interface WithdrawalLine {
  assetId: string;
  name: string;
  kind: AccountKind;
  gross: number;
  tax: number;
  net: number;
  reason: string;
  lots: LotSale[];
}

export interface WithdrawalPlan {
  netNeeded: number;
  cashFloor: number;
  lines: WithdrawalLine[];
  totalGross: number;
  totalTax: number;
  totalNet: number;
  shortfall: number;
  notes: string[];
}

export interface WithdrawalInputs {
  assets: AssetAccount[];
  taxLots: TaxLot[];
  config: WithdrawalConfig;
  monthlyNeed: number;
  essentialMonthly: number;
  age: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
const money = (value: number): string => `$${Math.round(value).toLocaleString('en-US')}`;
const pct = (value: number): string => `${Math.round(value * 1000) / 10}%`;

export function classifyAccount(asset: AssetAccount): AccountKind {
  const text = `${asset.type} ${asset.taxRegistration}`.toLowerCase();
  if (asset.liquidity === 'Illiquid' || asset.type === 'Real Estate') return 'illiquid';
  if (text.includes('hsa')) return 'hsa';
  if (text.includes('roth')) return 'roth';
  if (/401\(k\)|403\(b\)|457\(b\)|\bira\b|\bsep\b|pre-tax|traditional/.test(text)) return 'pre_tax';
  if (asset.type === 'Cash / Bank' || asset.allocationCategory === 'Cash') return 'cash';
  return 'taxable';
}

export function planMonthlyNeed(cashFlows: CashFlowItem[]): MonthlyNeed {
  const active = cashFlows.filter(item => item.status === 'Active');
  const expenses = sum(active.filter(item => item.type === 'Expense').map(item => item.monthlyAmount));
  const essential = sum(active.filter(item => item.type === 'Expense' && item.essential).map(item => item.monthlyAmount));
  const income = sum(active.filter(item => item.type === 'Income').map(item => item.monthlyAmount));
  return { expenses: round2(expenses), essential: round2(essential), income: round2(income), gap: round2(Math.max(0, expenses - income)) };
}

// The average of the last 12 complete months Simplifi has (the current month is left out); null when there are none.
export function simplifiMonthlyNeed(
  months: { month: string; income: number; spending: number }[],
  currentMonth: string
): (MonthlyNeed & { monthsUsed: number }) | null {
  const complete = months.filter(m => m.month < currentMonth).slice(-12);
  if (!complete.length) return null;
  const expenses = sum(complete.map(m => m.spending)) / complete.length;
  const income = sum(complete.map(m => m.income)) / complete.length;
  return {
    expenses: round2(expenses),
    essential: round2(expenses),
    income: round2(income),
    gap: round2(Math.max(0, expenses - income)),
    monthsUsed: complete.length
  };
}

// Age in tenths of a year, so the 59½ test is exact enough.
export function ageFromDob(dob: string, today: Date): number {
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(born.getTime())) return 0;
  const years = (today.getTime() - born.getTime()) / (365.2425 * 86400e3);
  return Math.floor(years * 10) / 10;
}

function lotsFor(asset: AssetAccount, taxLots: TaxLot[]): TaxLot[] {
  const ticker = LOT_TICKER_BY_ASSET[asset.id];
  if (!ticker) return [];
  return taxLots.filter(lot => lot.ticker.toUpperCase() === ticker && lot.shares > 0 && lot.totalCurrentValue > 0);
}

function gainShare(asset: AssetAccount): number {
  return asset.currentValue > 0 ? Math.max(0, (asset.currentValue - asset.costBasis) / asset.currentValue) : 0;
}

function sellAccount(asset: AssetAccount, netTarget: number, rate: number): WithdrawalLine {
  const taxPerDollar = gainShare(asset) * rate;
  const gross = Math.min(asset.currentValue, netTarget / (1 - taxPerDollar));
  const tax = gross * taxPerDollar;
  return {
    assetId: asset.id,
    name: asset.name,
    kind: 'taxable',
    gross: round2(gross),
    tax: round2(tax),
    net: round2(gross - tax),
    lots: [],
    reason: `Taxable: about ${pct(gainShare(asset))} of each sale is gain, taxed at the long-term rate.`
  };
}

// Losses first (they cancel gains), then the lots whose sale costs the least tax per dollar: long-term lots with the
// most cost basis come before short-term ones. A loss is never counted on to pay for anything.
function sellLots(asset: AssetAccount, lots: TaxLot[], netTarget: number, config: WithdrawalConfig): WithdrawalLine {
  const rateFor = (lot: TaxLot): number => (lot.term === 'Long Term' ? config.longTermGainsRate : config.ordinaryIncomeRate);
  const taxShare = (lot: TaxLot): number => (lot.unrealizedGainLoss * rateFor(lot)) / lot.totalCurrentValue;
  const ordered = [...lots].sort((a, b) => taxShare(a) - taxShare(b));
  const sales: LotSale[] = [];
  let remaining = netTarget;
  let gross = 0;
  let tax = 0;
  for (const lot of ordered) {
    if (remaining <= 0.005) break;
    const lotTax = lot.unrealizedGainLoss * rateFor(lot);
    const lotNet = lot.totalCurrentValue - Math.max(0, lotTax);
    const part = Math.min(1, remaining / lotNet);
    gross += lot.totalCurrentValue * part;
    tax += lotTax * part;
    remaining -= lotNet * part;
    sales.push({
      lotId: lot.id,
      ticker: lot.ticker,
      acquisitionDate: lot.acquisitionDate,
      term: lot.term,
      shares: Math.round(lot.shares * part * 10000) / 10000,
      proceeds: round2(lot.totalCurrentValue * part),
      gain: round2(lot.unrealizedGainLoss * part)
    });
  }
  const owed = Math.max(0, tax);
  return {
    assetId: asset.id,
    name: asset.name,
    kind: 'taxable',
    gross: round2(gross),
    tax: round2(owed),
    net: round2(gross - owed),
    lots: sales,
    reason: `Taxable: sells ${sales.length} lot${sales.length === 1 ? '' : 's'}, losses first, then the lots that cost the least tax.`
  };
}

export function buildWithdrawalPlan(input: WithdrawalInputs): WithdrawalPlan {
  const { config } = input;
  const netNeeded = round2(Math.max(0, input.monthlyNeed) * Math.max(0, config.monthsToFund));
  const cashFloor = round2(Math.max(0, input.essentialMonthly) * Math.max(0, config.cashFloorMonths));
  const usable = input.assets.filter(a => a.status === 'Active' && a.currentValue > 0 && !config.excludedAssetIds.includes(a.id));
  const ofKind = (kind: AccountKind): AssetAccount[] => usable.filter(a => classifyAccount(a) === kind);
  const lines: WithdrawalLine[] = [];
  let remaining = netNeeded;
  const take = (line: WithdrawalLine): void => {
    if (line.net <= 0.005) return;
    lines.push(line);
    remaining = round2(remaining - line.net);
  };

  // Cash above the emergency floor, lowest-yield account first.
  const cash = ofKind('cash').sort((a, b) => a.annualReturn - b.annualReturn);
  let spare = Math.max(0, sum(cash.map(a => a.currentValue)) - cashFloor);
  for (const asset of cash) {
    if (remaining <= 0 || spare <= 0) break;
    const amount = round2(Math.min(remaining, spare, asset.currentValue));
    spare -= amount;
    take({ assetId: asset.id, name: asset.name, kind: 'cash', gross: amount, tax: 0, net: amount, lots: [], reason: 'Cash above the emergency floor: no tax.' });
  }

  // Taxable investments, the cheapest in tax first.
  for (const asset of ofKind('taxable').sort((a, b) => gainShare(a) - gainShare(b))) {
    if (remaining <= 0) break;
    const lots = lotsFor(asset, input.taxLots);
    take(lots.length ? sellLots(asset, lots, remaining, config) : sellAccount(asset, remaining, config.longTermGainsRate));
  }

  // Roth contributions (the account's cost basis) come out free of tax and penalty.
  for (const asset of ofKind('roth')) {
    if (remaining <= 0) break;
    const amount = round2(Math.min(remaining, asset.currentValue, Math.max(0, asset.costBasis)));
    take({ assetId: asset.id, name: asset.name, kind: 'roth', gross: amount, tax: 0, net: amount, lots: [], reason: 'Roth contributions: no tax or penalty; earnings stay invested.' });
  }

  // Pre-tax accounts last: ordinary income tax, plus the early-withdrawal penalty before 59½.
  const early = input.age < 59.5;
  const cost = config.ordinaryIncomeRate + (early ? config.earlyWithdrawalPenalty : 0);
  if (cost < 0.95) {
    for (const asset of ofKind('pre_tax').sort((a, b) => a.currentValue - b.currentValue)) {
      if (remaining <= 0) break;
      const gross = Math.min(asset.currentValue, remaining / (1 - cost));
      take({
        assetId: asset.id,
        name: asset.name,
        kind: 'pre_tax',
        gross: round2(gross),
        tax: round2(gross * cost),
        net: round2(gross * (1 - cost)),
        lots: [],
        reason: early
          ? `Last resort before 59½: income tax plus the ${pct(config.earlyWithdrawalPenalty)} early-withdrawal penalty.`
          : 'Pre-tax: taxed as ordinary income.'
      });
    }
  }

  const shortfall = round2(Math.max(0, remaining));
  const notes = [`Keeps ${money(cashFloor)} in cash as the emergency floor (${config.cashFloorMonths} months of essential spending).`];
  const hsa = ofKind('hsa');
  if (hsa.length) notes.push(`${hsa.map(a => a.name).join(', ')}: kept for medical bills, which it pays tax-free.`);
  const illiquid = input.assets.filter(a => a.status === 'Active' && classifyAccount(a) === 'illiquid');
  if (illiquid.length) notes.push(`Not counted, as they cannot be sold on demand: ${illiquid.map(a => a.name).join(', ')}.`);
  if (lines.some(l => l.kind === 'taxable' && l.tax > 0)) {
    notes.push('Realized gains raise MAGI, which can lower Covered California premium help: check the Healthcare page before selling.');
  }
  if (early && lines.some(l => l.kind === 'pre_tax')) {
    notes.push('Before 59½, a 72(t) payment plan or a Roth conversion ladder can avoid the penalty: worth asking the CPA.');
  }
  if (shortfall > 0) notes.push(`The usable accounts cannot cover the full amount: ${money(shortfall)} short.`);
  return {
    netNeeded,
    cashFloor,
    lines,
    totalGross: round2(sum(lines.map(l => l.gross))),
    totalTax: round2(sum(lines.map(l => l.tax))),
    totalNet: round2(sum(lines.map(l => l.net))),
    shortfall,
    notes
  };
}
