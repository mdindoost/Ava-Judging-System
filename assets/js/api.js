/**
 * api.js — Ava Judging System
 * THE ONLY FILE THAT CALLS fetch(). All backend communication is centralised here.
 * Every public method maps to a route in backend/Code.gs.
 *
 * All calls use POST with a JSON body containing { action, ...payload }.
 * On network failure, vote submissions are handed off to offline.js for queuing.
 */

import { CONFIG } from './config.js';
import { STRINGS } from './i18n.js';
import { addToQueue } from './offline.js';

/* ============================================================
   BASE REQUEST
   ============================================================ */

/**
 * Sends a POST request to the configured Google Apps Script endpoint.
 * Handles timeout, JSON parsing, and consistent error normalization.
 *
 * @param {string} action - The action name matching a route in Code.gs
 * @param {object} [payload={}] - Additional fields merged into the request body
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function request(action, payload = {}) {
  const scriptUrl = CONFIG.SCRIPT_URL;

  if (!scriptUrl) {
    return { success: false, data: null, error: STRINGS.errors.notConfigured };
  }

  const body = JSON.stringify({ action, ...payload });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT.API_REQUEST);

  if (CONFIG.DEBUG) console.log('[API]', `→ ${action}`, payload);

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      // Apps Script requires no-cors for cross-origin; however deploying as a web app
      // with "Anyone" access returns proper CORS headers via ContentService.
      // We use cors mode here; the backend must be deployed with proper access.
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script ignores application/json Content-Type in some configs
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `${STRINGS.errors.serverError} (HTTP ${response.status})`,
      };
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, data: null, error: STRINGS.errors.serverError };
    }

    if (CONFIG.DEBUG) console.log('[API]', `← ${action}`, data);
    return data;

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return { success: false, data: null, error: STRINGS.errors.timeout };
    }

    if (CONFIG.DEBUG) console.log('[API]', `✕ ${action}`, err.message);
    return { success: false, data: null, error: STRINGS.errors.network };
  }
}

/**
 * Sends a GET request to the Apps Script endpoint with params in the URL.
 * Used for public, no-auth routes to avoid the POST→GET redirect issue
 * that Apps Script web apps exhibit in some CORS environments.
 *
 * @param {string} action
 * @param {object} [params={}]
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
async function requestGet(action, params = {}) {
  const scriptUrl = CONFIG.SCRIPT_URL;
  if (!scriptUrl) {
    return { success: false, data: null, error: STRINGS.errors.notConfigured };
  }

  const url = new URL(scriptUrl);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT.API_REQUEST);

  if (CONFIG.DEBUG) console.log('[API]', `→ GET ${action}`, params);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, data: null, error: `${STRINGS.errors.serverError} (HTTP ${response.status})` };
    }

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return { success: false, data: null, error: STRINGS.errors.serverError }; }

    if (CONFIG.DEBUG) console.log('[API]', `← GET ${action}`, data);
    return data;

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, data: null, error: STRINGS.errors.timeout };
    }
    if (CONFIG.DEBUG) console.log('[API]', `✕ GET ${action}`, err.message);
    return { success: false, data: null, error: STRINGS.errors.network };
  }
}

/**
 * Submits a vote with offline fallback.
 * If the network request fails (connection error), the payload is queued in localStorage
 * and will be automatically submitted when connectivity is restored.
 *
 * @param {object} votePayload - Complete submitVote payload
 * @returns {Promise<{success: boolean, data: any, error: string|null, offline?: boolean}>}
 */
export async function requestWithOfflineSupport(votePayload) {
  try {
    const result = await request('submitVote', votePayload);
    if (result.success) return result;

    // If the server explicitly rejected the vote (duplicate, expired token, etc.)
    // do NOT queue it — return the server error directly.
    if (result.error && result.error !== STRINGS.errors.network && result.error !== STRINGS.errors.timeout) {
      return result;
    }

    // Network-class error: queue for later
    addToQueue('submitVote', votePayload);
    return { success: true, data: null, error: null, offline: true };

  } catch {
    addToQueue('submitVote', votePayload);
    return { success: true, data: null, error: null, offline: true };
  }
}

/* ============================================================
   AUTH
   ============================================================ */

