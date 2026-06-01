/**
 * Utils.gs — Ava Judging System
 * Shared utility functions used by every other .gs file.
 * All functions are globally accessible within the Apps Script project.
 */

// ============================================================
// SHEET COLUMN DEFINITIONS
// Centralised here so every module uses the same column order.
// ============================================================

var SHEET_NAMES = {
  SETTINGS:   'Settings',
  PRESENTERS: 'Presenters',
  JUDGES:     'Judges',
  VOTES:      'Votes',
  RESULTS:    'Results',
  AUDIT_LOG:  'AuditLog',
  TRACKS:     'Tracks',
  TEMPLATES:  'Templates',
};

var COLUMNS = {
  SETTINGS:   ['Key', 'Value', 'Notes'],

  PRESENTERS: ['ID', 'Name', 'Department', 'Email', 'PosterNumber',
               'Track', 'CheckedIn', 'CheckInTime', 'Active', 'CreatedAt'],

  JUDGES:     ['ID', 'Name', 'Email', 'Token', 'TokenExpiry',
               'TokenUsed', 'TokenUsedAt', 'AssignedTrack',
               'AssignedPresenters', 'Active', 'CreatedAt', 'LastActivity'],

  VOTES:      ['VoteID', 'Timestamp', 'PresenterID', 'PresenterName',
               'VoterType', 'VoterID', 'VoterName', 'RubricCategoryID',
               'Score', 'Comment', 'SessionToken', 'EventDay', 'IPHash'],

  RESULTS:    ['PresenterID', 'Name', 'Department', 'Track',
               'JudgeAvg', 'AudienceAvg', 'FinalScore',
               'JudgeVoteCount', 'AudienceVoteCount', 'RubricBreakdown',
               'OverallRank', 'TrackRank', 'CheckedIn', 'Active'],

  AUDIT_LOG:  ['LogID', 'Timestamp', 'Actor', 'ActorType', 'Action',
               'EntityType', 'EntityID', 'Details', 'SessionToken', 'IPHash'],

  TRACKS:     ['TrackID', 'Name', 'Description', 'Color', 'Active'],

  TEMPLATES:  ['TemplateID', 'Name', 'Description', 'Config', 'CreatedAt', 'CreatedBy'],
};

// ============================================================
// SPREADSHEET ACCESS
// ============================================================

/**
 * Returns the active spreadsheet.
 * For container-bound scripts this always works.
 * Falls back to openById using script property SPREADSHEET_ID.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) { /* not container-bound */ }
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID not configured in Script Properties.');
  return SpreadsheetApp.openById(id);
}

/**
 * Returns a sheet by name, throwing a descriptive error if not found.
 * @param {string} name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(name) {
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found. Please run the setup wizard to initialize the spreadsheet.');
  return sheet;
}

// ============================================================
// UUID / ID GENERATION
// ============================================================

/**
 * Generates an RFC 4122 version 4 UUID.
 * Uses Utilities.getUuid() which is cryptographically random in GAS.
 * @returns {string} e.g. "550e8400-e29b-41d4-a716-446655440000"
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Generates a padded sequential ID with a prefix.
 * Scans existingIds to find the next available number.
 * @param {string} prefix - e.g. 'P' or 'J' or 'T'
 * @param {string[]} existingIds - Array of existing IDs to avoid collision.
 * @returns {string} e.g. 'P001', 'J012'
 */
function generateID(prefix, existingIds) {
  var existing = (existingIds || []).filter(function(id) {
    return id && String(id).toUpperCase().startsWith(prefix.toUpperCase());
  });

  var maxNum = 0;
  existing.forEach(function(id) {
    var num = parseInt(String(id).replace(/^[A-Za-z]+/, ''), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });

  var next = maxNum + 1;
  return prefix.toUpperCase() + String(next).padStart(3, '0');
}

// ============================================================
// CRYPTOGRAPHY
// ============================================================

/**
 * Computes SHA-256 hash of a string.
 * @param {string} str
 * @returns {string} Hex-encoded hash string.
 */
function hashString(str) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(str),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    var hex = (b & 0xff).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================================
// DATE / TIME
// ============================================================

/**
 * Returns the current UTC timestamp as an ISO 8601 string.
 * @returns {string} e.g. "2026-04-15T14:30:00.000Z"
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Returns a Date object from a value that may be a string, Date, or number.
 * @param {string|Date|number} val
 * @returns {Date|null}
 */
function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// JSON
// ============================================================

/**
 * Safe JSON.parse — returns fallback if parsing fails.
 * @param {string} str
 * @param {*} [fallback=null]
 * @returns {*}
 */
function parseJSON(str, fallback) {
  if (fallback === undefined) fallback = null;
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

// ============================================================
// SHEET ROW OPERATIONS
// ============================================================

/**
 * Returns the 1-based column index for a column name in a sheet.
 * Reads the first row (header) to find the column.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} columnName
 * @returns {number} 1-based column index, or -1 if not found.
 */
function getColumnIndex(sheet, columnName) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === columnName) return i + 1;
  }
  return -1;
}

