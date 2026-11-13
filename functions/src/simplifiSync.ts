import { createHash, timingSafeEqual } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { applyBalances, cleanAccounts, cleanTransactions, summarizeMonths, type SyncAccount } from './simplifiMath.js';

// The FreeLinda Simplifi sync Chrome extension (simplifi-extension/) posts here once a day. Its key was handed to it
// by the Withdrawal Plan page; only the key's SHA-256 is kept, in simplifi/link.

type AssetRow = { id: string; currentValue: number };
type LiabilityRow = { id: string; currentBalance: number };

const pacificToday = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

async function keyMatches(key: string): Promise<boolean> {
  if (key.length < 32) return false;
  const link = await getFirestore().doc('simplifi/link').get();
  const stored = link.get('keyHash');
  if (typeof stored !== 'string' || stored.length !== 64) return false;
  const given = createHash('sha256').update(key).digest('hex');
  return timingSafeEqual(Buffer.from(given), Buffer.from(stored));
}

async function applyToSharedData(accounts: SyncAccount[]): Promise<number> {
  const db = getFirestore();
  const linksRef = db.doc('sharedData/simplifiMap');
  const assetsRef = db.doc('sharedData/assets');
  const liabilitiesRef = db.doc('sharedData/liabilities');
  return db.runTransaction(async tx => {
    const [links, assets, liabilities] = await Promise.all([tx.get(linksRef), tx.get(assetsRef), tx.get(liabilitiesRef)]);
    const result = applyBalances(
      (assets.get('value') ?? []) as AssetRow[],
      (liabilities.get('value') ?? []) as LiabilityRow[],
      accounts,
      (links.get('value') ?? {}) as Record<string, string>,
      pacificToday()
    );
    const stamp = { updatedAt: FieldValue.serverTimestamp(), updatedBy: 'simplifi-sync' };
    if (result.assetsChanged) tx.set(assetsRef, { value: result.assets, ...stamp });
    if (result.liabilitiesChanged) tx.set(liabilitiesRef, { value: result.liabilities, ...stamp });
    return result.applied;
  });
}

export const simplifiSync = onRequest({ region: 'us-central1', timeoutSeconds: 60, memory: '512MiB' }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ detail: 'Use POST.' });
    return;
  }
  try {
    if (!(await keyMatches(String(request.get('X-FreeLinda-Key') ?? '')))) {
      response.status(401).json({ detail: 'Not connected: open Withdrawal Plan in FreeLinda and click Connect.' });
      return;
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    const snapshotRef = getFirestore().doc('simplifi/snapshot');
    if (body.state !== 'ready') {
      await snapshotRef.set({
        state: body.state === 'signed_out' ? 'signed_out' : 'error',
        detail: String(body.detail ?? '').slice(0, 300),
        receivedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      response.json({ ok: true });
      return;
    }
    const accounts = cleanAccounts(body.accounts);
    const months = summarizeMonths(cleanTransactions(body.transactions));
    const applied = await applyToSharedData(accounts);
    await snapshotRef.set({
      state: 'ready',
      detail: '',
      syncedAt: String(body.synced_at ?? '').slice(0, 40),
      receivedAt: FieldValue.serverTimestamp(),
      accounts,
      months,
      applied
    });
    response.json({ ok: true, accounts: accounts.length, months: months.length, applied });
  } catch (error) {
    console.error('Simplifi sync failed', error);
    response.status(500).json({ detail: 'FreeLinda could not save the sync.' });
  }
});
