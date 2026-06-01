/**
 * Presenters.gs — Ava Judging System
 * Full CRUD for the Presenters sheet tab, plus CSV import/export and check-in.
 */

// Required CSV headers for import
var PRESENTER_CSV_REQUIRED = ['Name', 'Department'];
var PRESENTER_CSV_OPTIONAL = ['Email', 'PosterNumber', 'Track'];

// ============================================================
// READ
// ============================================================

/**
 * Returns all active presenters.
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllPresenters() {
  try {
    var rows = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS);
    var active = rows.filter(function(r) { return bool(r.Active); });
    var result = active.map(function(r) { return _mapPresenter(r); });
    return { success: true, data: result, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns all presenters including inactive (for admin views).
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllPresentersAdmin(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var rows = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS);
    var result = rows.map(function(r) { return _mapPresenter(r); });
    return { success: true, data: result, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns a single presenter by ID. Returns inactive presenters too (needed for score pages).
 * @param {string} id
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function getPresenter(id) {
  try {
    var found = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Presenter not found: ' + id };
    return { success: true, data: _mapPresenter(found.data), error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns all active presenters in a given track.
 * @param {string} trackId
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getPresentersByTrack(trackId) {
  try {
    var rows = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS);
    var filtered = rows.filter(function(r) {
      return bool(r.Active) && str(r.Track) === str(trackId);
    });
    return { success: true, data: filtered.map(_mapPresenter), error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// WRITE
// ============================================================

/**
 * Adds a new presenter.
 * @param {object} data - { Name, Department, Email?, PosterNumber?, Track? }
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { id: string }, error: string|null }}
 */
