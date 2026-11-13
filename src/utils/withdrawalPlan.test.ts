import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AssetAccount, CashFlowItem, TaxLot } from '../types/financial';
import { ageFromDob, buildWithdrawalPlan, classifyAccount, DEFAULT_WITHDRAWAL_CONFIG, planMonthlyNeed, simplifiMonthlyNeed } from './withdrawalPlan.ts';

const asset = (id: string, type: string, taxRegistration: string, currentValue: number, costBasis: number, extra: Partial<AssetAccount> = {}): AssetAccount => ({
  id,
  name: id,
  type,
  institution: '',
  accountLast4: '',
  taxRegistration,
  liquidity: 'Immediate',
  allocationCategory: type === 'Cash / Bank' ? 'Cash' : 'Equities',
  currentValue,
  costBasis,
  monthlyContribution: 0,
  annualReturn: 0.01,
  status: 'Active',
  notes: '',
  lastUpdated: '',
  ...extra
});

const flow = (type: CashFlowItem['type'], monthlyAmount: number, essential = false, status: CashFlowItem['status'] = 'Active'): CashFlowItem => ({
  id: `${type}-${monthlyAmount}`,
  type,
  category: '',
  owner: 'Linda',
  frequency: 'Monthly',
  amountPerFrequency: monthlyAmount,
  monthlyAmount,
  annualAmount: monthlyAmount * 12,
  essential,
  taxDeductible: false,
  notes: '',
  status
});

const lot = (id: string, term: TaxLot['term'], shares: number, basis: number, price: number): TaxLot => ({
  id,
  ticker: 'GOOG',
  name: 'Google',
  assetName: 'Google Portfolio',
  acquisitionDate: '2024-01-01',
  term,
  shares,
  costBasisPerShare: basis,
  currentPrice: price,
  totalCostBasis: shares * basis,
  totalCurrentValue: shares * price,
  unrealizedGainLoss: shares * (price - basis),
  unrealizedGainLossPct: 0
});

const near = (actual: number, expected: number): void => assert.ok(Math.abs(actual - expected) < 0.02, `${actual} != ${expected}`);
const config = { ...DEFAULT_WITHDRAWAL_CONFIG, longTermGainsRate: 0.2, ordinaryIncomeRate: 0.3, earlyWithdrawalPenalty: 0.1 };

test('classifyAccount sorts accounts by how they are taxed', () => {
  assert.equal(classifyAccount(asset('c', 'Cash / Bank', 'Individual', 1, 1)), 'cash');
  assert.equal(classifyAccount(asset('t', 'Taxable Investment', 'Individual Taxable', 1, 1)), 'taxable');
  assert.equal(classifyAccount(asset('i', 'Traditional Financial Freedom', 'Traditional IRA Rollover', 1, 1)), 'pre_tax');
  assert.equal(classifyAccount(asset('k', 'Traditional Financial Freedom', '401(k) Pre-Tax', 1, 1)), 'pre_tax');
  assert.equal(classifyAccount(asset('r', 'Roth', 'Roth IRA', 1, 1)), 'roth');
  assert.equal(classifyAccount(asset('h', 'HSA', 'HSA', 1, 1, { allocationCategory: 'Cash' })), 'hsa');
  assert.equal(classifyAccount(asset('s', 'Taxable Investment', 'Individual Taxable', 1, 1, { liquidity: 'Illiquid' })), 'illiquid');
});

test('planMonthlyNeed is active expenses less active income', () => {
  const need = planMonthlyNeed([flow('Expense', 5000, true), flow('Expense', 3000), flow('Income', 3000), flow('Expense', 900, true, 'Inactive')]);
  assert.deepEqual(need, { expenses: 8000, essential: 5000, income: 3000, gap: 5000 });
  assert.equal(planMonthlyNeed([flow('Income', 9000), flow('Expense', 4000)]).gap, 0);
});

test('simplifiMonthlyNeed averages complete months only', () => {
  const months = [
    { month: '2026-09', income: 1000, spending: 4000 },
    { month: '2026-10', income: 3000, spending: 6000 },
    { month: '2026-11', income: 0, spending: 99999 }
  ];
  assert.deepEqual(simplifiMonthlyNeed(months, '2026-11'), { expenses: 5000, essential: 5000, income: 2000, gap: 3000, monthsUsed: 2 });
  assert.equal(simplifiMonthlyNeed([], '2026-11'), null);
});

