/**
 * Checkin.gs — Ava Judging System
 * Presenter check-in management. Delegates core writes to Presenters.gs.
 */

// ============================================================
// CHECK-IN
// ============================================================

/**
 * Marks a single presenter as checked in.
 * @param {string} presenterId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { name: string }, error: string|null }}
 */
function checkInPresenter(presenterId, adminToken) {
  return checkInPresenterCore(presenterId, adminToken);
}

/**
 * Marks multiple presenters as checked in.
 * @param {string[]} presenterIds
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { checked: number, failed: number, errors: object[] }, error: string|null }}
 */
function bulkCheckIn(presenterIds, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!Array.isArray(presenterIds) || presenterIds.length === 0) {
      return { success: false, data: null, error: 'No presenter IDs provided.' };
    }

    var checked = 0;
    var failed  = 0;
    var errors  = [];

    presenterIds.forEach(function(id) {
      var result = checkInPresenterCore(id, adminToken);
      if (result.success) { checked++; }
      else { failed++; errors.push({ id: id, error: result.error }); }
    });

    return { success: true, data: { checked: checked, failed: failed, errors: errors }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// STATUS QUERY
// ============================================================

/**
 * Returns check-in summary counts.
 * @returns {{ success: boolean, data: { total: number, checkedIn: number, absent: number, notArrived: number }, error: string|null }}
 */
function getCheckinStatus() {
  try {
    var rows   = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS)
      .filter(function(r) { return bool(r.Active); });
    var total  = rows.length;

    var checkedIn  = rows.filter(function(r) { return bool(r.CheckedIn); }).length;
    var notArrived = total - checkedIn;

    return {
      success: true,
      data: {
        total:      total,
        checkedIn:  checkedIn,
        notArrived: notArrived,
        pct:        total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        rows: rows.map(function(r) {
          return {
            id:          str(r.ID),
            name:        str(r.Name),
            department:  str(r.Department),
            posterNumber: str(r.PosterNumber),
            track:       str(r.Track),
            checkedIn:   bool(r.CheckedIn),
            checkInTime: str(r.CheckInTime),
          };
        }),
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// SELF CHECK-IN (public — no admin token required)
// ============================================================

/**
 * Looks up a presenter by email for the self check-in flow.
 * Returns safe display info (no sensitive fields).
 * No admin token required.
 *
 * @param {string} email
 * @returns {{ success: boolean, data: { id, name, department, track, posterNumber, alreadyCheckedIn }|null, error: string|null }}
 */
function lookupPresenterForCheckin(email) {
  try {
    var cleanEmail = str(email).trim().toLowerCase();
    if (!cleanEmail) return { success: false, data: null, error: 'Please enter your email address.' };

    var rows = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS)
      .filter(function(r) { return bool(r.Active); });

    var match = null;
    for (var i = 0; i < rows.length; i++) {
      if (str(rows[i].Email).trim().toLowerCase() === cleanEmail) {
        match = rows[i];
        break;
      }
    }

    if (!match) {
      return {
        success: false,
        data: null,
        error: 'No presenter found with that email address. Please contact the event organizer.',
      };
    }

    return {
      success: true,
      data: {
        id:             str(match.ID),
        name:           str(match.Name),
        department:     str(match.Department),
        track:          str(match.Track),
        posterNumber:   str(match.PosterNumber),
        alreadyCheckedIn: bool(match.CheckedIn),
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Allows a presenter to check themselves in using their name and email.
 * No admin token required — this is a public endpoint.
 * Matches on email (case-insensitive). Name is verified as a secondary check.
 *
 * @param {string} name  - Presenter's full name as entered
 * @param {string} email - Presenter's email address
 * @returns {{ success: boolean, data: { presenterName: string, alreadyCheckedIn: boolean }|null, error: string|null }}
 */
/**
 * Confirms self check-in using the presenter's ID (obtained from lookupPresenterForCheckin).
 * Email is re-verified as a second factor to prevent ID guessing.
 * No admin token required.
 *
 * @param {string} presenterId
 * @param {string} email - Re-verified against the record
 * @returns {{ success: boolean, data: { presenterName: string, alreadyCheckedIn: boolean }|null, error: string|null }}
 */
function selfCheckIn(presenterId, email) {
  try {
    var cleanId    = str(presenterId).trim();
    var cleanEmail = str(email).trim().toLowerCase();

    if (!cleanId)    return { success: false, data: null, error: 'Missing presenter ID.' };
    if (!cleanEmail) return { success: false, data: null, error: 'Missing email.' };

    var found = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', cleanId);
    if (!found || !bool(found.data.Active)) {
      return { success: false, data: null, error: 'Presenter record not found. Please contact the organizer.' };
    }

    // Re-verify email as second factor
    if (str(found.data.Email).trim().toLowerCase() !== cleanEmail) {
      return { success: false, data: null, error: 'Verification failed. Please contact the organizer.' };
    }

    // Already checked in?
    if (bool(found.data.CheckedIn)) {
      return {
        success: true,
        data: { presenterName: str(found.data.Name), alreadyCheckedIn: true },
        error: null,
      };
    }

    updateRow(SHEET_NAMES.PRESENTERS, found.rowIndex, {
      CheckedIn:   true,
      CheckInTime: nowISO(),
    });

    logAudit(cleanId, 'presenter', 'CHECKIN_MARKED', 'presenter', cleanId,
      { name: str(found.data.Name), method: 'self_checkin' }, null);

    return {
      success: true,
      data: { presenterName: str(found.data.Name), alreadyCheckedIn: false },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// MARK ABSENT
// ============================================================

/**
 * Marks a presenter as absent (un-checks them if previously checked in,
 * or notes them as explicitly absent via a CheckedIn = false + time cleared).
 * @param {string} presenterId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { name: string }, error: string|null }}
 */
function markAbsent(presenterId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', str(presenterId));
    if (!found) return { success: false, data: null, error: 'Presenter not found: ' + presenterId };
    if (!bool(found.data.Active)) {
      return { success: false, data: null, error: 'Cannot update an inactive presenter.' };
    }

    updateRow(SHEET_NAMES.PRESENTERS, found.rowIndex, {
      CheckedIn:   false,
      CheckInTime: '',
    });

    logAudit('admin', 'admin', 'CHECKIN_MARKED', 'presenter', str(presenterId),
      { name: str(found.data.Name), status: 'absent' }, adminToken);

    return { success: true, data: { name: str(found.data.Name) }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}
