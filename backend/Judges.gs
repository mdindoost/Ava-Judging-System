/**
 * Judges.gs — Ava Judging System
 * Full CRUD for the Judges sheet tab, plus invitation and progress tracking.
 */

// ============================================================
// READ
// ============================================================

/**
 * Returns all judges without exposing raw tokens.
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllJudges() {
  try {
    var rows = getAllRows(SHEET_NAMES.JUDGES, COLUMNS.JUDGES);
    var result = rows
      .filter(function(r) { return bool(r.Active); })
      .map(function(r) { return _mapJudge(r); });
    return { success: true, data: result, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns a single judge by ID (without token).
 * @param {string} id
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function getJudge(id) {
  try {
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + id };
    return { success: true, data: _mapJudge(found.data), error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// WRITE
// ============================================================

/**
 * Adds a new judge.
 * @param {object} data - { Name, Email, AssignedTrack?, AssignedPresenters? }
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { id: string }, error: string|null }}
 */
function addJudge(data, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!data || !str(data.Name))  return { success: false, data: null, error: 'Judge Name is required.' };
    if (!str(data.Email))           return { success: false, data: null, error: 'Judge Email is required.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(data.Email))) {
      return { success: false, data: null, error: 'Please enter a valid email address.' };
    }

    // Duplicate email check
    var existingRows = getAllRows(SHEET_NAMES.JUDGES, COLUMNS.JUDGES);
    var dupEmail = existingRows.find(function(r) {
      return bool(r.Active) && str(r.Email).toLowerCase() === str(data.Email).toLowerCase();
    });
    if (dupEmail) return { success: false, data: null, error: 'A judge with this email address already exists.' };

    var existingIds = existingRows.map(function(r) { return str(r.ID); });
    var newId       = generateID('J', existingIds);

    var assignedPresenters = data.AssignedPresenters
      ? (Array.isArray(data.AssignedPresenters)
          ? JSON.stringify(data.AssignedPresenters)
          : str(data.AssignedPresenters))
      : '[]';

    var row = {
      ID:                 newId,
      Name:               str(data.Name),
      Email:              str(data.Email),
      Token:              '',
      TokenExpiry:        '',
      TokenUsed:          false,
      TokenUsedAt:        '',
      AssignedTrack:      str(data.AssignedTrack),
      AssignedPresenters: assignedPresenters,
      Active:             true,
      CreatedAt:          nowISO(),
      LastActivity:       '',
    };

    appendRow(SHEET_NAMES.JUDGES, row, COLUMNS.JUDGES);

    logAudit('admin', 'admin', 'JUDGE_ADDED', 'judge', newId,
      { name: row.Name, email: row.Email }, adminToken);

    return { success: true, data: { id: newId }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Edits an existing judge's fields.
 * @param {string} id
 * @param {object} data
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function editJudge(id, data, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + id };

    var updates = {};
    if (data.Name  !== undefined) updates.Name  = str(data.Name);
    if (data.Email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(data.Email))) {
        return { success: false, data: null, error: 'Please enter a valid email address.' };
      }
      updates.Email = str(data.Email);
    }
    if (data.AssignedTrack !== undefined) updates.AssignedTrack = str(data.AssignedTrack);
    if (data.AssignedPresenters !== undefined) {
      updates.AssignedPresenters = Array.isArray(data.AssignedPresenters)
        ? JSON.stringify(data.AssignedPresenters)
        : str(data.AssignedPresenters);
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, data: null, error: 'No fields to update.' };
    }

    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, updates);

    logAudit('admin', 'admin', 'JUDGE_EDITED', 'judge', str(id),
      { updates: Object.keys(updates) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Soft-deletes a judge (sets Active = FALSE).
 * Their submitted votes are preserved.
 * @param {string} id
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function deleteJudge(id, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + id };

    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, { Active: false });

    logAudit('admin', 'admin', 'JUDGE_DELETED', 'judge', str(id),
      { name: str(found.data.Name) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INVITATION SYSTEM
// ============================================================

/**
 * Generates a token for the judge, sends the magic link email.
 * @param {string} judgeId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { email: string }, error: string|null }}
 */
function sendInvitation(judgeId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(judgeId));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + judgeId };
    if (!bool(found.data.Active)) {
      return { success: false, data: null, error: 'Cannot invite an inactive judge.' };
    }

    var tokenResult = generateJudgeToken(judgeId);
    if (!tokenResult.success) return tokenResult;

    var eventName = getSetting('eventName') || 'Event';
    sendMagicLink(str(found.data.Email), str(found.data.Name),
                  tokenResult.data.token, eventName);

    logAudit('admin', 'admin', 'JUDGE_INVITED', 'judge', judgeId,
      { email: str(found.data.Email) }, adminToken);

    return { success: true, data: { email: str(found.data.Email) }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Sends invitations to multiple judges.
 * @param {string[]} judgeIds
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { sent: number, failed: number, errors: object[] }, error: string|null }}
 */
function sendBulkInvitations(judgeIds, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!Array.isArray(judgeIds) || judgeIds.length === 0) {
      return { success: false, data: null, error: 'No judge IDs provided.' };
    }

    var sent   = 0;
    var failed = 0;
    var errors = [];

    judgeIds.forEach(function(id) {
      var result = sendInvitation(id, adminToken);
      if (result.success) { sent++; }
      else { failed++; errors.push({ id: id, error: result.error }); }
    });

    return { success: true, data: { sent: sent, failed: failed, errors: errors }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Regenerates a judge's token and resends the invitation email.
 * @param {string} judgeId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { email: string }, error: string|null }}
 */
