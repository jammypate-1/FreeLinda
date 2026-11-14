// Withdrawal Plan math: a month-by-month schedule, from now to the end of the plan, of how much Linda withdraws,
// from which accounts, and the tax on it, pulling in the order that costs the least tax. Pure functions over the
// plan's own data; the page and the tests use them.
import type { AssetAccount, CashFlowItem, WithdrawalConfig } from '../types/financial';

export type AccountKind = 'cash' | 'taxable' | 'roth' | 'pre_tax' | 'hsa' | 'illiquid';

// Start, end and Social Security match the Financial Freedom engine's defaults (April 2027, age 90, $3,000 at 67).
export const DEFAULT_WITHDRAWAL_CONFIG: WithdrawalConfig = {
  needSource: 'plan',
  customMonthlyNeed: 0,
  startMonth: '2027-04',
  endAge: 90,
  socialSecurityAge: 67,
  socialSecurityMonthly: 3000,
  cashFloorMonths: 18,
  longTermGainsRate: 0.24,
  ordinaryIncomeRate: 0.35,
  earlyWithdrawalPenalty: 0.125,
  excludedAssetIds: []
};

export interface MonthlyNeed {
  expenses: number;
  essential: number;
  income: number;
  gap: number;
}

export interface MonthDraw {
  assetId: string;
  name: string;
  kind: AccountKind;
  gross: number;
  tax: number;
  net: number;
}

export interface ScheduleMonth {
  month: string;
  age: number;
  withdrawing: boolean;
  need: number;
  socialSecurity: number;
  draws: MonthDraw[];
  gross: number;
  tax: number;
  net: number;
  shortfall: number;
  liquidEnd: number;
}

export interface ScheduleYear {
  year: number;
  age: number;
  gross: number;
  tax: number;
  net: number;
  socialSecurity: number;
  shortfall: number;
  liquidEnd: number;
  accounts: string[];
  months: ScheduleMonth[];
}

export interface WithdrawalSchedule {
  months: ScheduleMonth[];
  years: ScheduleYear[];
  totalGross: number;
  totalTax: number;
  totalNet: number;
  totalShortfall: number;
  firstShortfallMonth: string | null;
  firstWithdrawal: ScheduleMonth | null;
}

export interface ScheduleInputs {
  assets: AssetAccount[];
  config: WithdrawalConfig;
  monthlyExpenses: number;
  essentialMonthly: number;
  inflationRate: number;
  dob: string;
  today: Date;
}

interface Pot {
  asset: AssetAccount;
  kind: AccountKind;
  value: number;
  basis: number;
  monthlyRate: number;
}

interface RawDraw {
  pot: Pot;
  gross: number;
  tax: number;
}

const DRAWABLE: AccountKind[] = ['cash', 'taxable', 'roth', 'pre_tax'];
const CENT = 0.005;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

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

// Age in tenths of a year, so the 59½ test is exact enough.
export function ageFromDob(dob: string, today: Date): number {
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(born.getTime())) return 0;
  const years = (today.getTime() - born.getTime()) / (365.2425 * 86400e3);
  return Math.floor(years * 10) / 10;
}

function gainShare(pot: Pot): number {
  return pot.value > 0 ? Math.max(0, (pot.value - pot.basis) / pot.value) : 0;
}

// One month's withdrawals, cheapest in tax first: cash above the emergency floor, taxable investments with the least
// gain, Roth contributions, pre-tax accounts (penalty before 59½), and the emergency cash itself only as a last
// resort. Changes the pots; returns what is still missing.
function drawMonth(pots: Pot[], need: number, floor: number, age: number, config: WithdrawalConfig, draws: RawDraw[]): number {
  let remaining = need;
  const add = (pot: Pot, gross: number, tax: number): void => {
    if (gross <= CENT) return;
    pot.value -= gross;
    remaining -= gross - tax;
    const seen = draws.find(draw => draw.pot === pot);
    if (seen) {
      seen.gross += gross;
      seen.tax += tax;
    } else {
      draws.push({ pot, gross, tax });
    }
  };
  const ofKind = (kind: AccountKind): Pot[] => pots.filter(pot => pot.kind === kind && pot.value > CENT);

  const cash = ofKind('cash').sort((a, b) => a.monthlyRate - b.monthlyRate);
  let spare = Math.max(0, sum(cash.map(pot => pot.value)) - floor);
  for (const pot of cash) {
    if (remaining <= CENT || spare <= CENT) break;
    const amount = Math.min(remaining, spare, pot.value);
    spare -= amount;
    add(pot, amount, 0);
  }

  for (const pot of ofKind('taxable').sort((a, b) => gainShare(a) - gainShare(b))) {
    if (remaining <= CENT) break;
    const taxPerDollar = gainShare(pot) * config.longTermGainsRate;
    const gross = Math.min(pot.value, remaining / (1 - taxPerDollar));
    pot.basis *= 1 - gross / pot.value;
    add(pot, gross, gross * taxPerDollar);
  }

  for (const pot of ofKind('roth')) {
    if (remaining <= CENT) break;
    const amount = Math.min(remaining, pot.value, Math.max(0, pot.basis));
    pot.basis -= amount;
    add(pot, amount, 0);
  }

  const cost = config.ordinaryIncomeRate + (age < 59.5 ? config.earlyWithdrawalPenalty : 0);
  if (cost < 0.95) {
    for (const pot of ofKind('pre_tax').sort((a, b) => a.value - b.value)) {
      if (remaining <= CENT) break;
      const gross = Math.min(pot.value, remaining / (1 - cost));
      add(pot, gross, gross * cost);
    }
  }

  for (const pot of ofKind('cash').sort((a, b) => a.monthlyRate - b.monthlyRate)) {
    if (remaining <= CENT) break;
    add(pot, Math.min(remaining, pot.value), 0);
  }
  return remaining;
}

