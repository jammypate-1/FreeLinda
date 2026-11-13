// FreeLinda Simplifi sync: once a day (after 5 in the morning) and when its button is clicked, open Simplifi in a
// background tab of this Chrome, let it refresh itself with Linda's own sign-in, read the account balances and the
// last 400 days of transactions it keeps in the page's storage, send them to FreeLinda with the key from
// Withdrawal Plan > Connect, and close the tab. It never reads or sends the sign-in, and never changes Simplifi.
'use strict';
const FREELINDA = 'https://freelinda.web.app';
const SIMPLIFI = 'https://simplifi.quicken.com/transactions';
const HOUR = 3600e3;
let running = false;

function schedule() { chrome.alarms.create('sync', { periodInMinutes: 60, delayInMinutes: 1 }); }
chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'sync') maybeSync(); });
chrome.action.onClicked.addListener(() => sync());
chrome.runtime.onMessage.addListener(message => { if (message && message.sync) sync(); });

async function maybeSync() {
  const { lastOk = 0, lastTry = 0 } = await chrome.storage.local.get(['lastOk', 'lastTry']);
  const now = Date.now();
  if (now - lastOk < 20 * HOUR || now - lastTry < 3 * HOUR || new Date().getHours() < 5) return;
  await sync();
}

async function post(key, body) {
  const r = await fetch(FREELINDA + '/api/simplifi-sync', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FreeLinda-Key': key }, body: JSON.stringify(body) });
  if (!r.ok) {
    const answer = await r.json().catch(() => ({}));
    throw new Error('FreeLinda said ' + r.status + (answer.detail ? ': ' + answer.detail : ''));
  }
}

async function sync() {
  if (running) return;
  running = true;
  const { key } = await chrome.storage.local.get('key');
  await chrome.storage.local.set({ lastTry: Date.now() });
  let tab = null;
  try {
    if (!key) throw new Error('Not connected yet: open Withdrawal Plan in FreeLinda and click Connect.');
    tab = await chrome.tabs.create({ url: SIMPLIFI, active: false });
    const found = await waitForData(tab.id, Date.now());
    if (found.state === 'signed_out') {
      await post(key, { state: 'signed_out', detail: 'Simplifi is signed out in Chrome.' });
      await chrome.storage.local.set({ lastError: 'Simplifi is signed out in Chrome.' });
    } else {
      await post(key, found.data);
      await chrome.storage.local.set({ lastOk: Date.now(), lastError: '' });
    }
  } catch (err) {
    const detail = String((err && err.message) || err).slice(0, 300);
    await chrome.storage.local.set({ lastError: detail });
    if (key) await post(key, { state: 'error', detail }).catch(() => {});
  } finally {
    if (tab) await chrome.tabs.remove(tab.id).catch(() => {});
    running = false;
  }
}

async function waitForData(tabId, opened) {
  for (let i = 0; i < 80; i++) {                      // up to 4 minutes
    await new Promise(done => setTimeout(done, 3000));
    let answer = null;
    try {
      const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: readSimplifi, args: [opened] });
      answer = result && result.result;
    } catch (_) {
      continue;                                        // still loading
    }
    if (answer && (answer.state === 'ready' || answer.state === 'signed_out')) return answer;
  }
  throw new Error('Simplifi did not finish loading in 4 minutes.');
}

// Runs inside the Simplifi tab (its own storage, nothing else).
async function readSimplifi(opened) {
  const waited = Date.now() - opened;
  if (!location.pathname.startsWith('/transactions')) return { state: waited > 30000 ? 'signed_out' : 'loading' };
  const db = await new Promise((ok, no) => { const r = indexedDB.open('localforage'); r.onsuccess = () => ok(r.result); r.onerror = no; });
  const store = () => db.transaction('keyvaluepairs').objectStore('keyvaluepairs');
  const keys = await new Promise(ok => { const q = store().getAllKeys(); q.onsuccess = () => ok(q.result || []); });
  const name = keys.find(k => typeof k === 'string' && k.endsWith(':transactionStore'));
  if (!name) return { state: 'loading' };
  const prefix = name.slice(0, -'transactionStore'.length);
  const load = part => new Promise(ok => {
    const q = store().get(prefix + part);
    q.onsuccess = () => { try { ok(JSON.parse(q.result).data || {}); } catch (_) { ok({}); } };
    q.onerror = () => ok({});
  });
  const tx = await load('transactionStore');
  const synced = Date.parse(tx.lastSyncDate || '') || 0;
  if (tx.isLoading || tx.loadPending || (synced < opened - 60000 && waited < 90000)) return { state: 'loading' };
  const accountsData = await load('accountsStore'), categoryData = await load('categoryStore');
  const accounts = Object.values(accountsData.resourcesById || {});
  const accountName = Object.fromEntries(accounts.map(a => [a.id, a.name]));
  const accountType = Object.fromEntries(accounts.map(a => [a.id, a.type]));
  const cats = categoryData.resourcesById || {};
  const categoryName = id => {                         // from the top level down: Food & Dining:Groceries
    const names = [];
    for (let c = cats[id], hops = 0; c && hops < 6; hops++) {
      names.unshift(c.name);
      c = c.parentId && c.parentId !== '0' ? cats[c.parentId] : null;
    }
    return names.length ? names.join(':') : 'Uncategorized';
  };
  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const since = new Date(Date.now() - 400 * 86400e3).toISOString().slice(0, 10);
  const transactions = [];
  for (const t of Object.values(tx.resourcesById || {})) {
    if (!t || t.type !== 'CASH_FLOW' || t.isDeleted || t.state === 'PENDING' || !t.postedOn) continue;
    const date = String(t.postedOn).slice(0, 10);
    if (date < since) continue;
    if (['INVESTMENT', 'LOAN'].includes(accountType[t.accountId])) continue;   // as Simplifi's own reports
    const coa = t.coa || {};
    transactions.push({ date, account: accountName[t.accountId] || '',
      category: coa.type === 'CATEGORY' ? categoryName(coa.id) : 'Uncategorized',
      transfer: coa.type === 'ACCOUNT' || coa.type === 'BALANCE_ADJUSTMENT',
      excluded: t.isExcludedFromReports === true || t.isExcludedFromF2S === true, amount: num(t.amount) });
  }
  const open = accounts.filter(a => a && a.id && a.isClosed !== true && !a.isDeleted && !a.isIgnored);
  const balances = open.map(a => ({ id: String(a.id), name: a.name || '', type: a.type || '',
    balance: [a.normalizedBalance, a.currentBalanceAsOf, a.onlineBalance, a.balanceAsOf].map(num).find(n => n !== 0) || 0 }));
  return { state: 'ready', data: { state: 'ready', synced_at: tx.lastSyncDate || '', transactions, accounts: balances } };
}
