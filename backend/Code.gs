/**
 * Code.gs — Ava Judging System
 * Main router. All HTTP requests enter here via doPost() or doGet().
 *
 * Every route:
 *   1. Parses payload
 *   2. Routes to the correct handler function
 *   3. Returns a { success, data, error } JSON response
 *
 * Handler functions perform their own token/auth validation internally.
 */

// ============================================================
// doPost — all write and authenticated read operations
// ============================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse('No request body received.');
    }

    var payload = parseJSON(e.postData.contents, null);
    if (!payload || typeof payload !== 'object') {
      return errorResponse('Invalid JSON in request body.');
    }

    var action = str(payload.action);
    if (!action) return errorResponse('No action specified.');

    var handler = ROUTES[action];
    if (!handler) return errorResponse('Unknown action: ' + action);

    var result = handler(payload);

    // Handlers return { success, data, error } objects.
    // Wrap in ContentService if not already a TextOutput.
    if (result && typeof result.getContent === 'function') {
      return result; // Already a ContentService TextOutput
    }

    if (result && typeof result === 'object' && 'success' in result) {
      return result.success
        ? jsonResponse(result.data)
        : errorResponse(result.error || 'An error occurred.');
    }

    return jsonResponse(result);

  } catch (err) {
    return errorResponse('Internal server error: ' + err.message);
  }
}

// ============================================================
// doGet — public read-only operations
// ============================================================

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = str(params.action);

    if (action === 'getSettings') {
      return getPublicSettings();
    }

    if (action === 'getLeaderboard') {
      var trackId  = str(params.trackId);
      var result   = getLeaderboard(trackId || null);
      return result.success ? jsonResponse(result.data) : errorResponse(result.error);
    }

    if (action === 'getVotingStatus') {
      var status = getSetting('votingStatus');
      return jsonResponse({ votingStatus: status });
    }

    if (action === 'ping') {
      var eventName = getSetting('eventName');
      return jsonResponse({ ok: true, eventName: eventName, version: '1.0.0', checkinSupported: true });
    }

    // Read-only routes duplicated here because fetch() with redirect:'follow'
    // converts POST → GET after Apps Script's redirect, losing the body.
    if (action === 'getAllJudges') {
      var r = getAllJudges();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getAllPresenters') {
      var r = getAllPresenters();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getAllTracks') {
      var r = getAllTracks();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getAllJudgeProgress') {
      var r = getAllJudgeProgress();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getVotingStats') {
      var r = getVotingStats();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getCheckinStatus') {
      var r = getCheckinStatus();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getPresenterResult') {
      var r = getPresenterResult(str(params.presenterId));
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }
    if (action === 'getWinners') {
      var r = getWinners();
      return r.success ? jsonResponse(r.data) : errorResponse(r.error);
    }

    // Public self check-in routes — duplicated here because fetch() with
    // redirect:'follow' can convert POST → GET after Apps Script's redirect.
    if (action === 'lookupPresenterForCheckin') {
      var checkinEmail  = str(params.email);
      var checkinResult = lookupPresenterForCheckin(checkinEmail);
      return checkinResult.success
        ? jsonResponse(checkinResult.data)
        : errorResponse(checkinResult.error);
    }

    if (action === 'selfCheckIn') {
      var checkinPid    = str(params.presenterId);
      var checkinEmail2 = str(params.email);
      var checkinResult2 = selfCheckIn(checkinPid, checkinEmail2);
      return checkinResult2.success
        ? jsonResponse(checkinResult2.data)
        : errorResponse(checkinResult2.error);
    }

    return errorResponse('Unknown GET action: ' + action);

  } catch (err) {
    return errorResponse('Internal server error: ' + err.message);
  }
}

// ============================================================
// ROUTE TABLE
// Keyed by action string, value is a function(payload) -> result.
// ============================================================

