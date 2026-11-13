// FreeLinda Simplifi sync, on FreeLinda's own pages only: says the extension is here, takes the key the Withdrawal
// Plan page hands over when Connect is pressed (and syncs at once), and passes on "sync now". It reads nothing else.
(() => {
  'use strict';
  const here = location.origin;
  const NAME = 'freelinda-simplifi-extension';
  const tell = message => window.postMessage(Object.assign({ from: NAME }, message), here);
  const status = async () => {
    const { key, lastOk, lastError } = await chrome.storage.local.get(['key', 'lastOk', 'lastError']);
    tell({ type: 'here', version: chrome.runtime.getManifest().version, connected: !!key, lastOk: lastOk || 0, lastError: lastError || '' });
  };
  window.addEventListener('message', async ev => {
    if (ev.source !== window || ev.origin !== here || !ev.data || ev.data.to !== NAME) return;
    if (ev.data.type === 'key' && typeof ev.data.key === 'string' && ev.data.key.length >= 32) {
      await chrome.storage.local.set({ key: ev.data.key, lastError: '' });
      chrome.runtime.sendMessage({ sync: true });
      tell({ type: 'connected' });
      await status();
    } else if (ev.data.type === 'sync') {
      chrome.runtime.sendMessage({ sync: true });
      tell({ type: 'syncing' });
    } else if (ev.data.type === 'hello') {
      await status();
    }
  });
  status();
})();
