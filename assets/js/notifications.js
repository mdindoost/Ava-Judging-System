/**
 * notifications.js — Ava Judging System
 * In-app notifications, offline banners, voting-status change alerts,
 * and optional browser push notifications.
 */

import { CONFIG } from './config.js';
import { STRINGS, interpolate } from './i18n.js';
import { showToast } from './ui.js';

let _persistentBanner = null;
let _statusPollInterval = null;
let _lastKnownVotingStatus = null;

/**
 * Starts polling for voting status changes.
 * @param {Function} getSettingsFn - Reference to api.getSettings
 */
export function init(getSettingsFn) {
  _statusPollInterval = setInterval(async () => {
    try {
      const result = await getSettingsFn();
      if (!result.success) return;
      const newStatus = result.data?.votingStatus;
      if (newStatus && newStatus !== _lastKnownVotingStatus) {
        if (_lastKnownVotingStatus !== null) showVotingStatusChange(newStatus);
        _lastKnownVotingStatus = newStatus;
      }
    } catch { /* silent */ }
  }, CONFIG.POLL.VOTING_STATUS);
}

export function stop() {
  clearInterval(_statusPollInterval);
}

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration]
 */
export function showNotification(message, type = 'info', duration) {
  showToast(message, type, duration !== undefined ? { duration } : undefined);
}

/**
 * Shows a persistent dismissible banner at the top of the page.
 * @param {string} message
 * @param {'info'|'warning'|'success'|'danger'} [type='info']
 */
export function showPersistentBanner(message, type = 'info') {
  hidePersistentBanner();

  const colorMap = {
    info:    { bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    border: 'var(--color-info-light)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-light)' },
    success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-light)' },
    danger:  { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  border: 'var(--color-danger-light)' },
  };
  const c = colorMap[type] || colorMap.info;

  const banner = document.createElement('div');
  banner.id = 'persistent-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  Object.assign(banner.style, {
    position: 'sticky', top: '0', zIndex: 'var(--z-sticky)',
    padding: 'var(--space-3) var(--space-6)',
    fontSize: 'var(--text-sm)', fontWeight: '600',
    textAlign: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)',
    background: c.bg, color: c.color,
    borderBottom: `2px solid ${c.border}`,
  });
  banner.innerHTML = `<span>${message}</span>
    <button type="button" style="background:none;border:none;cursor:pointer;color:inherit;font-size:1.2em;line-height:1;padding:0 4px;" aria-label="Dismiss" onclick="this.parentElement.remove()">×</button>`;

  document.body.prepend(banner);
  _persistentBanner = banner;
}

export function hidePersistentBanner() {
  _persistentBanner?.remove();
  document.getElementById('persistent-banner')?.remove();
  _persistentBanner = null;
}

/**
 * Shows an offline status banner with queued vote count.
 * @param {number} queueCount
 */
export function showOfflineBanner(queueCount) {
  showPersistentBanner(
    queueCount > 0
      ? `You are offline. ${queueCount} vote(s) queued — will sync when reconnected.`
      : 'You are offline. Scores will be saved locally and synced when you reconnect.',
    'warning',
  );
}

export function hideOfflineBanner() { hidePersistentBanner(); }

/**
 * Shows a "sync complete" toast.
 * @param {number} count
 */
export function showSyncSuccess(count) {
  showToast(interpolate(STRINGS.success.syncComplete, { count }), 'success');
}

/**
 * Shows a banner and toast when the voting status changes.
 * @param {'open'|'paused'|'closed'} newStatus
 */
export function showVotingStatusChange(newStatus) {
  const map = {
    open:   { msg: STRINGS.status.votingOpen,   type: 'success' },
    paused: { msg: STRINGS.status.votingPaused, type: 'warning' },
    closed: { msg: STRINGS.status.votingClosed, type: 'danger'  },
  };
  const cfg = map[newStatus] || { msg: `Voting status: ${newStatus}`, type: 'info' };
  showPersistentBanner(cfg.msg, cfg.type);
  showToast(cfg.msg, cfg.type, { duration: 6000 });
  requestBrowserNotification(cfg.msg);
}

/**
 * Requests browser notification permission (call from a user gesture).
 */
export async function initBrowserNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
}

/**
 * Fires a browser notification if permission granted and tab is hidden.
 * @param {string} message
 * @param {string} [title]
 */
export function requestBrowserNotification(message, title = 'Ava Judging System') {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try { new Notification(title, { body: message, icon: `${location.origin}/assets/img/logo.svg` }); }
  catch { /* ignore */ }
}
