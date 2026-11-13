import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBalances, cleanAccounts, cleanTransactions, summarizeMonths } from '../src/simplifiMath.ts';

test('cleanAccounts keeps well-formed rows only', () => {
  const rows = cleanAccounts([
    { id: 'a1', name: 'Checking 9310', type: 'BANK', balance: '51060.456' },
    { id: '', name: 'x', balance: 1 },
    { id: 'b', name: 'B', balance: 'nope' },
    null
  ]);
  assert.deepEqual(rows, [{ id: 'a1', name: 'Checking 9310', type: 'BANK', balance: 51060.46 }]);
  assert.deepEqual(cleanAccounts('nope'), []);
});

test('summarizeMonths splits income from spending and skips transfers and excluded rows', () => {
  const tx = cleanTransactions([
    { date: '2026-09-03', category: 'Income:Paychecks', amount: 9000 },
    { date: '2026-09-05', category: 'Food & Dining:Groceries', amount: -400 },
    { date: '2026-09-09', category: 'Shopping', amount: -100 },
    { date: '2026-09-12', category: 'Shopping', amount: 30 },
    { date: '2026-09-14', category: 'Transfer', amount: -300 },
    { date: '2026-09-15', category: 'Savings', amount: -2000, transfer: true },
    { date: '2026-09-20', category: 'Travel', amount: -500, excluded: true },
    { date: '2026-10-01', category: 'Bills & Utilities:Phone', amount: -80 },
    { date: 'bad', category: 'Shopping', amount: -1 }
  ]);
  assert.deepEqual(summarizeMonths(tx), [
    { month: '2026-09', income: 9000, spending: 470, byCategory: { 'Food & Dining': 400, Shopping: 70 } },
    { month: '2026-10', income: 0, spending: 80, byCategory: { 'Bills & Utilities': 80 } }
  ]);
});

test('summarizeMonths keeps only the newest months', () => {
  const tx = cleanTransactions(['2026-01-02', '2026-02-02', '2026-03-02'].map(date => ({ date, category: 'Shopping', amount: -1 })));
  assert.deepEqual(summarizeMonths(tx, 2).map(m => m.month), ['2026-02', '2026-03']);
});

test('applyBalances sums linked Simplifi accounts onto assets and debts', () => {
  const assets = [
    { id: 'A-05', name: 'Checking', currentValue: 100, lastUpdated: '2026-01-01' },
    { id: 'A-06', name: 'Savings', currentValue: 5, lastUpdated: '2026-01-01' }
  ];
  const liabilities = [{ id: 'L-01', currentBalance: 500000 }];
  const accounts = [
    { id: 's1', name: 'RCU Checking', type: 'BANK', balance: 200 },
    { id: 's2', name: 'RCU Checking 2', type: 'BANK', balance: 50.5 },
    { id: 's3', name: 'Mortgage', type: 'LOAN', balance: -480000 },
    { id: 's4', name: 'Unlinked', type: 'BANK', balance: 9 }
  ];
  const result = applyBalances(assets, liabilities, accounts, { s1: 'A-05', s2: 'A-05', s3: 'L-01' }, '2026-11-13');
  assert.equal(result.applied, 2);
  assert.equal(result.assetsChanged, true);
  assert.equal(result.liabilitiesChanged, true);
  assert.deepEqual(result.assets[0], { id: 'A-05', name: 'Checking', currentValue: 250.5, lastUpdated: '2026-11-13' });
  assert.equal(result.assets[1], assets[1]);
  assert.deepEqual(result.liabilities[0], { id: 'L-01', currentBalance: 480000 });
});

test('applyBalances reports no change when balances already match', () => {
  const result = applyBalances([{ id: 'A-05', currentValue: 200 }], [], [{ id: 's1', name: 'C', type: 'BANK', balance: 200 }], { s1: 'A-05' }, '2026-11-13');
  assert.equal(result.assetsChanged, false);
  assert.equal(result.applied, 1);
});
