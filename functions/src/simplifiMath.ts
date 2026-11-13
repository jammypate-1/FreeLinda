// Pure helpers for the Simplifi sync: tidy what the Chrome extension sends, sum income and spending by month, and
// copy Simplifi balances onto the FreeLinda accounts Linda linked them to. No imports, so the web app, the Cloud
// Function and the tests can all use this file.

export interface SyncAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface SyncTransaction {
  date: string;
  account: string;
  category: string;
  transfer: boolean;
  excluded: boolean;
  amount: number;
}

export interface MonthSummary {
  month: string;
  income: number;
  spending: number;
  byCategory: Record<string, number>;
}

export interface AppliedBalances<A, L> {
  assets: A[];
  liabilities: L[];
  assetsChanged: boolean;
  liabilitiesChanged: boolean;
  applied: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const INCOME = /income|paycheck|salary/i;
const NOT_SPENDING = /^(transfers?|credit card payments?|balance adjustment)$/i;

export function cleanAccounts(raw: unknown): SyncAccount[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 200).flatMap(item => {
    const row = (item ?? {}) as Record<string, unknown>;
    const id = String(row.id ?? '').slice(0, 80);
    const name = String(row.name ?? '').slice(0, 120);
    const balance = Number(row.balance);
    if (!id || !name || !Number.isFinite(balance)) return [];
    return [{ id, name, type: String(row.type ?? '').slice(0, 40), balance: round2(balance) }];
  });
}

export function cleanTransactions(raw: unknown): SyncTransaction[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20000).flatMap(item => {
    const row = (item ?? {}) as Record<string, unknown>;
    const date = String(row.date ?? '');
    const amount = Number(row.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) return [];
    return [{
      date,
      account: String(row.account ?? '').slice(0, 120),
      category: String(row.category ?? '').slice(0, 120) || 'Uncategorized',
      transfer: row.transfer === true,
      excluded: row.excluded === true,
      amount
    }];
  });
}

// Income is anything filed under an income category; every other amount is spending (refunds lower it).
// Transfers, card payments and rows Simplifi excludes from its reports are left out.
export function summarizeMonths(transactions: SyncTransaction[], keep = 13): MonthSummary[] {
  const months = new Map<string, MonthSummary>();
  for (const t of transactions) {
    const top = t.category.split(':')[0].trim() || 'Uncategorized';
    if (t.transfer || t.excluded || NOT_SPENDING.test(top)) continue;
    const month = t.date.slice(0, 7);
    const summary = months.get(month) ?? { month, income: 0, spending: 0, byCategory: {} };
    if (INCOME.test(top)) {
      summary.income += t.amount;
    } else {
      summary.spending -= t.amount;
      summary.byCategory[top] = (summary.byCategory[top] ?? 0) - t.amount;
    }
    months.set(month, summary);
  }
  return [...months.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-keep)
    .map(m => ({
      month: m.month,
      income: round2(m.income),
      spending: round2(m.spending),
      byCategory: Object.fromEntries(Object.entries(m.byCategory).map(([name, value]) => [name, round2(value)]))
    }));
}

// Each linked FreeLinda account or debt gets the sum of the Simplifi balances linked to it (a debt as a positive
// balance). links maps a Simplifi account id to a FreeLinda asset or liability id.
export function applyBalances<A extends { id: string; currentValue: number }, L extends { id: string; currentBalance: number }>(
  assets: A[],
  liabilities: L[],
  accounts: SyncAccount[],
  links: Record<string, string>,
  today: string
): AppliedBalances<A, L> {
  const totals = new Map<string, number>();
  for (const account of accounts) {
    const target = links[account.id];
    if (target) totals.set(target, (totals.get(target) ?? 0) + account.balance);
  }
  let applied = 0;
  let assetsChanged = false;
  let liabilitiesChanged = false;
  const nextAssets: A[] = assets.map(row => {
    const total = totals.get(row.id);
    if (total === undefined) return row;
    applied += 1;
    const value = round2(total);
    if (row.currentValue === value) return row;
    assetsChanged = true;
    return { ...row, currentValue: value, lastUpdated: today };
  });
  const nextLiabilities: L[] = liabilities.map(row => {
    const total = totals.get(row.id);
    if (total === undefined) return row;
    applied += 1;
    const value = round2(Math.abs(total));
    if (row.currentBalance === value) return row;
    liabilitiesChanged = true;
    return { ...row, currentBalance: value };
  });
  return { assets: nextAssets, liabilities: nextLiabilities, assetsChanged, liabilitiesChanged, applied };
}