function resendInvitation(judgeId, adminToken) {
  return sendInvitation(judgeId, adminToken);
}

// ============================================================
// PROGRESS TRACKING
// ============================================================

/**
 * Returns progress for a single judge: how many presenters scored vs assigned.
 * @param {string} judgeId
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getJudgeProgress(judgeId) {
  try {
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(judgeId));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + judgeId };

    var judge = found.data;
    var assigned = _getAssignedPresenterIds(judge);
    var scoredResult = getVotesByJudge(judgeId);
    var scoredVotes  = scoredResult.success ? scoredResult.data : [];

    // Unique presenter IDs that this judge has scored
    var scoredIds = {};
    scoredVotes.forEach(function(v) { scoredIds[str(v.presenterID)] = true; });
    var scoredCount = Object.keys(scoredIds).length;

    var total = assigned.length === 0
      ? getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS)
          .filter(function(r) { return bool(r.Active); }).length
      : assigned.length;

    return {
      success: true,
      data: {
        judgeId:      str(judge.ID),
        judgeName:    str(judge.Name),
        judgeEmail:   str(judge.Email),
        assigned:     total,
        scored:       scoredCount,
        remaining:    Math.max(0, total - scoredCount),
        percentComplete: total > 0 ? Math.round((scoredCount / total) * 100) : 0,
        lastActivity: str(judge.LastActivity),
        isComplete:   scoredCount >= total && total > 0,
        assignedIds:  assigned,
        scoredIds:    Object.keys(scoredIds),
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns progress data for all active judges.
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllJudgeProgress() {
  try {
    var judges = getAllRows(SHEET_NAMES.JUDGES, COLUMNS.JUDGES)
      .filter(function(r) { return bool(r.Active); });

    var result = judges.map(function(judge) {
      var prog = getJudgeProgress(str(judge.ID));
      return prog.success ? prog.data : { judgeId: str(judge.ID), error: prog.error };
    });

    return { success: true, data: result, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// ASSIGNMENT
// ============================================================

/**
 * Assigns specific presenters to a judge (replaces existing assignment).
 * @param {string} judgeId
 * @param {string[]} presenterIds - Empty array means "all presenters".
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function assignPresenters(judgeId, presenterIds, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(judgeId));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + judgeId };

    var ids = Array.isArray(presenterIds) ? presenterIds : [];
    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, {
      AssignedPresenters: JSON.stringify(ids),
    });

    logAudit('admin', 'admin', 'JUDGE_EDITED', 'judge', judgeId,
      { action: 'assign_presenters', count: ids.length }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Assigns a track to a judge.
 * @param {string} judgeId
 * @param {string} trackId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function assignTrack(judgeId, trackId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(judgeId));
    if (!found) return { success: false, data: null, error: 'Judge not found: ' + judgeId };

    updateRow(SHEET_NAMES.JUDGES, found.rowIndex, { AssignedTrack: str(trackId) });

    logAudit('admin', 'admin', 'JUDGE_EDITED', 'judge', judgeId,
      { action: 'assign_track', trackId: trackId }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// REMINDERS
// ============================================================

/**
 * Sends a "you have X presenters remaining" reminder to a judge.
 * @param {string} judgeId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function sendReminder(judgeId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var prog = getJudgeProgress(judgeId);
    if (!prog.success) return prog;

    var found = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', str(judgeId));
    if (!found) return { success: false, data: null, error: 'Judge not found.' };

    var judge     = found.data;
    var eventName = getSetting('eventName') || 'Event';

    sendJudgeReminder(
      str(judge.Email),
      str(judge.Name),
      prog.data.remaining,
      prog.data.assigned,
      eventName
    );

    logAudit('admin', 'admin', 'JUDGE_REMINDER_SENT', 'judge', judgeId,
      { remaining: prog.data.remaining }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Sends reminders to all judges who have not yet completed their assignments.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { sent: number }, error: string|null }}
 */