function addPresenter(data, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!data || !str(data.Name)) return { success: false, data: null, error: 'Presenter Name is required.' };
    if (!str(data.Department)) return { success: false, data: null, error: 'Department is required.' };

    // Generate unique ID
    var existingRows = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS);
    var existingIds  = existingRows.map(function(r) { return str(r.ID); });
    var newId        = generateID('P', existingIds);

    var row = {
      ID:           newId,
      Name:         str(data.Name),
      Department:   str(data.Department),
      Email:        str(data.Email),
      PosterNumber: str(data.PosterNumber),
      Track:        str(data.Track),
      CheckedIn:    false,
      CheckInTime:  '',
      Active:       true,
      CreatedAt:    nowISO(),
    };

    appendRow(SHEET_NAMES.PRESENTERS, row, COLUMNS.PRESENTERS);

    logAudit('admin', 'admin', 'PRESENTER_ADDED', 'presenter', newId,
      { name: row.Name, department: row.Department }, adminToken);

    return { success: true, data: { id: newId }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Edits an existing presenter's fields.
 * @param {string} id
 * @param {object} data - Fields to update.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function editPresenter(id, data, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!str(id)) return { success: false, data: null, error: 'Presenter ID is required.' };

    var found = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Presenter not found: ' + id };

    var updates = {};
    if (data.Name        !== undefined) updates.Name        = str(data.Name);
    if (data.Department  !== undefined) updates.Department  = str(data.Department);
    if (data.Email       !== undefined) updates.Email       = str(data.Email);
    if (data.PosterNumber !== undefined) updates.PosterNumber = str(data.PosterNumber);
    if (data.Track       !== undefined) updates.Track       = str(data.Track);

    if (Object.keys(updates).length === 0) {
      return { success: false, data: null, error: 'No fields to update.' };
    }

    updateRow(SHEET_NAMES.PRESENTERS, found.rowIndex, updates);

    logAudit('admin', 'admin', 'PRESENTER_EDITED', 'presenter', str(id),
      { updates: updates }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Soft-deletes a presenter (sets Active = FALSE).
 * Votes already submitted for this presenter are preserved.
 * @param {string} id
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function deletePresenter(id, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Presenter not found: ' + id };

    updateRow(SHEET_NAMES.PRESENTERS, found.rowIndex, { Active: false });

    logAudit('admin', 'admin', 'PRESENTER_DELETED', 'presenter', str(id),
      { name: str(found.data.Name) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// CSV IMPORT / EXPORT
// ============================================================

/**
 * Parses and bulk-imports presenters from a CSV string.
 * Expected headers: Name, Department (required); Email, PosterNumber, Track (optional).
 * @param {string} csvData
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { imported: number, skipped: number, errors: object[] }, error: string|null }}
 */
function importPresenters(csvData, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!csvData || str(csvData) === '') {
      return { success: false, data: null, error: 'CSV data is empty.' };
    }

    var lines = parseCSV(csvData);
    if (lines.length < 2) {
      return { success: false, data: null, error: 'CSV file appears to be empty or has no data rows.' };
    }

    var headers = lines[0].map(function(h) { return str(h); });
    var nameIdx  = headers.indexOf('Name');
    var deptIdx  = headers.indexOf('Department');
    var emailIdx = headers.indexOf('Email');
    var posterIdx = headers.indexOf('PosterNumber');
    var trackIdx = headers.indexOf('Track');

    if (nameIdx === -1) return { success: false, data: null, error: 'CSV is missing required column: Name' };
    if (deptIdx === -1) return { success: false, data: null, error: 'CSV is missing required column: Department' };

    var existingRows = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS);
    var existingIds  = existingRows.map(function(r) { return str(r.ID); });

    var imported = 0;
    var skipped  = 0;
    var errors   = [];
    var dataRows = lines.slice(1);

    dataRows.forEach(function(row, idx) {
      var rowNum = idx + 2; // 1-indexed, accounting for header
      var name   = row[nameIdx]  ? str(row[nameIdx])  : '';
      var dept   = row[deptIdx]  ? str(row[deptIdx])  : '';

      if (!name) {
        errors.push({ row: rowNum, error: 'Name is required.' });
        skipped++;
        return;
      }
      if (!dept) {
        errors.push({ row: rowNum, error: 'Department is required.' });
        skipped++;
        return;
      }

      var newId = generateID('P', existingIds);
      existingIds.push(newId);

      var rowObj = {
        ID:           newId,
        Name:         name,
        Department:   dept,
        Email:        emailIdx  !== -1 ? str(row[emailIdx])  : '',
        PosterNumber: posterIdx !== -1 ? str(row[posterIdx]) : '',
        Track:        trackIdx  !== -1 ? str(row[trackIdx])  : '',
        CheckedIn:    false,
        CheckInTime:  '',
        Active:       true,
        CreatedAt:    nowISO(),
      };

      appendRow(SHEET_NAMES.PRESENTERS, rowObj, COLUMNS.PRESENTERS);
      imported++;
    });

    logAudit('admin', 'admin', 'PRESENTER_ADDED', 'presenter', 'bulk-import',
      { imported: imported, skipped: skipped }, adminToken);

    return { success: true, data: { imported: imported, skipped: skipped, errors: errors }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Exports all active presenters as a CSV string.
 * @returns {{ success: boolean, data: string, error: string|null }}
 */
function exportPresenters() {
  try {
    var rows   = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS);
    var active = rows.filter(function(r) { return bool(r.Active); });
    var csvCols = ['ID', 'Name', 'Department', 'Email', 'PosterNumber', 'Track', 'CheckedIn', 'CheckInTime'];
    var csv    = toCSV(active, csvCols);
    return { success: true, data: csv, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// CHECK-IN (delegated to from Checkin.gs, but core logic here)
// ============================================================

/**
 * Marks a presenter as checked in.
 * @param {string} id
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { name: string }, error: string|null }}
 */
function checkInPresenterCore(id, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', str(id));
    if (!found) return { success: false, data: null, error: 'Presenter not found: ' + id };
    if (!bool(found.data.Active)) {
      return { success: false, data: null, error: 'Cannot check in an inactive presenter.' };
    }

    updateRow(SHEET_NAMES.PRESENTERS, found.rowIndex, {
      CheckedIn:   true,
      CheckInTime: nowISO(),
    });

    logAudit('admin', 'admin', 'CHECKIN_MARKED', 'presenter', str(id),
      { name: str(found.data.Name), status: 'checked_in' }, adminToken);

    return { success: true, data: { name: str(found.data.Name) }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Maps a raw sheet row object to the public presenter shape.
 * @param {object} row
 * @returns {object}
 * @private
 */
function _mapPresenter(row) {
  return {
    ID:           str(row.ID),
    Name:         str(row.Name),
    Department:   str(row.Department),
    Email:        str(row.Email),
    PosterNumber: str(row.PosterNumber),
    Track:        str(row.Track),
    CheckedIn:    bool(row.CheckedIn),
    CheckInTime:  str(row.CheckInTime),
    Active:       bool(row.Active),
    CreatedAt:    str(row.CreatedAt),
  };
}
