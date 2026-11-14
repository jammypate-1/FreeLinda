import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AssetAccount, CashFlowItem } from '../types/financial';
import { ageFromDob, buildMonthlySchedule, classifyAccount, DEFAULT_WITHDRAWAL_CONFIG, planMonthlyNeed } from './withdrawalPlan.ts';

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

const near = (actual: number, expected: number): void => assert.ok(Math.abs(actual - expected) < 0.02, `${actual} != ${expected}`);
const today = new Date(2026, 10, 13);
const base = {
  ...DEFAULT_WITHDRAWAL_CONFIG,
  longTermGainsRate: 0.2,
  ordinaryIncomeRate: 0.3,
  earlyWithdrawalPenalty: 0.1,
  socialSecurityAge: 99,
  socialSecurityMonthly: 0
};

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

test('ageFromDob counts tenths of a year', () => {
  assert.equal(ageFromDob('1990-05-15', new Date('2026-08-01T12:00:00')), 36.2);
  assert.equal(ageFromDob('not a date', new Date()), 0);
});

test('buildMonthlySchedule runs month by month from now to the end age, cash above the floor first', () => {
  const schedule = buildMonthlySchedule({
    assets: [
      asset('cash', 'Cash / Bank', 'Individual', 30000, 30000, { annualReturn: 0 }),
      asset('brokerage', 'Taxable Investment', 'Individual Taxable', 50000, 25000, { annualReturn: 0 })
    ],
    config: { ...base, startMonth: '2026-12', endAge: 37 },
    monthlyExpenses: 2000,
    essentialMonthly: 1000,
    inflationRate: 0,
    dob: '1990-10-15',
    today
  });
  assert.equal(schedule.months.length, 12);
  assert.equal(schedule.months[0].month, '2026-11');
  assert.equal(schedule.months[0].withdrawing, false);
  assert.deepEqual(schedule.months[1].draws.map(d => d.assetId), ['cash']);
  assert.equal(schedule.months[1].net, 2000);
  assert.deepEqual(schedule.months[7].draws.map(d => d.assetId), ['brokerage']);
  near(schedule.months[7].gross, 2222.22);
  near(schedule.months[7].tax, 222.22);
  near(schedule.totalNet, 22000);
  near(schedule.totalTax, 1111.11);
  assert.equal(schedule.firstShortfallMonth, null);
  assert.equal(schedule.firstWithdrawal?.month, '2026-12');
  assert.deepEqual(schedule.years.map(y => y.year), [2026, 2027]);
  near(schedule.years[1].tax, 1111.11);
});

test('buildMonthlySchedule nets Social Security off and reaches pre-tax money with the penalty before 59½', () => {
  const run = (dob: string) => buildMonthlySchedule({
    assets: [asset('ira', 'Traditional Financial Freedom', 'Traditional IRA Rollover', 100000, 100000, { annualReturn: 0 })],
    config: { ...base, startMonth: '2026-11', endAge: 99, socialSecurityAge: 0, socialSecurityMonthly: 1000 },
    monthlyExpenses: 3000,
    essentialMonthly: 0,
    inflationRate: 0,
    dob,
    today
  }).months[0];
  const young = run('1990-05-15');
  assert.equal(young.socialSecurity, 1000);
  near(young.gross, 3333.33);
  near(young.tax, 1333.33);
  const older = run('1960-05-15');
  near(older.gross, 2857.14);
});

test('buildMonthlySchedule uses the emergency cash last and reports when money runs short', () => {
  const schedule = buildMonthlySchedule({
    assets: [
      asset('cash', 'Cash / Bank', 'Individual', 5000, 5000, { annualReturn: 0 }),
      asset('hsa', 'HSA', 'HSA', 9000, 9000),
      asset('home', 'Real Estate', 'Individual', 900000, 1000, { liquidity: 'Illiquid' })
    ],
    config: { ...base, startMonth: '2026-11', endAge: 99 },
    monthlyExpenses: 2000,
    essentialMonthly: 1000,
    inflationRate: 0,
    dob: '1990-05-15',
    today
  });
  assert.equal(schedule.months[1].net, 2000);
  assert.equal(schedule.months[2].net, 1000);
  assert.equal(schedule.months[2].shortfall, 1000);
  assert.equal(schedule.firstShortfallMonth, '2027-01');
  assert.ok(schedule.months.every(m => m.draws.every(d => d.assetId === 'cash')));
});

test('buildMonthlySchedule adds contributions until withdrawals start and grows spending with inflation', () => {
  const saving = buildMonthlySchedule({
    assets: [asset('cash', 'Cash / Bank', 'Individual', 1000, 1000, { annualReturn: 0.12, monthlyContribution: 100 })],
    config: { ...base, startMonth: '2030-01', endAge: 99 },
    monthlyExpenses: 1000,
    essentialMonthly: 0,
    inflationRate: 0.12,
    dob: '1990-05-15',
    today
  });
  near(saving.months[0].liquidEnd, 1111);
  const spending = buildMonthlySchedule({
    assets: [asset('cash', 'Cash / Bank', 'Individual', 1000000, 1000000, { annualReturn: 0 })],
    config: { ...base, startMonth: '2026-11', endAge: 99 },
    monthlyExpenses: 1000,
    essentialMonthly: 0,
    inflationRate: 0.12,
    dob: '1990-05-15',
    today
  });
  near(spending.months[12].need, 1120);
});