/**
 * Ensures a sheet has a header row matching the expected columns.
 * If the sheet is empty, writes the header row.
 * @param {string} sheetName
 * @param {string[]} columns
 */
function ensureHeaders(sheetName, columns) {
  var sheet = getSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(columns);
    sheet.getRange(1, 1, 1, columns.length)
      .setFontWeight('bold')
      .setBackground('#1a365d')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

/**
 * Appends a new row to a sheet.
 * @param {string} sheetName
 * @param {object} rowObject - Key-value pairs matching column names.
 * @param {string[]} columnOrder - Ordered array of column names for that sheet.
 */
function appendRow(sheetName, rowObject, columnOrder) {
  var sheet = getSheet(sheetName);
  var row = columnOrder.map(function(col) {
    var val = rowObject[col];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  sheet.appendRow(row);
}

/**
 * Finds a row by matching a column value. Returns the first match.
 * @param {string} sheetName
 * @param {string} columnName
 * @param {string} value
 * @returns {{ rowIndex: number, data: object }|null}
 *   rowIndex is 1-based (including header). Returns null if not found.
 */
function findRowByColumn(sheetName, columnName, value) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx = headers.indexOf(columnName);
  if (colIdx === -1) return null;

  var allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < allData.length; i++) {
    if (String(allData[i][colIdx]) === String(value)) {
      var rowObj = {};
      headers.forEach(function(h, j) { rowObj[h] = allData[i][j]; });
      return { rowIndex: i + 2, data: rowObj }; // +2: 1 for header, 1 for 0-base
    }
  }
  return null;
}

/**
 * Updates specific columns in an existing row.
 * @param {string} sheetName
 * @param {number} rowIndex - 1-based row number.
 * @param {object} updates - Key-value pairs of columns to update.
 */
function updateRow(sheetName, rowIndex, updates) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  Object.keys(updates).forEach(function(col) {
    var colIdx = headers.indexOf(col);
    if (colIdx === -1) return;
    var val = updates[col];
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    sheet.getRange(rowIndex, colIdx + 1).setValue(val);
  });
}

/**
 * Returns all rows from a sheet as an array of objects.
 * Skips rows where the first column is empty.
 * @param {string} sheetName
 * @param {string[]} [columnOrder] - Expected columns. If omitted, uses sheet headers.
 * @returns {object[]}
 */
function getAllRows(sheetName, columnOrder) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data    = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return data
    .filter(function(row) { return row[0] !== '' && row[0] !== null; })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
}

/**
 * Deletes a row from a sheet by 1-based row index.
 * @param {string} sheetName
 * @param {number} rowIndex
 */
function deleteRow(sheetName, rowIndex) {
  var sheet = getSheet(sheetName);
  sheet.deleteRow(rowIndex);
}

// ============================================================
// AUDIT LOG
// ============================================================

/**
 * Appends an entry to the AuditLog sheet.
 * Called by every write operation in every module.
 * @param {string} actor       - Judge ID, admin ID, or 'system'
 * @param {string} actorType   - 'judge' | 'admin' | 'audience' | 'system'
 * @param {string} action      - Action enum value (e.g. 'VOTE_SUBMITTED')
 * @param {string} entityType  - 'vote' | 'presenter' | 'judge' | 'settings' | 'track' | 'template'
 * @param {string} entityId    - The ID of the affected entity
 * @param {object|string} details - Additional context (will be JSON-stringified if object)
 * @param {string} [sessionToken] - Hashed session token (optional)
 */
