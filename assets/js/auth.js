/**
 * auth.js — Ava Judging System
 * Frontend session management for judges and admins.
 * All session data is stored in localStorage/sessionStorage with expiry timestamps.
 * This module never calls fetch() — it only reads/writes local storage.
 */

import { CONFIG, pageURL } from './config.js';

/* ============================================================
   JUDGE SESSION
   ============================================================ */

/**
 * Saves judge session data to localStorage with expiry.
 * @param {{token: string, judgeId: string, judgeName: string, assignedTrack: string|null, assignedPresenters: string[]|string, expiresAt: string}} sessionData
 */
export function saveJudgeSession(sessionData) {
  const session = {
    ...sessionData,
    savedAt: new Date().toISOString(),
    expiresAt: sessionData.expiresAt
      || new Date(Date.now() + CONFIG.JUDGE.SESSION_DURATION_MS).toISOString(),
  };
  try {
    localStorage.setItem(CONFIG.STORAGE.JUDGE_SESSION, JSON.stringify(session));
    if (CONFIG.DEBUG) console.log('[Auth]', 'Judge session saved', session.judgeId);
  } catch (err) {
    console.error('[Auth]', 'Failed to save judge session', err);
  }
}

/**
 * Returns the stored judge session if it exists and has not expired, else null.
 * Side effect: clears expired session from storage.
 * @returns {{token: string, judgeId: string, judgeName: string, assignedTrack: string|null, assignedPresenters: string[], expiresAt: string, savedAt: string}|null}
 */
export function getJudgeSession() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE.JUDGE_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.token || !session.expiresAt) return null;
    if (new Date(session.expiresAt) < new Date()) {
      clearJudgeSession();
      if (CONFIG.DEBUG) console.log('[Auth]', 'Judge session expired and cleared');
      return null;
    }
    return session;
  } catch (err) {
    if (CONFIG.DEBUG) console.log('[Auth]', 'Could not parse judge session', err);
    return null;
  }
}

/**
 * Removes all judge session data from localStorage.
 */
export function clearJudgeSession() {
  localStorage.removeItem(CONFIG.STORAGE.JUDGE_SESSION);
  if (CONFIG.DEBUG) console.log('[Auth]', 'Judge session cleared');
}

/**
 * Returns true when a valid, non-expired judge session exists.
 * @returns {boolean}
 */
export function isJudgeAuthenticated() {
  return getJudgeSession() !== null;
}

/**
 * Enforces judge authentication. Redirects to login.html if no valid session exists.
 * Call at the top of every judge page except login.html.
 * @returns {{token: string, judgeId: string, judgeName: string, assignedTrack: string|null, assignedPresenters: string[]}|null}
 */
export function requireJudgeAuth() {
  const session = getJudgeSession();
  if (!session) {
    window.location.href = pageURL('judgeLogin');
    return null;
  }
  return session;
}

/**
 * Returns the judge's session token, or null if not authenticated.
 * @returns {string|null}
 */
export function getJudgeToken() {
  const session = getJudgeSession();
  return session ? session.token : null;
}

/**
 * Returns the judge's ID from the current session, or null.
 * @returns {string|null}
 */
export function getJudgeId() {
  const session = getJudgeSession();
  return session ? session.judgeId : null;
}

/**
 * Returns the judge's display name from the current session, or null.
 * @returns {string|null}
 */
export function getJudgeName() {
  const session = getJudgeSession();
  return session ? session.judgeName : null;
}

/**
 * Returns the judge's assigned track ID, or null if they cover all tracks.
 * @returns {string|null}
 */
export function getJudgeAssignedTrack() {
  const session = getJudgeSession();
  return session ? (session.assignedTrack || null) : null;
}

/**
 * Returns the array of assigned presenter IDs, or [] if the judge covers all presenters.
 * Handles both JSON-string and native array formats from the backend.
 * @returns {string[]}
 */
