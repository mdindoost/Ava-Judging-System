/**
 * Tracks.gs — Ava Judging System
 * Full CRUD for the Tracks sheet tab.
 */

// ============================================================
// READ
// ============================================================

/**
 * Returns all active tracks.
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllTracks() {
  try {
    var rows = getAllRows(SHEET_NAMES.TRACKS, COLUMNS.TRACKS);
    var active = rows
      .filter(function(r) { return bool(r.Active); })
      .map(function(r) { return _mapTrack(r); });
    return { success: true, data: active, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns a single track by ID.
 * @param {string} id
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function getTrack(id) {
  try {
    var found = findRowByColumn(SHEET_NAMES.TRACKS, 'TrackID', str(id));
    if (!found) return { success: false, data: null, error: 'Track not found: ' + id };
    return { success: true, data: _mapTrack(found.data), error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// WRITE
// ============================================================

/**
 * Adds a new track.
 * @param {object} data - { Name, Description?, Color? }
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { id: string }, error: string|null }}
 */
function addTrack(data, adminToken) {
  try {
    // Allow 'setup' token during first-run wizard bootstrap
    if (str(adminToken) !== 'setup') requireValidAdminSession(adminToken);
    if (!data || !str(data.Name)) return { success: false, data: null, error: 'Track Name is required.' };

    var existingRows = getAllRows(SHEET_NAMES.TRACKS, COLUMNS.TRACKS);

    // Prevent duplicate track names (case-insensitive)
    var newName = str(data.Name).toLowerCase().trim();
    var duplicate = existingRows.find(function(r) {
      return bool(r.Active) && str(r.Name).toLowerCase().trim() === newName;
    });
    if (duplicate) {
      return { success: false, data: null, error: 'A track named "' + str(data.Name) + '" already exists.' };
    }

    var existingIds  = existingRows.map(function(r) { return str(r.TrackID); });
    var newId        = generateID('T', existingIds);

    var row = {
      TrackID:     newId,
      Name:        str(data.Name),
      Description: str(data.Description),
      Color:       str(data.Color) || '#1a365d',
      Active:      true,
    };

    appendRow(SHEET_NAMES.TRACKS, row, COLUMNS.TRACKS);

    logAudit('admin', 'admin', 'TRACK_ADDED', 'track', newId,
      { name: row.Name }, adminToken);

    return { success: true, data: { id: newId }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Edits an existing track.
 * @param {string} id
 * @param {object} data
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function editTrack(id, data, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.TRACKS, 'TrackID', str(id));
    if (!found) return { success: false, data: null, error: 'Track not found: ' + id };

    var updates = {};
    if (data.Name        !== undefined) updates.Name        = str(data.Name);
    if (data.Description !== undefined) updates.Description = str(data.Description);
    if (data.Color       !== undefined) updates.Color       = str(data.Color);

    // Prevent renaming to a name already used by a different track
    if (updates.Name) {
      var newName = updates.Name.toLowerCase().trim();
      var allRows = getAllRows(SHEET_NAMES.TRACKS, COLUMNS.TRACKS);
      var conflict = allRows.find(function(r) {
        return bool(r.Active) &&
               str(r.TrackID) !== str(id) &&
               str(r.Name).toLowerCase().trim() === newName;
      });
      if (conflict) {
        return { success: false, data: null, error: 'A track named "' + updates.Name + '" already exists.' };
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, data: null, error: 'No fields to update.' };
    }

    updateRow(SHEET_NAMES.TRACKS, found.rowIndex, updates);

    logAudit('admin', 'admin', 'TRACK_EDITED', 'track', str(id),
      { updates: Object.keys(updates) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Soft-deletes a track (Active = false).
 * Does NOT change presenter Track fields — those remain for historical data.
 * @param {string} id
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function deleteTrack(id, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.TRACKS, 'TrackID', str(id));
    if (!found) return { success: false, data: null, error: 'Track not found: ' + id };

    updateRow(SHEET_NAMES.TRACKS, found.rowIndex, { Active: false });

    logAudit('admin', 'admin', 'TRACK_DELETED', 'track', str(id),
      { name: str(found.data.Name) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// WINNERS
// ============================================================

/**
 * Returns the top 3 presenters in a given track from the Results sheet.
 * @param {string} trackId
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getTrackWinners(trackId) {
  try {
    var rows = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS);
    var inTrack = rows.filter(function(r) {
      return str(r.Track) === str(trackId) && bool(r.Active);
    });

    inTrack.sort(function(a, b) { return num(a.OverallRank) - num(b.OverallRank); });

    var top3 = inTrack.slice(0, 3).map(function(r, idx) {
      return {
        place:        idx + 1,
        presenterID:  str(r.PresenterID),
        name:         str(r.Name),
        department:   str(r.Department),
        track:        str(r.Track),
        finalScore:   round2(num(r.FinalScore)),
        judgeAvg:     round2(num(r.JudgeAvg)),
        audienceAvg:  round2(num(r.AudienceAvg)),
        trackRank:    num(r.TrackRank),
      };
    });

    return { success: true, data: top3, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * @param {object} row
 * @returns {object}
 * @private
 */
function _mapTrack(row) {
  return {
    TrackID:     str(row.TrackID),
    Name:        str(row.Name),
    Description: str(row.Description),
    Color:       str(row.Color) || '#1a365d',
    Active:      bool(row.Active),
  };
}