test('ageFromDob counts tenths of a year', () => {
  assert.equal(ageFromDob('1990-05-15', new Date('2026-08-01T12:00:00')), 36.2);
  assert.equal(ageFromDob('not a date', new Date()), 0);
});

test('buildWithdrawalPlan uses cash above the floor, then taxable at the least tax', () => {
  const plan = buildWithdrawalPlan({
    assets: [
      asset('cash-low', 'Cash / Bank', 'Individual', 20000, 20000, { annualReturn: 0.001 }),
      asset('cash-high', 'Cash / Bank', 'Individual', 10000, 10000, { annualReturn: 0.045 }),
      asset('big-gain', 'Taxable Investment', 'Individual Taxable', 50000, 10000),
      asset('small-gain', 'Taxable Investment', 'Individual Taxable', 50000, 25000)
    ],
    taxLots: [],
    config,
    monthlyNeed: 2000,
    essentialMonthly: 1000,
    age: 36
  });
  assert.equal(plan.netNeeded, 24000);
  assert.equal(plan.cashFloor, 18000);
  assert.deepEqual(plan.lines.map(l => l.assetId), ['cash-low', 'small-gain']);
  assert.equal(plan.lines[0].net, 12000);
  near(plan.lines[1].gross, 13333.33);
  near(plan.lines[1].tax, 1333.33);
  near(plan.totalNet, 24000);
  assert.equal(plan.shortfall, 0);
});

test('buildWithdrawalPlan sells loss lots first, then long-term lots with the most basis', () => {
  const lots = [
    lot('short', 'Short Term', 10, 100, 300),
    lot('long-low-basis', 'Long Term', 10, 50, 300),
    lot('long-high-basis', 'Long Term', 10, 250, 300),
    lot('loss', 'Short Term', 10, 400, 300)
  ];
  const plan = buildWithdrawalPlan({
    assets: [asset('A-02', 'Taxable Investment', 'Individual Taxable', 12000, 8000)],
    taxLots: lots,
    config,
    monthlyNeed: 500,
    essentialMonthly: 0,
    age: 36
  });
  assert.deepEqual(plan.lines[0].lots.map(s => s.lotId), ['loss', 'long-high-basis', 'long-low-basis']);
  assert.equal(plan.lines[0].lots[2].shares, 0.4);
  near(plan.lines[0].gross, 6120);
  assert.equal(plan.lines[0].tax, 0);
  assert.equal(plan.shortfall, 0);
});

test('buildWithdrawalPlan reaches pre-tax accounts last, with the penalty before 59½', () => {
  const assets = [asset('ira', 'Traditional Financial Freedom', 'Traditional IRA Rollover', 100000, 100000)];
  const young = buildWithdrawalPlan({ assets, taxLots: [], config: { ...config, monthsToFund: 1 }, monthlyNeed: 6000, essentialMonthly: 0, age: 36 });
  near(young.lines[0].gross, 10000);
  near(young.lines[0].tax, 4000);
  const older = buildWithdrawalPlan({ assets, taxLots: [], config: { ...config, monthsToFund: 1 }, monthlyNeed: 7000, essentialMonthly: 0, age: 60 });
  near(older.lines[0].gross, 10000);
});

test('buildWithdrawalPlan skips excluded, HSA and illiquid accounts and reports the shortfall', () => {
  const plan = buildWithdrawalPlan({
    assets: [
      asset('cash', 'Cash / Bank', 'Individual', 5000, 5000),
      asset('hsa', 'HSA', 'HSA', 9000, 9000),
      asset('spcx', 'Taxable Investment', 'Individual Taxable', 900000, 1000, { liquidity: 'Illiquid' }),
      asset('skip', 'Taxable Investment', 'Individual Taxable', 50000, 50000)
    ],
    taxLots: [],
    config: { ...config, excludedAssetIds: ['skip'], monthsToFund: 1 },
    monthlyNeed: 8000,
    essentialMonthly: 0,
    age: 36
  });
  assert.deepEqual(plan.lines.map(l => l.assetId), ['cash']);
  assert.equal(plan.shortfall, 3000);
  assert.ok(plan.notes.some(n => n.includes('spcx')));
  assert.ok(plan.notes.some(n => n.includes('hsa')));
});