function sendBulkReminders(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var allProgress = getAllJudgeProgress();
    if (!allProgress.success) return allProgress;

    var incomplete = allProgress.data.filter(function(p) { return !p.isComplete && p.remaining > 0; });
    var sent = 0;

    incomplete.forEach(function(p) {
      var result = sendReminder(p.judgeId, adminToken);
      if (result.success) sent++;
    });

    return { success: true, data: { sent: sent }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Returns the list of presenter IDs assigned to a judge.
 * Empty array means "all presenters".
 * @param {object} judgeRow - Raw row from Judges sheet.
 * @returns {string[]}
 * @private
 */
function _getAssignedPresenterIds(judgeRow) {
  var raw = str(judgeRow.AssignedPresenters);
  if (!raw || raw === '[]') return [];
  var parsed = parseJSON(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Maps a raw judge row to a public-safe shape (no token fields).
 * @param {object} row
 * @returns {object}
 * @private
 */
function _mapJudge(row) {
  return {
    ID:                 str(row.ID),
    Name:               str(row.Name),
    Email:              str(row.Email),
    // Token is never sent to the frontend for security.
    // TokenStatus and TokenUsed derived flags give the frontend what it needs.
    Token:              str(row.Token) ? '***' : '',
    TokenUsed:          bool(row.TokenUsed),
    TokenStatus:        _judgeTokenStatus(row),
    TokenExpiry:        str(row.TokenExpiry),
    AssignedTrack:      str(row.AssignedTrack),
    AssignedPresenters: parseJSON(str(row.AssignedPresenters), []),
    Active:             bool(row.Active),
    CreatedAt:          str(row.CreatedAt),
    LastActivity:       str(row.LastActivity),
  };
}

/**
 * Returns a human-readable token status string for a judge row.
 * @param {object} row
 * @returns {'not_invited'|'invited'|'logged_in'|'expired'}
 * @private
 */
function _judgeTokenStatus(row) {
  if (!str(row.Token)) return 'not_invited';
  if (bool(row.TokenUsed)) return 'logged_in';
  if (isTokenExpired(str(row.TokenExpiry))) return 'expired';
  return 'invited';
}