function logAudit(actor, actorType, action, entityType, entityId, details, sessionToken) {
  try {
    var detailsStr = (typeof details === 'object' && details !== null)
      ? JSON.stringify(details)
      : String(details || '');

    var hashedToken = sessionToken ? hashString(String(sessionToken).substring(0, 36)) : '';

    appendRow(SHEET_NAMES.AUDIT_LOG, {
      LogID:        generateUUID(),
      Timestamp:    nowISO(),
      Actor:        actor       || 'system',
      ActorType:    actorType   || 'system',
      Action:       action      || 'UNKNOWN',
      EntityType:   entityType  || '',
      EntityID:     entityId    || '',
      Details:      detailsStr,
      SessionToken: hashedToken,
      IPHash:       '',
    }, COLUMNS.AUDIT_LOG);
  } catch (e) {
    // Audit log failure must never break the main operation
    console.error('logAudit failed: ' + e.message);
  }
}

// ============================================================
// EMAIL
// ============================================================

/**
 * Sends an HTML email via GmailApp.
 * @param {string} to
 * @param {string} subject
 * @param {string} htmlBody
 */
function sendEmail(to, subject, htmlBody) {
  GmailApp.sendEmail(to, subject, '', { htmlBody: htmlBody });
}

// ============================================================
// HTTP RESPONSE HELPERS
// ============================================================

/**
 * Returns a consistent success JSON response via ContentService.
 * Schema: { success: true, data: <any>, error: null }
 * @param {*} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(data) {
  var payload = JSON.stringify({ success: true, data: data, error: null });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns a consistent error JSON response via ContentService.
 * Schema: { success: false, data: null, error: <string> }
 * @param {string} message
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function errorResponse(message) {
  var payload = JSON.stringify({ success: false, data: null, error: String(message) });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// INPUT HELPERS
// ============================================================

/**
 * Returns a string value, trimmed and defaulting to '' if null/undefined.
 * @param {*} val
 * @returns {string}
 */
function str(val) {
  return (val === null || val === undefined) ? '' : String(val).trim();
}

/**
 * Returns a number value, defaulting to 0 if not a valid number.
 * @param {*} val
 * @returns {number}
 */
function num(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Returns a boolean value. Treats 'true', 'TRUE', 1, true as true.
 * @param {*} val
 * @returns {boolean}
 */
function bool(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') return val.trim().toUpperCase() === 'TRUE';
  return false;
}

/**
 * Validates that an admin token is present (non-empty).
 * Full validation is done in Auth.gs — this is a quick null-check gate.
 * @param {string} adminToken
 * @throws {Error} if token is absent
 */
function requireAdminToken(adminToken) {
  if (!adminToken || str(adminToken) === '') {
    throw new Error('Administrator authentication required.');
  }
}

/**
 * Rounds a number to at most 2 decimal places.
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Parses a CSV string into an array of row arrays.
 * Handles quoted fields with commas.
 * @param {string} csv
 * @returns {string[][]}
 */
function parseCSV(csv) {
  var lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .filter(function(line) { return line.trim() !== ''; })
    .map(function(line) {
      var result = [];
      var inQuote = false;
      var current = '';
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"' && !inQuote) { inQuote = true; }
        else if (ch === '"' && inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"' && inQuote) { inQuote = false; }
        else if (ch === ',' && !inQuote) { result.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      result.push(current.trim());
      return result;
    });
}

/**
 * Converts an array of row objects to a CSV string.
 * @param {object[]} rows
 * @param {string[]} columns - Column keys in order.
 * @returns {string}
 */
function toCSV(rows, columns) {
  var header = columns.join(',');
  var lines = rows.map(function(row) {
    return columns.map(function(col) {
      var val = String(row[col] === undefined || row[col] === null ? '' : row[col]);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',');
  });
  return [header].concat(lines).join('\n');
}

/**
 * Initialises all required sheets in the spreadsheet if they do not exist.
 * Called by the setup wizard on first run.
 */
function initializeSheets() {
  var ss = getSpreadsheet();
  Object.keys(SHEET_NAMES).forEach(function(key) {
    var name = SHEET_NAMES[key];
    var cols = COLUMNS[key];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0 && cols) {
      sheet.appendRow(cols);
      sheet.getRange(1, 1, 1, cols.length)
        .setFontWeight('bold')
        .setBackground('#1a365d')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
}