var ROUTES = {

  // ---- Auth --------------------------------------------------
  'validateToken': function(p) {
    return validateJudgeToken(str(p.token));
  },
  'validateAdminSession': function(p) {
    return validateAdminSession(str(p.sessionToken));
  },
  'validateAdminPassword': function(p) {
    return validateAdminPassword(str(p.passwordHash));
  },
  'logoutAdmin': function(p) {
    return invalidateAdminSession(str(p.sessionToken));
  },
  'logoutJudge': function(p) {
    return invalidateToken(str(p.token));
  },

  // ---- Setup -------------------------------------------------
  // No token required — this is the first-run bootstrap call.
  // The password hash is stored here; all subsequent writes use a real session.
  'initializeEvent': function(p) {
    return initializeDefaultSettings(
      str(p.eventName),
      str(p.eventDate),
      str(p.adminPasswordHash),
      str(p.adminEmail),
      p.settings || {}
    );
  },
  // ---- Self check-in (public — no token required) ------------
  'lookupPresenterForCheckin': function(p) {
    return lookupPresenterForCheckin(str(p.email));
  },
  'selfCheckIn': function(p) {
    return selfCheckIn(str(p.presenterId), str(p.email));
  },

  'testConnection': function(p) {
    var eventName = getSetting('eventName');
    return { success: true, data: { ok: true, eventName: eventName }, error: null };
  },

  // ---- Settings ----------------------------------------------
  'getSettings': function(p) {
    return getSettings();
  },
  'updateSettings': function(p) {
    return updateSettings(p.updates, str(p.adminToken));
  },
  'updateSetting': function(p) {
    return updateSetting(str(p.key), str(p.value), str(p.adminToken));
  },
  'openVoting': function(p) {
    return openVoting(str(p.adminToken));
  },
  'pauseVoting': function(p) {
    return pauseVoting(str(p.adminToken));
  },
  'closeVoting': function(p) {
    return closeVoting(str(p.adminToken));
  },

  // ---- Presenters --------------------------------------------
  'getAllPresenters': function(p) {
    return getAllPresenters();
  },
  'getAllPresentersAdmin': function(p) {
    return getAllPresentersAdmin(str(p.adminToken));
  },
  'getPresenter': function(p) {
    return getPresenter(str(p.id));
  },
  'addPresenter': function(p) {
    return addPresenter(p.data, str(p.adminToken));
  },
  'editPresenter': function(p) {
    return editPresenter(str(p.id), p.data, str(p.adminToken));
  },
  'deletePresenter': function(p) {
    return deletePresenter(str(p.id), str(p.adminToken));
  },
  'importPresenters': function(p) {
    return importPresenters(str(p.csvData), str(p.adminToken));
  },
  'exportPresenters': function(p) {
    return exportPresenters();
  },
  'getPresentersByTrack': function(p) {
    return getPresentersByTrack(str(p.trackId));
  },

  // ---- Judges ------------------------------------------------
  'getAllJudges': function(p) {
    return getAllJudges();
  },
  'getJudge': function(p) {
    return getJudge(str(p.id));
  },
  'addJudge': function(p) {
    return addJudge(p.data, str(p.adminToken));
  },
  'editJudge': function(p) {
    return editJudge(str(p.id), p.data, str(p.adminToken));
  },
  'deleteJudge': function(p) {
    return deleteJudge(str(p.id), str(p.adminToken));
  },
  'sendInvitation': function(p) {
    return sendInvitation(str(p.judgeId), str(p.adminToken));
  },
  'sendBulkInvitations': function(p) {
    return sendBulkInvitations(p.judgeIds, str(p.adminToken));
  },
  'resendInvitation': function(p) {
    return resendInvitation(str(p.judgeId), str(p.adminToken));
  },
  'getJudgeProgress': function(p) {
    return getJudgeProgress(str(p.judgeId));
  },
  'getAllJudgeProgress': function(p) {
    return getAllJudgeProgress();
  },
  'assignPresenters': function(p) {
    return assignPresenters(str(p.judgeId), p.presenterIds, str(p.adminToken));
  },
  'assignTrack': function(p) {
    return assignTrack(str(p.judgeId), str(p.trackId), str(p.adminToken));
  },
  'sendReminder': function(p) {
    return sendReminder(str(p.judgeId), str(p.adminToken));
  },
  'sendBulkReminders': function(p) {
    return sendBulkReminders(str(p.adminToken));
  },

  // ---- Tracks ------------------------------------------------
  'getAllTracks': function(p) {
    return getAllTracks();
  },
  'getTrack': function(p) {
    return getTrack(str(p.id));
  },
  'addTrack': function(p) {
    return addTrack(p.data, str(p.adminToken));
  },
  'editTrack': function(p) {
    return editTrack(str(p.id), p.data, str(p.adminToken));
  },
  'deleteTrack': function(p) {
    return deleteTrack(str(p.id), str(p.adminToken));
  },
  'getTrackWinners': function(p) {
    return getTrackWinners(str(p.trackId));
  },

  // ---- Votes -------------------------------------------------
  'submitVote': function(p) {
    return submitVote(p);
  },
  'getVotesForPresenter': function(p) {
    return getVotesForPresenter(str(p.presenterId));
  },
  'getVotesByJudge': function(p) {
    return getVotesByJudge(str(p.judgeId));
  },
  'getAllVotes': function(p) {
    return getAllVotes(str(p.adminToken));
  },
  'deleteVote': function(p) {
    return deleteVote(str(p.voteId), str(p.adminToken));
  },
  'getVotingStats': function(p) {
    return getVotingStats();
  },

  // ---- Results -----------------------------------------------
  'refreshResults': function(p) {
    return refreshResults();
  },
  'getLeaderboard': function(p) {
    return getLeaderboard(str(p.trackId) || null);
  },
  'getPresenterResult': function(p) {
    return getPresenterResult(str(p.presenterId));
  },
  'getWinners': function(p) {
    return getWinners();
  },
  'getPresenterPercentiles': function(p) {
    return getPresenterPercentiles(str(p.presenterId));
  },

  // ---- Reports -----------------------------------------------
  'getJudgeQualityReport': function(p) {
    return getJudgeQualityReport(str(p.adminToken));
  },
  'getCompetitorScorecardData': function(p) {
    return getCompetitorScorecardData(str(p.presenterId), str(p.adminToken));
  },
  'getEventSummaryData': function(p) {
    return getEventSummaryData(str(p.adminToken));
  },
  'getVotingTimeline': function(p) {
    return getVotingTimeline(str(p.adminToken));
  },
  'getRubricDifficultyAnalysis': function(p) {
    return getRubricDifficultyAnalysis(str(p.adminToken));
  },
  'calculateInterRaterReliability': function(p) {
    return calculateInterRaterReliability(str(p.adminToken));
  },

  // ---- Check-in ----------------------------------------------
  'checkInPresenter': function(p) {
    return checkInPresenter(str(p.id), str(p.adminToken));
  },
  'bulkCheckIn': function(p) {
    return bulkCheckIn(p.ids, str(p.adminToken));
  },
  'getCheckinStatus': function(p) {
    return getCheckinStatus();
  },
  'markAbsent': function(p) {
    return markAbsent(str(p.id), str(p.adminToken));
  },

  // ---- Templates ---------------------------------------------
  'getAllTemplates': function(p) {
    return getAllTemplates();
  },
  'saveAsTemplate': function(p) {
    return saveAsTemplate(str(p.name), str(p.description), str(p.adminToken));
  },
  'loadTemplate': function(p) {
    return loadTemplate(str(p.templateId), str(p.adminToken));
  },
  'deleteTemplate': function(p) {
    return deleteTemplate(str(p.templateId), str(p.adminToken));
  },

  // ---- Admin utilities ---------------------------------------
  'getAdminDashboard': function(p) {
    try {
      requireValidAdminSession(str(p.adminToken));
      var settings  = getSettings().data || {};
      var stats     = getVotingStats();
      var checkin   = getCheckinStatus();
      var progress  = getAllJudgeProgress();
      var recentVotes = _getRecentVotes(10);

      return {
        success: true,
        data: {
          eventName:    str(settings.eventName),
          eventDate:    str(settings.eventDate),
          votingStatus: str(settings.votingStatus),
          totalVotes:   stats.success  ? stats.data.totalVotes  : 0,
          judgeVotes:   stats.success  ? stats.data.judgeVotes  : 0,
          audienceVotes: stats.success ? stats.data.audienceVotes : 0,
          totalPresenters: checkin.success ? checkin.data.total    : 0,
          checkedIn:       checkin.success ? checkin.data.checkedIn : 0,
          totalJudges:   progress.success ? progress.data.length  : 0,
          loggedInJudges: progress.success
            ? progress.data.filter(function(j) { return j.percentComplete > 0; }).length
            : 0,
          completionPct: progress.success && progress.data.length > 0
            ? Math.round(progress.data.reduce(function(s, j) { return s + j.percentComplete; }, 0)
                / progress.data.length)
            : 0,
          recentVotes:  recentVotes,
          generatedAt:  nowISO(),
        },
        error: null,
      };
    } catch (e) {
      return { success: false, data: null, error: e.message };
    }
  },
};

// ============================================================
// INTERNAL HELPERS (Code.gs-only)
// ============================================================

/**
 * Returns the most recent N votes for the admin dashboard feed.
 * @param {number} n
 * @returns {object[]}
 * @private
 */
function _getRecentVotes(n) {
  try {
    var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    rows.sort(function(a, b) {
      return new Date(str(b.Timestamp)).getTime() - new Date(str(a.Timestamp)).getTime();
    });
    return rows.slice(0, n).map(function(r) {
      return {
        timestamp:    str(r.Timestamp),
        presenterName: str(r.PresenterName),
        presenterID:  str(r.PresenterID),
        voterType:    str(r.VoterType),
        voterName:    str(r.VoterName),
        score:        num(r.Score),
        category:     str(r.RubricCategoryID),
      };
    });
  } catch (e) {
    return [];
  }
}
