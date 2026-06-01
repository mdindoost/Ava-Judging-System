/**
 * Settings.gs — Ava Judging System
 * Full CRUD for the Settings sheet tab.
 * Every key-value pair in the Settings tab is managed here.
 */

// ============================================================
// DEFAULT SETTINGS
// ============================================================

var DEFAULT_SETTINGS = {
  eventName:              'New Event',
  eventDate:              '',
  eventDescription:       '',
  scoringMode:            'judges_only',
  judgeWeight:            '75',
  audienceWeight:         '25',
  votingStatus:           'closed',
  rubricMode:             'single',
  rubricCategories:       JSON.stringify([
    { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0, allowComments: true,
      description: 'Overall score for the presentation.' }
  ]),
  tracksEnabled:          'false',
  tiebreakerRule:         'judge_avg',
  publicLeaderboard:      'false',
  selfVotePrevention:     'true',
  audienceVotingEnabled:  'false',
  maxAudienceScore:       '25',
  maxJudgeScore:          '25',
  allowDecimalScores:     'true',
  multiDayEvent:          'false',
  currentDay:             '1',
  adminPasswordHash:      '',
  superAdminEmail:        '',
  judgeInactivityMinutes: '30',
  notifyOnInactivity:     'true',
  notifyOnCompletion:     'true',
  notifyOnReminder:       'true',
  notifyPresenterResults: 'false',
  createdAt:              '',
  lastModified:           '',
};

// ============================================================
// READ
// ============================================================

/**
 * Returns all settings as a plain object { key: value }.
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getSettings() {
  try {
    var sheet    = getSheet(SHEET_NAMES.SETTINGS);
    var lastRow  = sheet.getLastRow();
    var settings = {};

    if (lastRow >= 2) {
      var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      data.forEach(function(row) {
        var key = str(row[0]);
        if (key) settings[key] = str(row[1]);
      });
    }

    // Fill in any missing defaults
    Object.keys(DEFAULT_SETTINGS).forEach(function(key) {
      if (!(key in settings)) settings[key] = DEFAULT_SETTINGS[key];
    });

    return { success: true, data: settings, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns the public-safe subset of settings (no admin password hash).
 * Used by doGet for unauthenticated access.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function getPublicSettings() {
  try {
    var result = getSettings();
    if (!result.success) return errorResponse(result.error);

    var pub = Object.assign({}, result.data);
    delete pub.adminPasswordHash;
    delete pub.superAdminEmail;

    return jsonResponse(pub);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Returns a single setting value by key.
 * @param {string} key
 * @returns {string} The value, or '' if not found.
 */
function getSetting(key) {
  try {
    var found = findRowByColumn(SHEET_NAMES.SETTINGS, 'Key', key);
    if (!found) return DEFAULT_SETTINGS[key] || '';
    return str(found.data.Value);
  } catch (e) {
    return DEFAULT_SETTINGS[key] || '';
  }
}

// ============================================================
// WRITE
// ============================================================

/**
 * Updates a single setting key-value pair.
 * @param {string} key
 * @param {string} value
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function updateSetting(key, value, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    _writeSetting(key, String(value));

    updateRow(SHEET_NAMES.SETTINGS,
      findRowByColumn(SHEET_NAMES.SETTINGS, 'Key', 'lastModified').rowIndex,
      { Value: nowISO() });

    logAudit('admin', 'admin', 'SETTINGS_CHANGED', 'settings', key,
      { key: key, newValue: value }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Bulk-updates multiple settings keys.
 * @param {object} updates - { key: value, ... }
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function updateSettings(updates, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!updates || typeof updates !== 'object') {
      return { success: false, data: null, error: 'No updates provided.' };
    }

    var validation = validateSettings(updates);
    if (!validation.valid) {
      return { success: false, data: null, error: validation.error };
    }

    Object.keys(updates).forEach(function(key) {
      _writeSetting(key, String(updates[key]));
    });
    _writeSetting('lastModified', nowISO());

    logAudit('admin', 'admin', 'SETTINGS_CHANGED', 'settings', 'bulk',
      { keys: Object.keys(updates) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Internal helper — upserts a key-value pair in the Settings sheet.
 * @param {string} key
 * @param {string} value
 * @private
 */
