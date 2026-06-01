/**
 * offline.js — Ava Judging System
 * Complete offline vote queue implementation.
 * Stores vote submissions in localStorage when the network is unavailable,
 * then syncs them automatically when connectivity is restored.
 *
 * Architecture note: syncQueue() accepts a requestFn parameter to avoid
 * circular imports with api.js (api.js calls addToQueue; offline.js
 * calls back via requestFn passed in at runtime, not at import time).
 */

import { CONFIG } from './config.js';
import { STRINGS, interpolate } from './i18n.js';

/* ============================================================
   INTERNAL STATE
   ============================================================ */

let _isSyncing = false;
let _syncRequestFn = null;
let _offlineBanner = null;

/* ============================================================
   QUEUE MANAGEMENT
   ============================================================ */

/**
 * Returns the current offline queue array from localStorage.
 * @returns {Array<{id: string, timestamp: string, action: string, payload: object, retryCount: number, synced: boolean}>}
 */
export function getQueue() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE.OFFLINE_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (CONFIG.DEBUG) console.log('[Offline]', 'Could not parse offline queue', err);
    return [];
  }
}

/**
 * Saves the queue array back to localStorage.
 * @param {Array} queue
 */
function _saveQueue(queue) {
  try {
    localStorage.setItem(CONFIG.STORAGE.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.error('[Offline]', 'Failed to persist offline queue', err);
  }
}

/**
 * Adds a vote action to the offline queue.
 * @param {string} action - The API action name (e.g., 'submitVote')
 * @param {object} payload - The full request payload
 * @returns {string} The queue item ID
 */
export function addToQueue(action, payload) {
  const id = _generateQueueId();
  const item = {
    id,
    timestamp: new Date().toISOString(),
    action,
    payload,
    retryCount: 0,
    synced: false,
  };

  const queue = getQueue();
  queue.push(item);
  _saveQueue(queue);

  if (CONFIG.DEBUG) console.log('[Offline]', 'Added to queue', id, action);
  _updateOfflineBanner();

  return id;
}

/**
 * Returns the count of unsynced items in the queue.
 * @returns {number}
 */
export function getQueueCount() {
  return getQueue().filter(item => !item.synced).length;
}

/**
 * Clears all items from the offline queue, including synced items.
 */
export function clearQueue() {
  _saveQueue([]);
  _updateOfflineBanner();
  if (CONFIG.DEBUG) console.log('[Offline]', 'Queue cleared');
}

/**
 * Removes successfully-synced items from the queue to prevent it from growing unbounded.
 */
function _pruneSyncedItems() {
  const queue = getQueue().filter(item => !item.synced);
  _saveQueue(queue);
}

/* ============================================================
   SYNC
   ============================================================ */

/**
 * Registers the API request function used during sync.
 * Call this once from the page init (avoids circular imports).
 * @param {Function} requestFn - api.request(action, payload) compatible function
 */
export function registerSyncRequestFn(requestFn) {
  _syncRequestFn = requestFn;
}

/**
 * Attempts to sync all pending offline queue items.
 * Processes items sequentially to preserve submission order.
 * Items that succeed are marked synced; failed items increment retryCount.
 * After MAX_RETRIES failures an item is dropped.
 *
 * @param {Function} [requestFn] - Optional override for the request function.
 *   If omitted, uses the function registered via registerSyncRequestFn().
 * @returns {Promise<{synced: number, failed: number, total: number}>}
 */
export async function syncQueue(requestFn) {
  const doRequest = requestFn || _syncRequestFn;
  if (!doRequest) {
    console.error('[Offline]', 'No request function registered for sync');
    return { synced: 0, failed: 0, total: 0 };
  }

  if (_isSyncing) {
    if (CONFIG.DEBUG) console.log('[Offline]', 'Sync already in progress');
    return { synced: 0, failed: 0, total: 0 };
  }

  const queue = getQueue().filter(item => !item.synced);
  if (queue.length === 0) {
    if (CONFIG.DEBUG) console.log('[Offline]', 'No items to sync');
    return { synced: 0, failed: 0, total: 0 };
  }

  _isSyncing = true;
  if (CONFIG.DEBUG) console.log('[Offline]', 'Starting sync of', queue.length, 'items');

  let synced = 0;
  let failed = 0;
  const MAX_RETRIES = 3;

  for (const item of queue) {
    try {
      const result = await doRequest(item.action, item.payload);
      if (result && result.success) {
        _markSynced(item.id);
        synced++;
        if (CONFIG.DEBUG) console.log('[Offline]', 'Synced item', item.id);
      } else {
        _incrementRetry(item.id, MAX_RETRIES);
        failed++;
        if (CONFIG.DEBUG) console.log('[Offline]', 'Sync failed for item', item.id, result?.error);
      }
    } catch (err) {
      // Network still down — stop trying further items
      _incrementRetry(item.id, MAX_RETRIES);
      failed++;
      if (CONFIG.DEBUG) console.log('[Offline]', 'Network error during sync', err);
      break;
    }
  }

  _pruneSyncedItems();
  _isSyncing = false;
  _updateOfflineBanner();

  if (CONFIG.DEBUG) console.log('[Offline]', `Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed, total: queue.length };
}

/**
 * Marks a queue item as successfully synced.
 * @param {string} itemId
 */
function _markSynced(itemId) {
  const queue = getQueue();
  const item = queue.find(i => i.id === itemId);
  if (item) {
    item.synced = true;
    _saveQueue(queue);
  }
}

/**
 * Increments retry count; removes item if it exceeds maxRetries.
 * @param {string} itemId
 * @param {number} maxRetries
 */
function _incrementRetry(itemId, maxRetries) {
  const queue = getQueue();
  const idx = queue.findIndex(i => i.id === itemId);
  if (idx === -1) return;
  queue[idx].retryCount = (queue[idx].retryCount || 0) + 1;
  if (queue[idx].retryCount >= maxRetries) {
    if (CONFIG.DEBUG) console.log('[Offline]', 'Dropping item after max retries', itemId);
    queue.splice(idx, 1);
  }
  _saveQueue(queue);
}

/* ============================================================
   NETWORK EVENT DETECTION
   ============================================================ */

/**
 * Initialises online/offline event listeners.
 * When the browser comes back online, auto-syncs the queue.
 * @param {Function} [onSyncComplete] - Callback called with sync result after auto-sync.
 */
export function initOfflineDetection(onSyncComplete) {
  _updateOfflineBanner();

  window.addEventListener('online', async () => {
    if (CONFIG.DEBUG) console.log('[Offline]', 'Network restored — auto-syncing');
    _updateOfflineBanner();
    if (getQueueCount() > 0) {
      const result = await syncQueue();
      if (onSyncComplete) onSyncComplete(result);
    }
  });

  window.addEventListener('offline', () => {
    if (CONFIG.DEBUG) console.log('[Offline]', 'Network lost');
    _updateOfflineBanner();
  });
}

/* ============================================================
   UI — OFFLINE BANNER
   ============================================================ */

/**
 * Shows or updates the offline status banner in the page.
 * Creates the banner element if it does not yet exist in the DOM.
 */
export function showOfflineStatus() {
  _updateOfflineBanner();
}

/**
 * Returns true when the browser reports it is offline.
 * @returns {boolean}
 */
export function isOffline() {
  return !navigator.onLine;
}

/**
 * Internal: updates the offline banner text and visibility.
 */
function _updateOfflineBanner() {
  const count = getQueueCount();
  const offline = isOffline();

  let banner = _offlineBanner || document.getElementById('offline-banner');

  if (!banner) {
    if (!offline && count === 0) return;
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    document.body.prepend(banner);
  }

  _offlineBanner = banner;

  if (!offline && count === 0) {
    banner.className = 'offline-banner offline-banner--hidden';
    banner.textContent = '';
    return;
  }

  if (offline) {
    banner.className = 'offline-banner offline-banner--offline';
    banner.innerHTML = count > 0
      ? `<span class="offline-banner__icon">⚠</span> You are offline. ${count} vote(s) saved locally — will sync when connected.`
      : `<span class="offline-banner__icon">⚠</span> You are offline. Scores will be saved locally and synced when you reconnect.`;
  } else if (count > 0) {
    banner.className = 'offline-banner offline-banner--pending';
    banner.innerHTML = `<span class="offline-banner__icon">↑</span> ${count} vote(s) pending sync…`;
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Generates a simple unique ID for queue items.
 * @returns {string}
 */
function _generateQueueId() {
  return 'oq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}