/**
 * Validates a judge's magic-link token.
 * Returns full judge profile on success.
 * @param {string} token
 * @returns {Promise<{success: boolean, data: {judgeId: string, judgeName: string, assignedTrack: string, assignedPresenters: string[], expiresAt: string}|null, error: string|null}>}
 */
export async function validateToken(token) {
  return request('validateToken', { token });
}

/**
 * Presenter self check-in. No admin token required — public endpoint.
 * @param {string} name  - Presenter's full name
 * @param {string} email - Presenter's email address
 * @returns {Promise<{success: boolean, data: {presenterName: string, alreadyCheckedIn: boolean}|null, error: string|null}>}
 */
/**
 * Step 1 of self check-in: look up a presenter by email.
 * Uses GET to avoid the Apps Script POST→GET redirect issue.
 * No admin token required.
 * @param {string} email
 */
export async function lookupPresenterForCheckin(email) {
  return requestGet('lookupPresenterForCheckin', { email });
}

/**
 * Step 2 of self check-in: confirm and mark as checked in.
 * Uses GET to avoid the Apps Script POST→GET redirect issue.
 * No admin token required.
 * @param {string} presenterId
 * @param {string} email
 */
export async function selfCheckIn(presenterId, email) {
  return requestGet('selfCheckIn', { presenterId, email });
}

/**
 * Validates an admin session token (server-side check).
 * @param {string} sessionToken
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function validateAdminSession(sessionToken) {
  return request('validateAdminSession', { sessionToken });
}

/* ============================================================
   SETUP — first-run initialisation (no token required)
   ============================================================ */

/**
 * Initialises a new event. Called by the setup wizard on first run.
 * Requires NO admin token — this is the bootstrap call that creates the
 * admin password hash and writes all initial settings in one atomic step.
 *
 * @param {object} params
 * @param {string} params.eventName
 * @param {string} params.eventDate
 * @param {string} params.adminPasswordHash - SHA-256 hex of the chosen password
 * @param {string} params.adminEmail
 * @param {object} params.settings - All remaining settings (rubric, weights, etc.)
 * @returns {Promise<{success: boolean, data: null, error: string|null}>}
 */
export async function initializeEvent({ eventName, eventDate, adminPasswordHash, adminEmail, settings }) {
  return request('initializeEvent', {
    eventName,
    eventDate,
    adminPasswordHash,
    adminEmail,
    settings,
  });
}

/* ============================================================
   SETTINGS
   ============================================================ */

/**
 * Returns all event settings (public fields included).
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function getSettings() {
  return request('getSettings');
}

/**
 * Bulk-updates event settings. Requires admin token.
 * @param {object} updates - Key/value pairs to update
 * @param {string} adminToken
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function updateSettings(updates, adminToken) {
  return request('updateSettings', { updates, adminToken });
}

/* ============================================================
   PRESENTERS
   ============================================================ */

/**
 * Returns all active presenters.
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getAllPresenters() {
  return request('getAllPresenters');
}

/**
 * Adds a new presenter. Requires admin token.
 * @param {object} data
 * @param {string} adminToken
 */
export async function addPresenter(data, adminToken) {
  return request('addPresenter', { data, adminToken });
}

/**
 * Edits an existing presenter. Requires admin token.
 * @param {string} id
 * @param {object} data
 * @param {string} adminToken
 */
export async function editPresenter(id, data, adminToken) {
  return request('editPresenter', { id, data, adminToken });
}

/**
 * Soft-deletes a presenter (sets Active = FALSE). Requires admin token.
 * @param {string} id
 * @param {string} adminToken
 */
export async function deletePresenter(id, adminToken) {
  return request('deletePresenter', { id, adminToken });
}

/**
 * Bulk-imports presenters from a CSV string. Requires admin token.
 * @param {string} csvData
 * @param {string} adminToken
 */
export async function importPresenters(csvData, adminToken) {
  return request('importPresenters', { csvData, adminToken });
}

/**
 * Marks a presenter as checked in. Requires admin token.
 * @param {string} id
 * @param {string} adminToken
 */
export async function checkInPresenter(id, adminToken) {
  return request('checkInPresenter', { id, adminToken });
}

/* ============================================================
   JUDGES
   ============================================================ */