function _writeSetting(key, value) {
  var found = findRowByColumn(SHEET_NAMES.SETTINGS, 'Key', key);
  if (found) {
    updateRow(SHEET_NAMES.SETTINGS, found.rowIndex, { Value: value });
  } else {
    appendRow(SHEET_NAMES.SETTINGS, { Key: key, Value: value, Notes: '' }, COLUMNS.SETTINGS);
  }
}

// ============================================================
// INITIALISE
// ============================================================

/**
 * Writes all default settings into the Settings sheet.
 * Called by the setup wizard on first run.
 * @param {string} eventName
 * @param {string} eventDate  - ISO date string e.g. '2026-04-15'
 * @param {string} adminPasswordHash - SHA-256 hash of the admin password
 * @param {string} adminEmail
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function initializeDefaultSettings(eventName, eventDate, adminPasswordHash, adminEmail, extraSettings) {
  try {
    initializeSheets();

    // Merge: defaults → caller-provided extra → required fields (always win)
    var settings = Object.assign({}, DEFAULT_SETTINGS, extraSettings || {}, {
      eventName:         str(eventName)         || 'New Event',
      eventDate:         str(eventDate)         || '',
      adminPasswordHash: str(adminPasswordHash) || '',
      superAdminEmail:   str(adminEmail)        || '',
      votingStatus:      'paused',
      createdAt:         nowISO(),
      lastModified:      nowISO(),
    });

    Object.keys(settings).forEach(function(key) {
      _writeSetting(key, String(settings[key]));
    });

    logAudit('system', 'system', 'SETTINGS_CHANGED', 'settings', 'initialize',
      { eventName: settings.eventName }, null);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validates a settings update object.
 * Checks weight sum, required fields, score ranges.
 * @param {object} settings - Partial or full settings object.
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateSettings(settings) {
  if (!settings) return { valid: true, error: null };

  // Judge + audience weights must sum to 100 when both are present
  var hasJW = 'judgeWeight'    in settings;
  var hasAW = 'audienceWeight' in settings;
  if (hasJW && hasAW) {
    var jw = parseInt(settings.judgeWeight, 10);
    var aw = parseInt(settings.audienceWeight, 10);
    if (isNaN(jw) || isNaN(aw) || jw + aw !== 100) {
      return { valid: false, error: 'Judge weight and audience weight must add up to 100%.' };
    }
    if (jw < 0 || jw > 100 || aw < 0 || aw > 100) {
      return { valid: false, error: 'Weights must each be between 0 and 100.' };
    }
  }

  // Max scores must be positive integers
  ['maxJudgeScore', 'maxAudienceScore'].forEach(function(key) {
    if (key in settings) {
      var v = parseInt(settings[key], 10);
      if (isNaN(v) || v < 1) {
        return { valid: false, error: key + ' must be a positive number.' };
      }
    }
  });

  // Validate rubric categories JSON if provided
  if ('rubricCategories' in settings) {
    var cats = parseJSON(settings.rubricCategories, null);
    if (!Array.isArray(cats)) {
      return { valid: false, error: 'rubricCategories must be a valid JSON array.' };
    }
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      if (!cat.id || !cat.name) {
        return { valid: false, error: 'Each rubric category must have an id and name.' };
      }
      if (typeof cat.maxScore !== 'number' || cat.maxScore < 1) {
        return { valid: false, error: 'Rubric category "' + cat.name + '" must have a maxScore >= 1.' };
      }
    }
  }

  // Voting status must be a known value
  if ('votingStatus' in settings) {
    if (!['open', 'paused', 'closed'].includes(str(settings.votingStatus))) {
      return { valid: false, error: 'votingStatus must be open, paused, or closed.' };
    }
  }

  return { valid: true, error: null };
}

// ============================================================
// VOTING STATUS CONTROL
// ============================================================

/**
 * Opens voting.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function openVoting(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    _writeSetting('votingStatus', 'open');
    _writeSetting('lastModified', nowISO());
    logAudit('admin', 'admin', 'VOTING_OPENED', 'settings', 'votingStatus', {}, adminToken);
    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Pauses voting.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function pauseVoting(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    _writeSetting('votingStatus', 'paused');
    _writeSetting('lastModified', nowISO());
    logAudit('admin', 'admin', 'VOTING_PAUSED', 'settings', 'votingStatus', {}, adminToken);
    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Closes voting.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function closeVoting(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    _writeSetting('votingStatus', 'closed');
    _writeSetting('lastModified', nowISO());
    logAudit('admin', 'admin', 'VOTING_CLOSED', 'settings', 'votingStatus', {}, adminToken);
    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}
