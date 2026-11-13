// The Simplifi sync, seen from the web app: the snapshot the Cloud Function keeps in simplifi/snapshot, and the
// FreeLinda Simplifi sync Chrome extension, which this page talks to with window messages (its connect.js).
import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, firestore } from '../firebase';
import type { MonthSummary, SyncAccount } from '../../functions/src/simplifiMath.ts';

export interface SimplifiSnapshot {
  state: 'ready' | 'signed_out' | 'error';
  detail: string;
  syncedAt: string;
  receivedAtMs: number;
  accounts: SyncAccount[];
  months: MonthSummary[];
  applied: number;
}

export interface ExtensionStatus {
  version: string;
  connected: boolean;
  lastOk: number;
  lastError: string;
}

const EXTENSION = 'freelinda-simplifi-extension';
const STATES = new Set(['ready', 'signed_out', 'error']);

const hex = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export function subscribeSimplifi(onData: (snapshot: SimplifiSnapshot | null) => void): Unsubscribe {
  return onSnapshot(doc(firestore, 'simplifi', 'snapshot'), item => {
    if (!item.exists()) {
      onData(null);
      return;
    }
    const data = item.data();
    onData({
      state: STATES.has(data.state) ? data.state : 'error',
      detail: String(data.detail ?? ''),
      syncedAt: String(data.syncedAt ?? ''),
      receivedAtMs: typeof data.receivedAt?.toMillis === 'function' ? data.receivedAt.toMillis() : 0,
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
      months: Array.isArray(data.months) ? data.months : [],
      applied: Number(data.applied ?? 0)
    });
  }, () => onData(null));
}

// Calls onStatus whenever the extension says it is here; asks again every 15 seconds so a sync's result shows up.
export function watchExtension(onStatus: (status: ExtensionStatus) => void): () => void {
  const listener = (event: MessageEvent): void => {
    if (event.source !== window || event.origin !== location.origin || !event.data || event.data.from !== EXTENSION) return;
    if (event.data.type !== 'here') return;
    onStatus({
      version: String(event.data.version ?? ''),
      connected: event.data.connected === true,
      lastOk: Number(event.data.lastOk ?? 0),
      lastError: String(event.data.lastError ?? '')
    });
  };
  const hello = (): void => window.postMessage({ to: EXTENSION, type: 'hello' }, location.origin);
  window.addEventListener('message', listener);
  hello();
  const timer = globalThis.setInterval(hello, 15000);
  return () => {
    globalThis.clearInterval(timer);
    window.removeEventListener('message', listener);
  };
}

// A fresh random key for the extension; Firestore keeps only its SHA-256. The extension syncs as soon as it has it.
export async function connectExtension(): Promise<void> {
  const key = hex(crypto.getRandomValues(new Uint8Array(32)));
  const keyHash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))));
  await setDoc(doc(firestore, 'simplifi', 'link'), {
    keyHash,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.email ?? 'unknown'
  });
  window.postMessage({ to: EXTENSION, type: 'key', key }, location.origin);
}

export function requestSync(): void {
  window.postMessage({ to: EXTENSION, type: 'sync' }, location.origin);
}