/**
 * Returns all judges (without tokens). Requires admin token.
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getAllJudges() {
  return request('getAllJudges');
}

/**
 * Adds a new judge. Requires admin token.
 * @param {object} data - { name, email, assignedTrack?, assignedPresenters? }
 * @param {string} adminToken
 */
export async function addJudge(data, adminToken) {
  return request('addJudge', { data, adminToken });
}

/**
 * Edits a judge record. Requires admin token.
 * @param {string} id
 * @param {object} data
 * @param {string} adminToken
 */
export async function editJudge(id, data, adminToken) {
  return request('editJudge', { id, data, adminToken });
}

/**
 * Soft-deletes a judge. Requires admin token.
 * @param {string} id
 * @param {string} adminToken
 */
export async function deleteJudge(id, adminToken) {
  return request('deleteJudge', { id, adminToken });
}

/**
 * Sends a magic-link invitation email to a judge. Requires admin token.
 * @param {string} judgeId
 * @param {string} adminToken
 */
export async function sendInvitation(judgeId, adminToken) {
  return request('sendInvitation', { judgeId, adminToken });
}

/**
 * Sends invitations to multiple judges. Requires admin token.
 * @param {string[]} judgeIds
 * @param {string} adminToken
 */
export async function sendBulkInvitations(judgeIds, adminToken) {
  return request('sendBulkInvitations', { judgeIds, adminToken });
}

/**
 * Regenerates and resends a judge's magic link. Requires admin token.
 * @param {string} judgeId
 * @param {string} adminToken
 */
export async function resendInvitation(judgeId, adminToken) {
  return request('resendInvitation', { judgeId, adminToken });
}

/**
 * Returns completion stats for all judges.
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getAllJudgeProgress() {
  return request('getAllJudgeProgress');
}

/**
 * Sends a "X presenters remaining" reminder to a judge. Requires admin token.
 * @param {string} judgeId
 * @param {string} adminToken
 */
export async function sendReminder(judgeId, adminToken) {
  return request('sendReminder', { judgeId, adminToken });
}

/**
 * Sends reminders to all judges who have not completed their assignments.
 * @param {string} adminToken
 */
export async function sendBulkReminders(adminToken) {
  return request('sendBulkReminders', { adminToken });
}

/* ============================================================
   TRACKS
   ============================================================ */

/**
 * Returns all active tracks.
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getAllTracks() {
  return request('getAllTracks');
}

/**
 * Adds a new track. Requires admin token.
 * @param {object} data - { name, description, color }
 * @param {string} adminToken
 */
export async function addTrack(data, adminToken) {
  return request('addTrack', { data, adminToken });
}

/**
 * Edits an existing track. Requires admin token.
 * @param {string} id
 * @param {object} data
 * @param {string} adminToken
 */
export async function editTrack(id, data, adminToken) {
  return request('editTrack', { id, data, adminToken });
}

/**
 * Deletes a track. Requires admin token.
 * @param {string} id
 * @param {string} adminToken
 */
export async function deleteTrack(id, adminToken) {
  return request('deleteTrack', { id, adminToken });
}

/* ============================================================
   VOTES
   ============================================================ */

/**
 * Submits a judge or audience vote.
 * For offline support use requestWithOfflineSupport() instead.
 *
 * @param {{presenterID: string, voterType: string, voterID: string, voterName: string, scores: Array, sessionToken: string, honeypot?: string}} votePayload
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function submitVote(votePayload) {
  return request('submitVote', votePayload);
}

/**
 * Returns aggregate voting statistics. Requires admin token.
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function getVotingStats() {
  return request('getVotingStats');
}

/**
 * Deletes a specific vote by ID. Requires admin token.
 * @param {string} voteId
 * @param {string} adminToken
 */
export async function deleteVote(voteId, adminToken) {
  return request('deleteVote', { voteId, adminToken });
}

/**
 * Returns all votes (for export). Requires admin token.
 * @param {string} adminToken
 */
export async function getAllVotes(adminToken) {
  return request('getAllVotes', { adminToken });
}

/* ============================================================
   RESULTS
   ============================================================ */