function groupByYear(months: ScheduleMonth[]): ScheduleYear[] {
  const years: ScheduleYear[] = [];
  for (const month of months) {
    const year = Number(month.month.slice(0, 4));
    let row = years[years.length - 1];
    if (!row || row.year !== year) {
      row = { year, age: month.age, gross: 0, tax: 0, net: 0, socialSecurity: 0, shortfall: 0, liquidEnd: 0, accounts: [], months: [] };
      years.push(row);
    }
    row.months.push(month);
    row.gross += month.gross;
    row.tax += month.tax;
    row.net += month.net;
    row.socialSecurity += month.socialSecurity;
    row.shortfall += month.shortfall;
    row.liquidEnd = month.liquidEnd;
    for (const draw of month.draws) {
      if (!row.accounts.includes(draw.name)) row.accounts.push(draw.name);
    }
  }
  return years.map(row => ({
    ...row,
    gross: round2(row.gross),
    tax: round2(row.tax),
    net: round2(row.net),
    socialSecurity: round2(row.socialSecurity),
    shortfall: round2(row.shortfall)
  }));
}

// Month 0 is the current month. Before startMonth each account gets its monthly contribution from Assets; from
// startMonth on, spending (in today's dollars, grown with inflation) less Social Security is withdrawn. Every account
// grows at its own return from Assets. The schedule runs until the month Linda reaches endAge.
export function buildMonthlySchedule(input: ScheduleInputs): WithdrawalSchedule {
  const { config } = input;
  const pots: Pot[] = input.assets
    .filter(asset => asset.status === 'Active' && !config.excludedAssetIds.includes(asset.id))
    .map(asset => ({
      asset,
      kind: classifyAccount(asset),
      value: Math.max(0, asset.currentValue),
      basis: Math.max(0, asset.costBasis),
      monthlyRate: (asset.annualReturn || 0) / 12
    }))
    .filter(pot => DRAWABLE.includes(pot.kind));
  const months: ScheduleMonth[] = [];
  const first = new Date(input.today.getFullYear(), input.today.getMonth(), 1);
  for (let t = 0; t < 1200; t++) {
    const date = new Date(first.getFullYear(), first.getMonth() + t, 1);
    const age = ageFromDob(input.dob, date);
    if (age >= config.endAge) break;
    const month = monthKey(date);
    const withdrawing = month >= config.startMonth;
    const inflation = Math.pow(1 + input.inflationRate, t / 12);
    const raw: RawDraw[] = [];
    let need = 0;
    let socialSecurity = 0;
    let shortfall = 0;
    if (withdrawing) {
      socialSecurity = age >= config.socialSecurityAge ? config.socialSecurityMonthly * inflation : 0;
      need = Math.max(0, input.monthlyExpenses * inflation - socialSecurity);
      const floor = input.essentialMonthly * inflation * config.cashFloorMonths;
      shortfall = Math.max(0, drawMonth(pots, need, floor, age, config, raw));
    } else {
      for (const pot of pots) {
        pot.value += pot.asset.monthlyContribution || 0;
        pot.basis += pot.asset.monthlyContribution || 0;
      }
    }
    for (const pot of pots) pot.value *= 1 + pot.monthlyRate;
    const draws: MonthDraw[] = raw.map(draw => ({
      assetId: draw.pot.asset.id,
      name: draw.pot.asset.name,
      kind: draw.pot.kind,
      gross: round2(draw.gross),
      tax: round2(draw.tax),
      net: round2(draw.gross - draw.tax)
    }));
    months.push({
      month,
      age,
      withdrawing,
      need: round2(need),
      socialSecurity: round2(socialSecurity),
      draws,
      gross: round2(sum(raw.map(draw => draw.gross))),
      tax: round2(sum(raw.map(draw => draw.tax))),
      net: round2(sum(raw.map(draw => draw.gross - draw.tax))),
      shortfall: round2(shortfall),
      liquidEnd: round2(sum(pots.map(pot => pot.value)))
    });
  }
  const short = months.find(month => month.shortfall > 0.5);
  return {
    months,
    years: groupByYear(months),
    totalGross: round2(sum(months.map(month => month.gross))),
    totalTax: round2(sum(months.map(month => month.tax))),
    totalNet: round2(sum(months.map(month => month.net))),
    totalShortfall: round2(sum(months.map(month => month.shortfall))),
    firstShortfallMonth: short ? short.month : null,
    firstWithdrawal: months.find(month => month.withdrawing && month.gross > 0) ?? null
  };
}
