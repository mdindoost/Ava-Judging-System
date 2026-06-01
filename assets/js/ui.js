/**
 * ui.js — Ava Judging System
 * Complete UI utility module. Shared by all pages.
 * Provides: toast, modal, loading, skeleton, form, table,
 *           date/number formatting, DOM helpers, storage-with-TTL,
 *           event bus, debounce/throttle, clipboard.
 */

import { CONFIG } from './config.js';
import { STRINGS, interpolate } from './i18n.js';

/* ============================================================
   TOAST SYSTEM
   ============================================================ */

const _toastQueue = [];
let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      _toastContainer.setAttribute('role', 'region');
      _toastContainer.setAttribute('aria-label', 'Notifications');
      _toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

/**
 * Shows a toast notification.
 * @param {string} message - Main message text.
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {object} [options]
 * @param {number}  [options.duration] - Auto-dismiss after ms. 0 = persistent.
 * @param {string}  [options.title]    - Optional bold title above message.
 * @param {boolean} [options.dismissible] - Show × button. Default true.
 */
export function showToast(message, type = 'info', options = {}) {
  const {
    duration    = CONFIG.TIMEOUT.TOAST_DURATION,
    title       = null,
    dismissible = true,
  } = options;

  const container = _getToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');

  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] || 'ℹ'}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${escapeHTML(title)}</div>` : ''}
      <div class="toast-message">${escapeHTML(message)}</div>
    </div>
    ${dismissible ? `<button class="toast-dismiss" aria-label="${STRINGS.a11y.closeModal}" type="button">×</button>` : ''}
    ${duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
  `;

  if (dismissible) {
    el.querySelector('.toast-dismiss').addEventListener('click', () => _dismissToast(el));
  }

  container.appendChild(el);

  if (duration > 0) {
    setTimeout(() => _dismissToast(el), duration);
  }

  return el;
}

function _dismissToast(el) {
  if (!el || el.classList.contains('is-dismissing')) return;
  el.classList.add('is-dismissing');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 700);
}

/** Convenience wrappers */
export const toast = {
  success: (msg, opts) => showToast(msg, 'success', opts),
  error:   (msg, opts) => showToast(msg, 'error',   opts),
  warning: (msg, opts) => showToast(msg, 'warning', opts),
  info:    (msg, opts) => showToast(msg, 'info',    opts),
};

/**
 * Shows an error string from STRINGS.errors or a raw message.
 * @param {string} messageOrKey
 * @param {Record<string,string>} [vars]
 */
export function showError(messageOrKey, vars = {}) {
  const raw = STRINGS.errors[messageOrKey] ?? messageOrKey;
  const msg = Object.keys(vars).length > 0 ? interpolate(raw, vars) : raw;
  return toast.error(msg);
}

/**
 * Shows a success string from STRINGS.success or a raw message.
 * @param {string} messageOrKey
 * @param {Record<string,string>} [vars]
 */
export function showSuccess(messageOrKey, vars = {}) {
  const raw = STRINGS.success[messageOrKey] ?? messageOrKey;
  const msg = Object.keys(vars).length > 0 ? interpolate(raw, vars) : raw;
  return toast.success(msg);
}

/* ============================================================
   MODAL SYSTEM
   ============================================================ */

let _activeModal = null;
let _previousFocus = null;

/**
 * Opens a modal by overlay element or ID.
 * @param {HTMLElement|string} modalOrId
 */
export function openModal(modalOrId) {
  const overlay = typeof modalOrId === 'string'
    ? document.getElementById(modalOrId)
    : modalOrId;
  if (!overlay) return;

  _previousFocus = document.activeElement;
  _activeModal = overlay;
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus first focusable element inside modal
  requestAnimationFrame(() => {
    const focusable = overlay.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  });

  // Close on overlay click (not modal content)
  const onOverlayClick = (e) => {
    if (e.target === overlay) closeModal(overlay);
  };
  overlay.addEventListener('click', onOverlayClick, { once: true });

  // Close on Escape
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { closeModal(overlay); document.removeEventListener('keydown', onKeyDown); }
  };
  document.addEventListener('keydown', onKeyDown);

  // Trap focus
  overlay.addEventListener('keydown', _trapFocus);
}

/**
 * Closes a modal.
 * @param {HTMLElement|string} [modalOrId] - Defaults to active modal.
 */