/**
 * Triggers a full recalculation of the Results tab.
 * Should be called before reading leaderboard data.
 * @returns {Promise<{success: boolean, data: any, error: string|null}>}
 */
export async function refreshResults() {
  return request('refreshResults');
}

/**
 * Returns the ranked leaderboard, optionally filtered by track.
 * @param {string} [trackId] - Omit for overall leaderboard
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getLeaderboard(trackId) {
  return request('getLeaderboard', { trackId: trackId || null });
}

/**
 * Returns overall top 3 and per-track winners.
 * @returns {Promise<{success: boolean, data: {overall: Array, byTrack: object}, error: string|null}>}
 */
export async function getWinners() {
  return request('getWinners');
}

/* ============================================================
   REPORTS
   ============================================================ */

/**
 * Returns all data for the judge quality statistical report.
 * Requires admin token.
 * @param {string} adminToken
 */
export async function getJudgeQualityReport(adminToken) {
  return request('getJudgeQualityReport', { adminToken });
}

/**
 * Returns all data needed to generate a competitor's PDF scorecard.
 * Requires admin token.
 * @param {string} presenterId
 * @param {string} adminToken
 */
export async function getCompetitorScorecardData(presenterId, adminToken) {
  return request('getCompetitorScorecardData', { presenterId, adminToken });
}

/**
 * Returns complete event statistics for the event summary report.
 * Requires admin token.
 * @param {string} adminToken
 */
export async function getEventSummaryData(adminToken) {
  return request('getEventSummaryData', { adminToken });
}

/* ============================================================
   TEMPLATES
   ============================================================ */

/**
 * Returns all saved event templates.
 * @returns {Promise<{success: boolean, data: Array, error: string|null}>}
 */
export async function getAllTemplates() {
  return request('getAllTemplates');
}

/**
 * Saves the current event configuration as a reusable template.
 * Requires admin token.
 * @param {string} name
 * @param {string} description
 * @param {string} adminToken
 */
export async function saveAsTemplate(name, description, adminToken) {
  return request('saveAsTemplate', { name, description, adminToken });
}

/**
 * Loads a template and applies it to the current event settings.
 * Requires admin token.
 * @param {string} templateId
 * @param {string} adminToken
 */
export async function loadTemplate(templateId, adminToken) {
  return request('loadTemplate', { templateId, adminToken });
}

/**
 * Deletes a template. Requires admin token.
 * @param {string} templateId
 * @param {string} adminToken
 */
export async function deleteTemplate(templateId, adminToken) {
  return request('deleteTemplate', { templateId, adminToken });
}

/* ============================================================
   CHECKIN
   ============================================================ */

/**
 * Marks a presenter as checked in. Requires admin token.
 * @param {string} id
 * @param {string} adminToken
 */
export async function bulkCheckIn(ids, adminToken) {
  return request('bulkCheckIn', { ids, adminToken });
}

/**
 * Marks a presenter as absent. Requires admin token.
 * @param {string} id
 * @param {string} adminToken
 */
export async function markAbsent(id, adminToken) {
  return request('markAbsent', { id, adminToken });
}

/**
 * Returns check-in status summary.
 * @returns {Promise<{success: boolean, data: {checkedIn: number, total: number}, error: string|null}>}
 */
export async function getCheckinStatus() {
  return request('getCheckinStatus');
}

/* ============================================================
   CONNECTION TEST
   ============================================================ */

/**
 * Pings the backend with a lightweight settings request to verify connectivity.
 * Used by the setup wizard's "Test Connection" button.
 * @returns {Promise<{success: boolean, latencyMs: number, error: string|null}>}
 */
export async function testConnection() {
  const start = Date.now();
  const result = await getSettings();
  const latencyMs = Date.now() - start;
  if (result.success) {
    return { success: true, latencyMs, error: null };
  }
  return { success: false, latencyMs, error: result.error };
}

/**
 * Syncs all offline-queued votes using this module's request() function.
 * Called by initOfflineDetection's auto-sync callback and the UI sync button.
 * Registers request() with offline.js so syncQueue() can call it back.
 *
 * @returns {Promise<{synced: number, failed: number, total: number}>}
 */
export async function syncOfflineQueue() {
  const { syncQueue } = await import('./offline.js');
  return syncQueue(request);
}