export function getJudgeAssignedPresenters() {
  const session = getJudgeSession();
  if (!session) return [];
  if (Array.isArray(session.assignedPresenters)) return session.assignedPresenters;
  try {
    const parsed = JSON.parse(session.assignedPresenters || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ============================================================
   ADMIN SESSION
   ============================================================ */

/**
 * Saves admin session data to both sessionStorage and localStorage.
 * sessionStorage is tab-scoped and cleared on tab close.
 * localStorage copy allows same-browser multi-tab admin access.
 * @param {{sessionToken: string, adminId: string, adminEmail: string}} sessionData
 */
export function saveAdminSession(sessionData) {
  const session = {
    ...sessionData,
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CONFIG.ADMIN.SESSION_DURATION_MS).toISOString(),
  };
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(CONFIG.STORAGE.ADMIN_SESSION, serialized);
    localStorage.setItem(CONFIG.STORAGE.ADMIN_SESSION, serialized);
    if (CONFIG.DEBUG) console.log('[Auth]', 'Admin session saved', session.adminId);
  } catch (err) {
    console.error('[Auth]', 'Failed to save admin session', err);
  }
}

/**
 * Returns the stored admin session if valid and not expired, else null.
 * Prefers sessionStorage (tab-scoped); falls back to localStorage.
 * @returns {{sessionToken: string, adminId: string, adminEmail: string, expiresAt: string}|null}
 */
export function getAdminSession() {
  try {
    const raw = sessionStorage.getItem(CONFIG.STORAGE.ADMIN_SESSION)
             || localStorage.getItem(CONFIG.STORAGE.ADMIN_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.sessionToken || !session.expiresAt) return null;
    if (new Date(session.expiresAt) < new Date()) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch (err) {
    if (CONFIG.DEBUG) console.log('[Auth]', 'Could not parse admin session', err);
    return null;
  }
}

/**
 * Removes all admin session data from both sessionStorage and localStorage.
 */
export function clearAdminSession() {
  sessionStorage.removeItem(CONFIG.STORAGE.ADMIN_SESSION);
  localStorage.removeItem(CONFIG.STORAGE.ADMIN_SESSION);
  if (CONFIG.DEBUG) console.log('[Auth]', 'Admin session cleared');
}

/**
 * Returns true when a valid, non-expired admin session exists.
 * @returns {boolean}
 */
export function isAdminAuthenticated() {
  return getAdminSession() !== null;
}

/**
 * Enforces admin authentication. Redirects to admin login if no valid session exists.
 * Call at the top of every admin page except login.html.
 * @returns {{sessionToken: string, adminId: string, adminEmail: string}|null}
 */
export function requireAdminAuth() {
  const session = getAdminSession();
  if (!session) {
    window.location.href = pageURL('adminLogin');
    return null;
  }
  return session;
}

/**
 * Returns the admin session token, or null if not authenticated.
 * @returns {string|null}
 */
export function getAdminToken() {
  const session = getAdminSession();
  return session ? session.sessionToken : null;
}

/* ============================================================
   PASSWORD HASHING — WebCrypto SHA-256
   ============================================================ */

/**
 * Hashes a password string with SHA-256 using the WebCrypto API.
 * Used for client-side admin login; compare result against stored hash.
 * @param {string} password
 * @returns {Promise<string>} Lowercase hex digest
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compares a plaintext password against a stored SHA-256 hex hash.
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash.toLowerCase();
}

/* ============================================================
   ADMIN LOGIN RATE LIMITING
   Prevents brute-force by locking out after N failed attempts.
   State is stored in localStorage.
   ============================================================ */

/**
 * Records a failed admin login attempt.
 * Locks the account for LOCKOUT_DURATION_MS after MAX_LOGIN_ATTEMPTS failures.
 * @returns {{ attempts: number, lockedOut: boolean, remainingMs: number, attemptsRemaining: number }}
 */
export function recordFailedLogin() {
  const now = Date.now();
  let record = _getLoginRecord();

  if (record.lockedUntil && now > record.lockedUntil) {
    record = { attempts: 0, lockedUntil: null };
  }

  record.attempts = (record.attempts || 0) + 1;

  if (record.attempts >= CONFIG.ADMIN.MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + CONFIG.ADMIN.LOCKOUT_DURATION_MS;
  }

  localStorage.setItem(CONFIG.STORAGE.LOGIN_ATTEMPTS, JSON.stringify(record));

  const lockedOut = Boolean(record.lockedUntil && now < record.lockedUntil);
  const remainingMs = lockedOut ? record.lockedUntil - now : 0;

  return {
    attempts: record.attempts,
    lockedOut,
    remainingMs,
    attemptsRemaining: Math.max(0, CONFIG.ADMIN.MAX_LOGIN_ATTEMPTS - record.attempts),
  };
}

/**
 * Returns the current login lockout status without modifying state.
 * @returns {{ lockedOut: boolean, remainingMs: number, attemptsRemaining: number }}
 */
export function getLoginStatus() {
  const now = Date.now();
  const record = _getLoginRecord();
  const lockedOut = Boolean(record.lockedUntil && now < record.lockedUntil);
  const remainingMs = lockedOut ? record.lockedUntil - now : 0;
  return {
    lockedOut,
    remainingMs,
    attemptsRemaining: Math.max(0, CONFIG.ADMIN.MAX_LOGIN_ATTEMPTS - (record.attempts || 0)),
  };
}

/**
 * Clears the login attempt counter after a successful login.
 */
export function clearLoginRecord() {
  localStorage.removeItem(CONFIG.STORAGE.LOGIN_ATTEMPTS);
}

/** @returns {{ attempts: number, lockedUntil: number|null }} */
function _getLoginRecord() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE.LOGIN_ATTEMPTS);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}
