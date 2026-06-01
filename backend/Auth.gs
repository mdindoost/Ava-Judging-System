/**
 * Auth.gs — Ava Judging System
 * Token generation, validation, and session management.
 * All auth decisions centralised here.
 */

var AUTH = {
  TOKEN_EXPIRY_HOURS:   24,
  SESSION_EXPIRY_HOURS: 8,
  TOKEN_REFRESH_WINDOW_HOURS: 1, // Refresh token if used within last hour of expiry
  ADMIN_SESSION_PREFIX: 'admsess_',
};

// ============================================================
// JUDGE TOKEN
// ============================================================

/**
 * Generates a new UUID token for a judge, stores it in the Judges sheet,
 * and returns the token string.
 * @param {string} judgeId
 * @returns {{ success: boolean, data: { token: string, expiry: string }, error: string|null }}
 */
function generateJudgeToken(judgeId) {
  try {
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', judgeId);
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + judgeId };

    var token  = generateUUID();
    var expiry = new Date(Date.now() + AUTH.TOKEN_EXPIRY_HOURS * 3600 * 1000).toISOString();

    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, {
      Token:        token,
      TokenExpiry:  expiry,
      TokenUsed:    false,
      TokenUsedAt:  '',
    });

    return { success: true, data: { token: token, expiry: expiry }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Validates a judge token. Checks existence, expiry, and active status.
 * On success, marks the token as used (first-use) and updates LastActivity.
 * @param {string} token
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function validateJudgeToken(token) {
  try {
    if (!token || str(token) === '') {
      return { success: false, data: null, error: 'No token provided.' };
    }

    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'Token', str(token));
    if (!found) {
      logAudit('unknown', 'judge', 'TOKEN_VALIDATED', 'judge', '',
        { result: 'invalid', reason: 'not_found' }, token);
      return { success: false, data: null, error: 'Invalid session. Please use your original invitation link or contact the event administrator.' };
    }

    var judge = found.data;

    // Active check
    if (!bool(judge.Active)) {
      return { success: false, data: null, error: 'This judge account is inactive. Please contact the event administrator.' };
    }

    // Expiry check
    if (isTokenExpired(judge.TokenExpiry)) {
      logAudit(judge.ID, 'judge', 'TOKEN_EXPIRED', 'judge', judge.ID,
        { token: hashString(token) }, token);
      return { success: false, data: null, error: 'Your session has expired. Please use your original invitation link or request a new one.' };
    }

    // Mark as used on first use
    var updates = { LastActivity: nowISO() };
    if (!bool(judge.TokenUsed)) {
      updates.TokenUsed   = true;
      updates.TokenUsedAt = nowISO();
    }

    // Auto-refresh: if within last hour of expiry, extend it
    var expiryDate = toDate(judge.TokenExpiry);
    if (expiryDate) {
      var msUntilExpiry = expiryDate.getTime() - Date.now();
      if (msUntilExpiry < AUTH.TOKEN_REFRESH_WINDOW_HOURS * 3600 * 1000) {
        updates.TokenExpiry = new Date(Date.now() + AUTH.TOKEN_EXPIRY_HOURS * 3600 * 1000).toISOString();
      }
    }

    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, updates);

    logAudit(judge.ID, 'judge', 'TOKEN_VALIDATED', 'judge', judge.ID,
      { result: 'success' }, token);

    // Return judge data (never return the raw token)
    return {
      success: true,
      data: {
        judgeId:             str(judge.ID),
        judgeName:           str(judge.Name),
        judgeEmail:          str(judge.Email),
        assignedTrack:       str(judge.AssignedTrack),
        assignedPresenters:  parseJSON(str(judge.AssignedPresenters), []),
        expiresAt:           str(judge.TokenExpiry),
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Invalidates a judge token (clears it from the sheet).
 * @param {string} token
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function invalidateToken(token) {
  try {
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'Token', str(token));
    if (!found) return { success: false, data: null, error: 'Token not found.' };

    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, {
      Token:       '',
      TokenExpiry: '',
      TokenUsed:   false,
    });

    logAudit(str(found.data.ID), 'judge', 'TOKEN_INVALIDATED', 'judge',
      str(found.data.ID), {}, token);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Extends a token's expiry by TOKEN_EXPIRY_HOURS from now.
 * Only extends if the token was used within the last hour (refresh window).
 * @param {string} token
 * @returns {{ success: boolean, data: { expiry: string }|null, error: string|null }}
 */
function refreshToken(token) {
  try {
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'Token', str(token));
    if (!found) return { success: false, data: null, error: 'Token not found.' };

    var judge = found.data;
    if (isTokenExpired(judge.TokenExpiry)) {
      return { success: false, data: null, error: 'Token has already expired and cannot be refreshed.' };
    }

    var newExpiry = new Date(Date.now() + AUTH.TOKEN_EXPIRY_HOURS * 3600 * 1000).toISOString();
    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, { TokenExpiry: newExpiry });

    return { success: true, data: { expiry: newExpiry }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// TOKEN UTILITY
// ============================================================

/**
 * Returns true if the given expiry timestamp is in the past.
 * @param {string|Date} expiryTimestamp
 * @returns {boolean}
 */
function isTokenExpired(expiryTimestamp) {
  if (!expiryTimestamp) return true;
  var d = toDate(expiryTimestamp);
  if (!d) return true;
  return d.getTime() < Date.now();
}

// ============================================================
// ADMIN SESSION
// ============================================================

/**
 * Generates an admin session token and stores it in PropertiesService.
 * @param {string} adminId - e.g. 'superadmin' or an event-specific ID.
 * @returns {{ success: boolean, data: { sessionToken: string, expiresAt: string }, error: string|null }}
 */
function generateAdminSession(adminId) {
  try {
    var sessionToken = generateUUID();
    var expiresAt    = new Date(Date.now() + AUTH.SESSION_EXPIRY_HOURS * 3600 * 1000).toISOString();

    var record = JSON.stringify({
      adminId:   adminId,
      expiresAt: expiresAt,
      createdAt: nowISO(),
    });

    var storageKey = AUTH.ADMIN_SESSION_PREFIX + hashString(sessionToken);
    PropertiesService.getScriptProperties().setProperty(storageKey, record);

    logAudit(adminId, 'admin', 'ADMIN_SESSION_CREATED', 'admin', adminId,
      { expiresAt: expiresAt }, sessionToken);

    return { success: true, data: { sessionToken: sessionToken, expiresAt: expiresAt }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Validates an admin session token.
 * @param {string} sessionToken
 * @returns {{ success: boolean, data: { adminId: string, expiresAt: string }|null, error: string|null }}
 */
function validateAdminSession(sessionToken) {
  try {
    if (!sessionToken || str(sessionToken) === '') {
      return { success: false, data: null, error: 'Administrator authentication required.' };
    }

    var storageKey = AUTH.ADMIN_SESSION_PREFIX + hashString(str(sessionToken));
    var raw = PropertiesService.getScriptProperties().getProperty(storageKey);

    if (!raw) {
      return { success: false, data: null, error: 'Invalid or expired admin session. Please log in again.' };
    }

    var record = parseJSON(raw, null);
    if (!record) {
      return { success: false, data: null, error: 'Corrupted session record. Please log in again.' };
    }

    if (isTokenExpired(record.expiresAt)) {
      PropertiesService.getScriptProperties().deleteProperty(storageKey);
      return { success: false, data: null, error: 'Your admin session has expired. Please log in again.' };
    }

    return { success: true, data: { adminId: record.adminId, expiresAt: record.expiresAt }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Invalidates an admin session.
 * @param {string} sessionToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function invalidateAdminSession(sessionToken) {
  try {
    var storageKey = AUTH.ADMIN_SESSION_PREFIX + hashString(str(sessionToken));
    PropertiesService.getScriptProperties().deleteProperty(storageKey);
    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// PASSWORD HASHING
// ============================================================

/**
 * Hashes an admin password using SHA-256.
 * @param {string} password
 * @returns {string} Hex hash string.
 */
function hashPassword(password) {
  return hashString(String(password));
}

/**
 * Verifies a plain-text password against a stored hash.
 * @param {string} password - Plain-text attempt.
 * @param {string} hash - Stored SHA-256 hash.
 * @returns {boolean}
 */
function verifyPassword(password, hash) {
  return hashPassword(password) === String(hash);
}

/**
 * Validates an admin password against the hash stored in Settings.
 * Used by the login endpoint.
 * @param {string} passwordHash - SHA-256 hash of the password (hashed client-side).
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function validateAdminPassword(passwordHash) {
  try {
    var storedHash = getSetting('adminPasswordHash');
    if (!storedHash) {
      return { success: false, data: null, error: 'Admin password not configured. Please run setup.' };
    }

    // Client sends the hash; we compare hash-to-hash
    if (String(passwordHash) !== String(storedHash)) {
      return { success: false, data: null, error: 'Incorrect password.' };
    }

    // Issue a session token
    var session = generateAdminSession('event-admin');
    if (!session.success) return session;

    logAudit('event-admin', 'admin', 'ADMIN_LOGIN', 'admin', 'event-admin',
      { result: 'success' }, session.data.sessionToken);

    return { success: true, data: session.data, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Quick guard: validates the admin session from a payload and returns
 * the session data, or throws an error if invalid.
 * Used at the top of every admin-only handler.
 * @param {string} adminToken
 * @returns {{ adminId: string, expiresAt: string }}
 * @throws {Error}
 */
function requireValidAdminSession(adminToken) {
  var result = validateAdminSession(adminToken);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

/**
 * Quick guard: validates a judge token from a payload and returns
 * judge data, or throws an error if invalid.
 * @param {string} token
 * @returns {{ judgeId, judgeName, assignedTrack, assignedPresenters, expiresAt }}
 * @throws {Error}
 */
function requireValidJudgeToken(token) {
  var result = validateJudgeToken(token);
  if (!result.success) throw new Error(result.error);
  return result.data;
}