export function closeModal(modalOrId) {
  const overlay = modalOrId
    ? (typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId)
    : _activeModal;
  if (!overlay) return;

  overlay.classList.remove('is-open');
  overlay.removeEventListener('keydown', _trapFocus);
  document.body.style.overflow = '';
  _activeModal = null;

  if (_previousFocus && typeof _previousFocus.focus === 'function') {
    _previousFocus.focus();
    _previousFocus = null;
  }
}

function _trapFocus(e) {
  if (e.key !== 'Tab') return;
  const overlay = e.currentTarget;
  const focusable = Array.from(overlay.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

/**
 * Creates and shows a confirmation dialog. Returns a Promise<boolean>.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmText]
 * @param {string} [options.cancelText]
 * @param {'danger'|'primary'} [options.confirmType]
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, message, confirmText, cancelText, confirmType = 'danger' }) {
  return new Promise((resolve) => {
    const id = 'confirm-' + Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', id + '-title');

    overlay.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2 class="modal-title" id="${id}-title">${escapeHTML(title || STRINGS.headings.confirmAction)}</h2>
          <button class="modal-close" aria-label="${STRINGS.a11y.closeModal}" type="button">×</button>
        </div>
        <div class="modal-body">
          <p style="color: var(--color-text-secondary); line-height: var(--leading-relaxed);">${escapeHTML(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost btn-cancel" type="button">${escapeHTML(cancelText || STRINGS.buttons.cancel)}</button>
          <button class="btn btn-${confirmType} btn-confirm" type="button">${escapeHTML(confirmText || STRINGS.buttons.confirm)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      closeModal(overlay);
      setTimeout(() => overlay.remove(), 400);
      resolve(result);
    };

    overlay.querySelector('.btn-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.btn-confirm').addEventListener('click', () => cleanup(true));
    overlay.querySelector('.modal-close').addEventListener('click', () => cleanup(false));
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cleanup(false); });

    requestAnimationFrame(() => openModal(overlay));
  });
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */

let _loadingOverlay = null;

/**
 * Shows a full-page loading overlay with optional message.
 * @param {string} [message]
 */
export function showLoading(message = STRINGS.app.loading) {
  if (!_loadingOverlay) {
    _loadingOverlay = document.createElement('div');
    _loadingOverlay.id = 'loading-overlay';
    _loadingOverlay.className = 'loading-page';
    _loadingOverlay.setAttribute('role', 'status');
    _loadingOverlay.setAttribute('aria-live', 'polite');
    _loadingOverlay.setAttribute('aria-label', STRINGS.a11y.loadingContent);
    _loadingOverlay.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-4);">
        <div class="spinner spinner-xl"></div>
        <p class="loading-message" style="color: var(--color-text-muted); font-size: var(--text-base);">${escapeHTML(message)}</p>
      </div>
    `;
    document.body.appendChild(_loadingOverlay);
  } else {
    const msg = _loadingOverlay.querySelector('.loading-message');
    if (msg) msg.textContent = message;
    _loadingOverlay.style.display = 'flex';
  }
}

/** Hides the full-page loading overlay. */
export function hideLoading() {
  if (_loadingOverlay) {
    _loadingOverlay.remove();
    _loadingOverlay = null;
  }
}

/**
 * Shows a loading spinner inside a specific container.
 * @param {HTMLElement|string} containerOrId
 * @param {string} [message]
 */
export function showContainerLoading(containerOrId, message = STRINGS.app.loading) {
  const el = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!el) return;
  el.innerHTML = `
    <div class="spinner-overlay">
      <div class="spinner"></div>
      <p class="spinner-message">${escapeHTML(message)}</p>
    </div>
  `;
}

/* ============================================================
   SKELETON LOADING
   ============================================================ */

/**
 * Renders skeleton placeholder rows in a table body.
 * @param {HTMLElement|string} tbodyOrId
 * @param {number} cols - Number of columns.
 * @param {number} [rows=5]
 */
export function renderSkeletonTable(tbodyOrId, cols, rows = 5) {
  const tbody = typeof tbodyOrId === 'string'
    ? document.getElementById(tbodyOrId)
    : tbodyOrId;
  if (!tbody) return;
  const skeletonRow = `<tr>${Array(cols).fill(null).map(() =>
    `<td><div class="skeleton skeleton-text" style="width: ${60 + Math.random() * 35}%"></div></td>`
  ).join('')}</tr>`;
  tbody.innerHTML = Array(rows).fill(skeletonRow).join('');
}

/**
 * Replaces a container with skeleton card placeholders.
 * @param {HTMLElement|string} containerOrId
 * @param {number} [count=3]
 */
export function renderSkeletonCards(containerOrId, count = 3) {
  const el = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!el) return;
  el.innerHTML = Array(count).fill(null).map(() => `
    <div class="card">
      <div class="skeleton skeleton-title" style="margin-bottom: var(--space-3)"></div>
      <div class="skeleton skeleton-text" style="width: 80%; margin-bottom: var(--space-2)"></div>
      <div class="skeleton skeleton-text" style="width: 60%"></div>
    </div>
  `).join('');
}

/* ============================================================
   FORM UTILITIES
   ============================================================ */

/**
 * Serializes a form's inputs into a plain object.
 * Handles text, number, email, select, checkbox, radio, textarea.
 * @param {HTMLFormElement|string} formOrId
 * @returns {Record<string, string|boolean|string[]>}
 */
export function serializeForm(formOrId) {
  const form = typeof formOrId === 'string'
    ? document.getElementById(formOrId)
    : formOrId;
  if (!form) return {};

  const data = {};
  const inputs = form.querySelectorAll('[name]:not([disabled])');

  inputs.forEach((input) => {
    const name = input.name;
    if (!name) return;

    if (input.type === 'checkbox') {
      data[name] = input.checked;
    } else if (input.type === 'radio') {
      if (input.checked) data[name] = input.value;
    } else if (input.tagName === 'SELECT' && input.multiple) {
      data[name] = Array.from(input.selectedOptions).map(o => o.value);
    } else {
      data[name] = input.value;
    }
  });

  return data;
}

/**
 * Populates a form with values from an object.
 * @param {HTMLFormElement|string} formOrId
 * @param {Record<string, any>} values
 */
export function populateForm(formOrId, values) {
  const form = typeof formOrId === 'string'
    ? document.getElementById(formOrId)
    : formOrId;
  if (!form) return;

  Object.entries(values).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
    } else if (input.type === 'radio') {
      const radio = form.querySelector(`[name="${CSS.escape(name)}"][value="${CSS.escape(String(value))}"]`);
      if (radio) radio.checked = true;
    } else {
      input.value = value ?? '';
    }
  });
}

/**
 * Clears all values and error states from a form.
 * @param {HTMLFormElement|string} formOrId
 */
export function resetForm(formOrId) {
  const form = typeof formOrId === 'string'
    ? document.getElementById(formOrId)
    : formOrId;
  if (!form) return;
  form.reset();
  clearFormErrors(form);
}

/**
 * Shows a field-level error message.
 * @param {HTMLElement|string} inputOrId - The input field.
 * @param {string} message
 */
export function showFieldError(inputOrId, message) {
  const input = typeof inputOrId === 'string'
    ? document.getElementById(inputOrId)
    : inputOrId;
  if (!input) return;

  input.classList.add('error');
  input.setAttribute('aria-invalid', 'true');

  const errorId = (input.id || input.name || 'field') + '-error';
  input.setAttribute('aria-describedby', errorId);

  let errorEl = document.getElementById(errorId);
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = errorId;
    errorEl.className = 'form-error';
    errorEl.setAttribute('role', 'alert');
    input.closest('.form-group')?.appendChild(errorEl)
      ?? input.parentNode?.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

/**
 * Clears the error state from a field.
 * @param {HTMLElement|string} inputOrId
 */
export function clearFieldError(inputOrId) {
  const input = typeof inputOrId === 'string'
    ? document.getElementById(inputOrId)
    : inputOrId;
  if (!input) return;

  input.classList.remove('error');
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');

  const errorId = (input.id || input.name || 'field') + '-error';
  document.getElementById(errorId)?.remove();
}

/**
 * Clears all error states within a form or container.
 * @param {HTMLElement} container
 */
export function clearFormErrors(container) {
  container.querySelectorAll('.form-error').forEach(el => el.remove());
  container.querySelectorAll('.error').forEach(el => {
    el.classList.remove('error');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
}

/**
 * Validates a form against simple rules. Returns { valid, errors }.
 * @param {HTMLFormElement|string} formOrId
 * @param {Record<string, { required?, min?, max?, pattern?, label? }>} rules
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateForm(formOrId, rules) {
  const form = typeof formOrId === 'string'
    ? document.getElementById(formOrId)
    : formOrId;
  if (!form) return { valid: false, errors: {} };

  clearFormErrors(form);
  const errors = {};

  Object.entries(rules).forEach(([name, rule]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;
    const value = input.value.trim();
    const label = rule.label || name;

    if (rule.required && !value) {
      errors[name] = interpolate(STRINGS.errors.requiredField, { field: label });
    } else if (value) {
      if (rule.min !== undefined && value.length < rule.min) {
        errors[name] = interpolate(STRINGS.errors.nameTooShort, { field: label, min: rule.min });
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors[name] = interpolate(STRINGS.errors.nameTooLong, { field: label, max: rule.max });
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[name] = rule.patternMessage || interpolate(STRINGS.errors.required);
      }
      if (rule.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[name] = STRINGS.errors.invalidEmail;
      }
    }
  });

  Object.entries(errors).forEach(([name, msg]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) showFieldError(input, msg);
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

/* ============================================================
   TABLE UTILITIES
   ============================================================ */

/**
 * Renders data into a table body.
 * @param {HTMLTableSectionElement|string} tbodyOrId
 * @param {Array<object>} rows
 * @param {Array<{key: string, render?: (val, row) => string}>} columns
 * @param {object} [options]
 * @param {boolean} [options.zebra] - Alternate row shading (default true)
 * @param {string} [options.emptyMessage]
 */
export function renderTable(tbodyOrId, rows, columns, options = {}) {
  const tbody = typeof tbodyOrId === 'string'
    ? document.getElementById(tbodyOrId)
    : tbodyOrId;
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    const colCount = columns.length;
    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" style="text-align: center; padding: var(--space-12); color: var(--color-text-muted);">
          ${options.emptyMessage || STRINGS.status.noResults}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((row) =>
    `<tr>${columns.map(col => {
      const val = col.key.split('.').reduce((obj, k) => obj?.[k], row);
      const html = col.render ? col.render(val, row) : escapeHTML(String(val ?? ''));
      return `<td>${html}</td>`;
    }).join('')}</tr>`
  ).join('');
}

/**
 * Sorts an array of objects by a key.
 * @param {Array<object>} arr
 * @param {string} key
 * @param {'asc'|'desc'} direction
 * @returns {Array<object>}
 */
export function sortBy(arr, key, direction = 'asc') {
  return [...arr].sort((a, b) => {
    const va = key.split('.').reduce((o, k) => o?.[k], a);
    const vb = key.split('.').reduce((o, k) => o?.[k], b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb));
    return direction === 'asc' ? cmp : -cmp;
  });
}

/**
 * Filters an array by a search string across specified keys.
 * @param {Array<object>} arr
 * @param {string} query
 * @param {string[]} keys - Dot-notation keys to search.
 * @returns {Array<object>}
 */
export function filterByQuery(arr, query, keys) {
  const q = query.toLowerCase().trim();
  if (!q) return arr;
  return arr.filter(item =>
    keys.some(key => {
      const val = key.split('.').reduce((o, k) => o?.[k], item);
      return String(val ?? '').toLowerCase().includes(q);
    })
  );
}

/**
 * Returns a page slice from an array.
 * @param {Array} arr
 * @param {number} page - 1-based.
 * @param {number} perPage
 * @returns {{ items: Array, totalPages: number, total: number }}
 */
export function paginate(arr, page, perPage) {
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: arr.slice(start, start + perPage),
    totalPages,
    total,
    page: safePage,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + perPage, total),
  };
}

/**
 * Renders a pagination strip into a container.
 * @param {HTMLElement|string} containerOrId
 * @param {{ page, totalPages, total, from, to }} paginationState
 * @param {(page: number) => void} onPageChange
 */
export function renderPagination(containerOrId, state, onPageChange) {
  const el = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!el) return;

  const { page, totalPages, total, from, to } = state;
  if (totalPages <= 1 && total === 0) { el.innerHTML = ''; return; }

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  el.innerHTML = `
    <div class="pagination">
      <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}" aria-label="${STRINGS.a11y.previousPage}">‹</button>
      ${pages.map(p =>
        p === '…'
          ? `<span class="pagination-info">…</span>`
          : `<button class="pagination-btn ${p === page ? 'active' : ''}" data-page="${p}" ${p === page ? `aria-current="${STRINGS.a11y.currentPage}"` : ''}>${p}</button>`
      ).join('')}
      <button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} data-page="${page + 1}" aria-label="${STRINGS.a11y.nextPage}">›</button>
      <span class="pagination-info">${interpolate(STRINGS.labels.showing, { from, to, total })}</span>
    </div>
  `;

  el.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page, 10)));
  });
}

/* ============================================================
   DATE / TIME FORMATTING
   ============================================================ */

/**
 * Formats a date as a human-readable string.
 * @param {string|Date} dateOrStr
 * @param {'date'|'datetime'|'time'|'relative'} [format='datetime']
 * @returns {string}
 */
export function formatDate(dateOrStr, format = 'datetime') {
  if (!dateOrStr) return '—';
  const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
  if (isNaN(d.getTime())) return String(dateOrStr);

  if (format === 'relative') return _relativeTime(d);

  const opts = {
    date:     { year: 'numeric', month: 'short', day: 'numeric' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    time:     { hour: '2-digit', minute: '2-digit' },
  };
  return d.toLocaleString('en-US', opts[format] || opts.datetime);
}

function _relativeTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return STRINGS.status.justNow;
  if (minutes < 60) return interpolate(STRINGS.status.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return interpolate(STRINGS.status.hoursAgo, { n: hours });
  return formatDate(date, 'date');
}

/* ============================================================
   NUMBER FORMATTING
   ============================================================ */

/**
 * Formats a score to the configured number of decimal places.
 * @param {number} score
 * @param {number} [places] - Defaults to CONFIG.SCORING.DECIMAL_PLACES
 * @returns {string}
 */
export function formatScore(score, places = CONFIG.SCORING.DECIMAL_PLACES) {
  if (score == null || isNaN(score)) return '—';
  return Number(score).toFixed(places);
}

/**
 * Formats a percentage.
 * @param {number} value - 0–100 or 0–1.
 * @param {boolean} [isDecimal] - True if 0–1 range.
 * @returns {string}
 */
export function formatPercent(value, isDecimal = false) {
  if (value == null || isNaN(value)) return '—';
  const pct = isDecimal ? value * 100 : value;
  return pct.toFixed(1) + '%';
}

/**
 * Formats a large number with comma separators.
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

/* ============================================================
   DOM UTILITIES
   ============================================================ */

/**
 * Shorthand for document.querySelector.
 * @param {string} selector
 * @param {Element} [context=document]
 * @returns {Element|null}
 */
export const qs = (selector, context = document) => context.querySelector(selector);

/**
 * Shorthand for document.querySelectorAll as Array.
 * @param {string} selector
 * @param {Element} [context=document]
 * @returns {Element[]}
 */
export const qsa = (selector, context = document) => Array.from(context.querySelectorAll(selector));

/**
 * Adds an event listener with optional delegation.
 * @param {EventTarget} target
 * @param {string} event
 * @param {string|Function} selectorOrHandler
 * @param {Function} [handler]
 */
export function on(target, event, selectorOrHandler, handler) {
  if (typeof selectorOrHandler === 'function') {
    target.addEventListener(event, selectorOrHandler);
  } else {
    target.addEventListener(event, (e) => {
      const el = e.target.closest(selectorOrHandler);
      if (el && target.contains(el)) handler.call(el, e);
    });
  }
}

/**
 * Removes an event listener.
 */
export const off = (target, event, handler) => target.removeEventListener(event, handler);

/**
 * Shows an element (removes .hidden class, sets display).
 * @param {HTMLElement|string} elOrId
 * @param {string} [display='block']
 */
export function show(elOrId, display = 'block') {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (el) { el.style.display = display; el.classList.remove('hidden'); }
}

/**
 * Hides an element.
 * @param {HTMLElement|string} elOrId
 */
export function hide(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (el) { el.style.display = 'none'; el.classList.add('hidden'); }
}

/**
 * Toggles an element's visibility.
 * @param {HTMLElement|string} elOrId
 */
export function toggle(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  if (el.style.display === 'none' || el.classList.contains('hidden')) show(el);
  else hide(el);
}

/**
 * Sets text content safely (escapes HTML).
 * @param {HTMLElement|string} elOrId
 * @param {string} text
 */
export function setText(elOrId, text) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (el) el.textContent = String(text ?? '');
}

/**
 * Sets inner HTML using a safe string (NOT escaped — use escapeHTML first if needed).
 * @param {HTMLElement|string} elOrId
 * @param {string} html
 */
export function setHTML(elOrId, html) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (el) el.innerHTML = html;
}

/**
 * Escapes a string for safe insertion into HTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Copies text to the clipboard.
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(STRINGS.success.copiedToClipboard);
  } catch {
    // Fallback for browsers that block navigator.clipboard in some contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast.success(STRINGS.success.copiedToClipboard);
  }
}

/* ============================================================
   LOCAL STORAGE WITH TTL
   ============================================================ */

/**
 * Stores a value in localStorage with an optional TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlMs] - Time-to-live in milliseconds. Omit for no expiry.
 */
export function storageSet(key, value, ttlMs) {
  const item = {
    value,
    expiry: ttlMs ? Date.now() + ttlMs : null,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    if (CONFIG.DEBUG) console.warn('[UI] localStorage.setItem failed:', e);
  }
}

/**
 * Retrieves a value from localStorage, respecting TTL.
 * Returns null if key doesn't exist or has expired.
 * @param {string} key
 * @returns {any|null}
 */
export function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (item.expiry && Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}

/**
 * Removes a key from localStorage.
 * @param {string} key
 */
export function storageRemove(key) {
  localStorage.removeItem(key);
}

/**
 * Checks if a stored item is expired.
 * @param {string} key
 * @returns {boolean}
 */
export function storageIsExpired(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    const item = JSON.parse(raw);
    return item.expiry ? Date.now() > item.expiry : false;
  } catch {
    return true;
  }
}

/* ============================================================
   EVENT BUS (pub/sub for cross-module communication)
   ============================================================ */

const _listeners = {};

/**
 * Subscribes to an event.
 * @param {string} event
 * @param {Function} handler
 * @returns {Function} Unsubscribe function.
 */
export function subscribe(event, handler) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(handler);
  return () => {
    _listeners[event] = (_listeners[event] || []).filter(h => h !== handler);
  };
}

/**
 * Publishes an event to all subscribers.
 * @param {string} event
 * @param {any} [data]
 */
export function publish(event, data) {
  if (CONFIG.DEBUG) console.log(`[EventBus] ${event}`, data);
  (_listeners[event] || []).forEach(h => {
    try { h(data); } catch (e) { console.error(`[EventBus] handler error for "${event}":`, e); }
  });
}

/* ============================================================
   DEBOUNCE & THROTTLE
   ============================================================ */

/**
 * Returns a debounced version of fn that delays execution by `delay` ms.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Returns a throttled version of fn that executes at most once per `limit` ms.
 * @param {Function} fn
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/* ============================================================
   TABS COMPONENT INITIALIZER
   ============================================================ */

/**
 * Initializes a tab component.
 * @param {HTMLElement|string} containerOrId
 * @param {(tabId: string) => void} [onTabChange]
 */
export function initTabs(containerOrId, onTabChange) {
  const container = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!container) return;

  const buttons = qsa('.tab-btn', container);
  const panels  = qsa('.tab-panel', container);

  function activateTab(tabId) {
    buttons.forEach(btn => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    panels.forEach(panel => {
      const active = panel.id === tabId;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    if (onTabChange) onTabChange(tabId);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Activate first tab by default, or whichever has .active
  const activeBtn = buttons.find(b => b.classList.contains('active')) || buttons[0];
  if (activeBtn) activateTab(activeBtn.dataset.tab);
}

/* ============================================================
   ACCORDION COMPONENT INITIALIZER
   ============================================================ */

/**
 * Initializes all accordion triggers within a container.
 * @param {HTMLElement|string} [containerOrId=document]
 */
export function initAccordions(containerOrId = document) {
  const container = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!container) return;

  qsa('.accordion-trigger', container).forEach(trigger => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const content = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(!expanded));
      if (content) content.classList.toggle('is-open', !expanded);
    });
  });
}

/* ============================================================
   MODAL CLOSE BUTTON AUTO-BIND
   ============================================================ */

/**
 * Binds all [data-modal-open] and [data-modal-close] elements.
 * Call once after page load.
 */
export function bindModalTriggers() {
  document.addEventListener('click', (e) => {
    const openBtn  = e.target.closest('[data-modal-open]');
    const closeBtn = e.target.closest('[data-modal-close]');
    if (openBtn)  openModal(openBtn.dataset.modalOpen);
    if (closeBtn) closeModal(closeBtn.dataset.modalClose || undefined);
  });
}

/* ============================================================
   DROPDOWN AUTO-BIND
   ============================================================ */

/**
 * Binds all .dropdown toggles. Call once after page load.
 */
export function bindDropdowns() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-dropdown]');
    if (trigger) {
      e.stopPropagation();
      const menu = document.getElementById(trigger.dataset.dropdown);
      if (!menu) return;
      const isOpen = menu.classList.contains('is-open');
      document.querySelectorAll('.dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
      if (!isOpen) menu.classList.add('is-open');
    } else {
      document.querySelectorAll('.dropdown-menu.is-open').forEach(m => m.classList.remove('is-open'));
    }
  });
}

/* ============================================================
   ACCESSIBILITY TOGGLES
   ============================================================ */

/**
 * Toggles high contrast mode and persists preference.
 */
export function toggleHighContrast() {
  const active = document.body.classList.toggle('high-contrast');
  const prefs = storageGet(CONFIG.STORAGE.ACCESSIBILITY) || {};
  storageSet(CONFIG.STORAGE.ACCESSIBILITY, { ...prefs, highContrast: active });
}

/**
 * Toggles large text mode and persists preference.
 */
export function toggleLargeText() {
  const active = document.body.classList.toggle('large-text');
  const prefs = storageGet(CONFIG.STORAGE.ACCESSIBILITY) || {};
  storageSet(CONFIG.STORAGE.ACCESSIBILITY, { ...prefs, largeText: active });
}

/**
 * Restores saved accessibility preferences. Call on page load.
 */
export function restoreAccessibility() {
  const prefs = storageGet(CONFIG.STORAGE.ACCESSIBILITY);
  if (!prefs) return;
  if (prefs.highContrast) document.body.classList.add('high-contrast');
  if (prefs.largeText)    document.body.classList.add('large-text');
}

/* ============================================================
   PAGE INITIALIZATION HELPERS
   ============================================================ */

/**
 * Sets the document title with the app name.
 * @param {string} pageName
 */
export function setPageTitle(pageName) {
  document.title = interpolate(STRINGS.a11y.pageTitle, { page: pageName });
}

/**
 * Initializes common page behaviors: modal triggers, dropdowns,
 * accessibility restoration, sidebar mobile toggle.
 * Call this at the top of every page script.
 */
export function initPage(pageName) {
  if (pageName) setPageTitle(pageName);
  restoreAccessibility();
  bindModalTriggers();
  bindDropdowns();
  _initSidebarToggle();
}

function _initSidebarToggle() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
    overlay?.classList.toggle('is-visible');
    toggle.setAttribute('aria-expanded', String(sidebar.classList.contains('is-open')));
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    toggle.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Renders an empty-state message inside a container.
 * @param {HTMLElement|string} containerOrId
 * @param {object} options
 * @param {string} options.icon
 * @param {string} options.heading
 * @param {string} options.description
 * @param {string} [options.actionHTML] - Optional button HTML.
 */
export function renderEmptyState(containerOrId, { icon, heading, description, actionHTML = '' }) {
  const el = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">${icon}</div>
      <h3 class="empty-state-heading">${escapeHTML(heading)}</h3>
      <p class="empty-state-description">${escapeHTML(description)}</p>
      ${actionHTML ? `<div class="empty-state-action">${actionHTML}</div>` : ''}
    </div>
  `;
}

/**
 * Updates a progress bar's fill width and aria attributes.
 * @param {HTMLElement|string} barOrId - The .progress-fill element.
 * @param {number} percent - 0–100.
 * @param {string} [ariaLabel]
 */
export function setProgressBar(barOrId, percent, ariaLabel) {
  const bar = typeof barOrId === 'string' ? document.getElementById(barOrId) : barOrId;
  if (!bar) return;
  const clamped = Math.min(100, Math.max(0, percent));
  bar.style.width = clamped + '%';
  if (ariaLabel) bar.setAttribute('aria-valuenow', String(Math.round(clamped)));
}

/**
 * Formats a download trigger — creates a temporary <a> and clicks it.
 * @param {string} content - File content or data URL.
 * @param {string} filename
 * @param {string} [mimeType='text/plain']
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
