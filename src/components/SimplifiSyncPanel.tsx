import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Link2, RefreshCw, Wand2 } from 'lucide-react';
import type { AssetAccount, Liability } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { applyBalances } from '../../functions/src/simplifiMath.ts';
import { connectExtension, requestSync, watchExtension, type ExtensionStatus, type SimplifiSnapshot } from '../services/simplifi';

interface SimplifiSyncPanelProps {
  snapshot: SimplifiSnapshot | null;
  assets: AssetAccount[];
  liabilities: Liability[];
  links: Record<string, string>;
  onSaveLinks: (links: Record<string, string>) => void;
  onSaveAssets: (assets: AssetAccount[]) => void;
  onSaveLiabilities: (liabilities: Liability[]) => void;
}

const when = (ms: number): string => (ms > 0 ? new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'never');

const STATE_TEXT: Record<SimplifiSnapshot['state'], string> = {
  ready: 'Synced',
  signed_out: 'Simplifi is signed out in Chrome: sign in there, then press Sync now',
  error: 'The last sync failed'
};

const BUTTON = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50';

// Links Simplifi accounts whose name carries a FreeLinda account's last four digits; existing links stay.
function matchByLast4(snapshot: SimplifiSnapshot, assets: AssetAccount[], links: Record<string, string>): Record<string, string> {
  const next = { ...links };
  for (const account of snapshot.accounts) {
    if (next[account.id]) continue;
    const match = assets.find(asset => /^\w{4,}$/.test(asset.accountLast4) && account.name.includes(asset.accountLast4));
    if (match) next[account.id] = match.id;
  }
  return next;
}

export const SimplifiSyncPanel: React.FC<SimplifiSyncPanelProps> = ({ snapshot, assets, liabilities, links, onSaveLinks, onSaveAssets, onSaveLiabilities }) => {
  const [extension, setExtension] = useState<ExtensionStatus | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => watchExtension(setExtension), []);

  const connect = async (): Promise<void> => {
    setBusy(true);
    try {
      await connectExtension();
      setMessage('Connected. The extension syncs now in a background Chrome tab, then once a day.');
    } catch (error) {
      setMessage(`Could not connect: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const syncNow = (): void => {
    requestSync();
    setMessage('Syncing in a background Chrome tab; this page updates by itself in a minute or two.');
  };

  const applyNow = (): void => {
    if (!snapshot) return;
    const result = applyBalances(assets, liabilities, snapshot.accounts, links, new Date().toLocaleDateString('en-CA'));
    if (result.assetsChanged) onSaveAssets(result.assets);
    if (result.liabilitiesChanged) onSaveLiabilities(result.liabilities);
    const changed = result.assetsChanged || result.liabilitiesChanged;
    setMessage(changed ? `Updated from ${result.applied} linked account${result.applied === 1 ? '' : 's'}.` : 'Linked balances already match Simplifi.');
  };

  const setLink = (accountId: string, target: string): void => {
    const next = { ...links };
    if (target) next[accountId] = target;
    else delete next[accountId];
    onSaveLinks(next);
  };

  let extensionText = 'Not installed in this browser';
  if (extension) extensionText = `Version ${extension.version}, ${extension.connected ? 'connected' : 'not connected yet'}`;

  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Simplifi sync</h2>
          <p className="mt-1 text-xs text-slate-400">
            The FreeLinda Simplifi sync Chrome extension reads Simplifi in Linda&apos;s own Chrome once a day and keeps balances and monthly spending here up to date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void connect()} disabled={busy || !extension} className={`${BUTTON} bg-sky-600 text-white hover:bg-sky-500`}>
            <Link2 className="h-4 w-4" />
            {extension?.connected ? 'Reconnect' : 'Connect'}
          </button>
          <button type="button" onClick={syncNow} disabled={!extension?.connected} className={`${BUTTON} bg-slate-800 text-slate-200 hover:bg-slate-700`}>
            <RefreshCw className="h-4 w-4" />
            Sync now
          </button>
        </div>
      </div>

      <div className="grid gap-3 text-xs md:grid-cols-3">
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-slate-500">Extension</div>
          <div className="mt-1 font-semibold text-slate-200">{extensionText}</div>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-slate-500">Last sync received</div>
          <div className="mt-1 font-semibold text-slate-200">{when(snapshot?.receivedAtMs ?? 0)}</div>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-slate-500">Status</div>
          <div className={`mt-1 font-semibold ${snapshot?.state === 'ready' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {snapshot ? STATE_TEXT[snapshot.state] : 'No sync yet'}
            {snapshot?.detail ? `: ${snapshot.detail}` : ''}
          </div>
        </div>
      </div>

      {extension ? null : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-slate-300">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            Install the extension in the Chrome where Linda uses Simplifi
          </div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <a className="text-sky-400 underline" href="/freelinda-simplifi-sync.zip" download>
                <Download className="mr-1 inline h-3 w-3" />
                Download the extension
              </a>{' '}
              and unzip it.
            </li>
            <li>Open chrome://extensions, turn on Developer mode, choose Load unpacked and pick the unzipped folder.</li>
            <li>Sign in to Simplifi (simplifi.quicken.com) in the same Chrome, reload this page and press Connect.</li>
          </ol>
        </div>
      )}

      {extension?.lastError ? <p className="text-xs text-rose-300">Extension: {extension.lastError}</p> : null}
      {message ? <p className="text-xs text-sky-300">{message}</p> : null}

      {snapshot && snapshot.accounts.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-200">Simplifi accounts linked to FreeLinda</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => onSaveLinks(matchByLast4(snapshot, assets, links))} className={`${BUTTON} bg-slate-800 text-slate-200 hover:bg-slate-700`}>
                <Wand2 className="h-4 w-4" />
                Match by last 4
              </button>
              <button type="button" onClick={applyNow} className={`${BUTTON} bg-emerald-600 text-white hover:bg-emerald-500`}>
                <CheckCircle2 className="h-4 w-4" />
                Update balances now
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Linked balances are copied onto Assets and Liabilities at every sync. Several Simplifi accounts linked to one FreeLinda account are added up.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Simplifi account</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 text-right font-medium">Balance</th>
                  <th className="py-2 font-medium">FreeLinda account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {snapshot.accounts.map(account => (
                  <tr key={account.id}>
                    <td className="py-2 pr-3 text-slate-200">{account.name}</td>
                    <td className="py-2 pr-3 text-slate-400">{account.type}</td>
                    <td className="py-2 pr-3 text-right font-mono text-slate-200">{formatCurrency(account.balance)}</td>
                    <td className="py-2">
                      <select
                        aria-label={`FreeLinda account for ${account.name}`}
                        value={links[account.id] ?? ''}
                        onChange={event => setLink(account.id, event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                      >
                        <option value="">Not linked</option>
                        <optgroup label="Assets & accounts">
                          {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                        </optgroup>
                        <optgroup label="Liabilities & debt">
                          {liabilities.map(item => <option key={item.id} value={item.id}>{item.creditor} ({item.type})</option>)}
                        </optgroup>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {snapshot && snapshot.months.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Monthly income and spending in Simplifi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 text-right font-medium">Income</th>
                  <th className="py-2 pr-3 text-right font-medium">Spending</th>
                  <th className="py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[...snapshot.months].reverse().map(month => (
                  <tr key={month.month}>
                    <td className="py-2 pr-3 text-slate-300">{month.month}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-300">{formatCurrency(month.income)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-rose-300">{formatCurrency(month.spending)}</td>
                    <td className="py-2 text-right font-mono text-slate-200">{formatCurrency(month.income - month.spending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
};
