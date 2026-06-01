/**
 * Votes.gs — Ava Judging System
 * THE MOST CRITICAL FILE. All vote submission logic lives here.
 * Every validation step runs in the exact order specified in CLAUDE_CODE_PROMPT.md.
 */

// ============================================================
// SUBMIT VOTE — PRIMARY ENTRY POINT
// ============================================================

/**
 * Submits a vote (judge or audience) after running the full validation sequence.
 *
 * Validation order (fail-fast):
 *   1. Honeypot check (audience only)
 *   2. Rate limit check
 *   3. Voting status — must be 'open'
 *   4. Presenter existence + active check
 *   5. Score structure — array matches rubric categories
 *   6. Score range — each score 0 <= s <= maxScore
 *   7. Score decimal — max 2 decimal places
 *   For judge:
 *   8. Token validation
 *   9. Judge existence
 *   10. Track assignment check
 *   11. Duplicate check (judge + presenter)
 *   For audience:
 *   8. Self-vote check
 *   9. Duplicate check (voterID + presenterID)
 *
 * @param {object} payload
 *   { presenterID, voterType, voterID, voterName, scores[], sessionToken, honeypot, eventDay?, ipHash? }
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function submitVote(payload) {
  try {
    var presenterID  = str(payload.presenterID);
    var voterType    = str(payload.voterType);   // 'judge' | 'audience'
    var voterID      = str(payload.voterID);
    var voterName    = str(payload.voterName);
    var scores       = Array.isArray(payload.scores) ? payload.scores : [];
    var sessionToken = str(payload.sessionToken);
    var honeypot     = payload.honeypot;
    var eventDay     = payload.eventDay ? num(payload.eventDay) : 1;
    var ipHashRaw    = str(payload.ipHash);
    var ipHash       = ipHashRaw ? hashString(ipHashRaw) : '';

    // ----------------------------------------------------------
    // STEP 1: Honeypot check (audience only)
    // If the hidden honeypot field is filled, silently pretend
    // success but do NOT store the vote. This catches bots.
    // ----------------------------------------------------------
    if (voterType === 'audience' && honeypot && str(honeypot) !== '') {
      return { success: true, data: { voteId: generateUUID(), honeypot: true }, error: null };
    }

    // ----------------------------------------------------------
    // STEP 2: Rate limit check
    // Key: sessionToken for judges, voterID for audience.
    // ----------------------------------------------------------
    var rateLimitKey = voterType === 'judge' ? sessionToken : (voterID || ipHash || 'anon');
    var rateLimitResult = checkRateLimit(rateLimitKey);
    if (!rateLimitResult.allowed) {
      return { success: false, data: null, error: rateLimitResult.error };
    }

    // ----------------------------------------------------------
    // STEP 3: Voting status check
    // ----------------------------------------------------------
    var votingStatus = getSetting('votingStatus');
    if (votingStatus !== 'open') {
      var statusMsg = votingStatus === 'paused'
        ? 'Voting is currently paused. Please wait for the event administrator to resume.'
        : 'Voting is currently closed.';
      logAudit(voterID || 'unknown', voterType, 'VOTE_REJECTED', 'vote', presenterID,
        { reason: 'voting_' + votingStatus }, sessionToken);
      return { success: false, data: null, error: statusMsg };
    }

    // ----------------------------------------------------------
    // STEP 4: Presenter existence + active check
    // ----------------------------------------------------------
    if (!presenterID) {
      return { success: false, data: null, error: 'Presenter ID is required.' };
    }
    var presenterFound = findRowByColumn(SHEET_NAMES.PRESENTERS, 'ID', presenterID);
    if (!presenterFound) {
      logAudit(voterID || 'unknown', voterType, 'VOTE_REJECTED', 'vote', presenterID,
        { reason: 'presenter_not_found' }, sessionToken);
      return { success: false, data: null, error: 'Presenter not found. Please check the ID and try again.' };
    }
    if (!bool(presenterFound.data.Active)) {
      logAudit(voterID || 'unknown', voterType, 'VOTE_REJECTED', 'vote', presenterID,
        { reason: 'presenter_inactive' }, sessionToken);
      return { success: false, data: null, error: 'This presenter is not active. Please contact the event administrator.' };
    }
    var presenterName = str(presenterFound.data.Name);
    var presenterTrack = str(presenterFound.data.Track);

    // ----------------------------------------------------------
    // STEP 5: Score structure validation
    // ----------------------------------------------------------
    if (!Array.isArray(scores) || scores.length === 0) {
      return { success: false, data: null, error: 'No scores provided.' };
    }

    var settings      = getSettings().data || {};
    var rubricMode    = str(settings.rubricMode)   || 'single';
    var maxJudgeScore = num(settings.maxJudgeScore) || 25;
    var maxAudiScore  = num(settings.maxAudienceScore) || 25;
    var allowDecimals = bool(settings.allowDecimalScores !== undefined ? settings.allowDecimalScores : 'true');

    var rubricCategories = parseJSON(str(settings.rubricCategories), [
      { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0 }
    ]);

    if (rubricMode === 'multi') {
      if (scores.length !== rubricCategories.length) {
        return { success: false, data: null, error: 'Score count (' + scores.length + ') does not match rubric category count (' + rubricCategories.length + ').' };
      }
      for (var i = 0; i < rubricCategories.length; i++) {
        var matchedScore = scores.find(function(s) { return str(s.category) === str(rubricCategories[i].id); });
        if (!matchedScore) {
          return { success: false, data: null, error: 'Missing score for rubric category: ' + rubricCategories[i].name };
        }
      }
    } else {
      // Single mode: expect exactly one score entry
      if (scores.length !== 1) {
        return { success: false, data: null, error: 'Single score mode requires exactly one score entry.' };
      }
    }

    // ----------------------------------------------------------
    // STEP 6: Score range validation
    // ----------------------------------------------------------
    var maxScore = voterType === 'judge' ? maxJudgeScore : maxAudiScore;

    for (var j = 0; j < scores.length; j++) {
      var entry = scores[j];
      var scoreVal = parseFloat(entry.score);

      if (isNaN(scoreVal)) {
        return { success: false, data: null, error: 'Score must be a valid number for category: ' + (entry.category || 'unknown') };
      }

      // Per-category max in multi mode
      var catMax = maxScore;
      if (rubricMode === 'multi') {
        var cat = rubricCategories.find(function(c) { return str(c.id) === str(entry.category); });
        if (cat) catMax = num(cat.maxScore);
      }

      if (scoreVal < 0 || scoreVal > catMax) {
        return { success: false, data: null, error: 'Score must be between 0 and ' + catMax + ' for category: ' + (entry.category || 'total') };
      }
    }

    // ----------------------------------------------------------
    // STEP 7: Score decimal validation
    // ----------------------------------------------------------
    if (!allowDecimals) {
      for (var k = 0; k < scores.length; k++) {
        var sv = parseFloat(scores[k].score);
        if (sv !== Math.floor(sv)) {
          return { success: false, data: null, error: 'Decimal scores are not allowed for this event.' };
        }
      }
    } else {
      for (var m = 0; m < scores.length; m++) {
        var svStr = String(parseFloat(scores[m].score));
        var decPart = svStr.includes('.') ? svStr.split('.')[1] : '';
        if (decPart.length > 2) {
          return { success: false, data: null, error: 'Score may have at most 2 decimal places.' };
        }
      }
    }

    // ----------------------------------------------------------
    // JUDGE-SPECIFIC VALIDATION (steps 8–11)
    // ----------------------------------------------------------
    var judgeData = null;

    if (voterType === 'judge') {

      // Step 8: Token validation
      if (!sessionToken) {
        return { success: false, data: null, error: 'No session token found. Please use your invitation link to log in.' };
      }
      var tokenResult = validateJudgeToken(sessionToken);
      if (!tokenResult.success) {
        logAudit('unknown', 'judge', 'VOTE_REJECTED', 'vote', presenterID,
          { reason: 'invalid_token', error: tokenResult.error }, sessionToken);
        return { success: false, data: null, error: tokenResult.error };
      }
      judgeData = tokenResult.data;

      // Step 9: Judge existence (already confirmed by token validation, but double-check)
      var judgeFound = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', judgeData.judgeId);
      if (!judgeFound || !bool(judgeFound.data.Active)) {
        return { success: false, data: null, error: 'Judge account not found or inactive.' };
      }

      // Step 10: Track assignment check (only if tracks are enabled AND judge has a specific track)
      var tracksEnabled = bool(settings.tracksEnabled);
      if (tracksEnabled && str(judgeData.assignedTrack) !== '') {
        if (presenterTrack !== '' && str(judgeData.assignedTrack) !== presenterTrack) {
          logAudit(judgeData.judgeId, 'judge', 'VOTE_REJECTED', 'vote', presenterID,
            { reason: 'wrong_track', judgeTrack: judgeData.assignedTrack, presenterTrack: presenterTrack },
            sessionToken);
          return { success: false, data: null, error: 'You are not assigned to score presenters in this track.' };
        }
      }

      // If judge has specific assigned presenters, verify this presenter is in the list
      var assignedIds = Array.isArray(judgeData.assignedPresenters) ? judgeData.assignedPresenters : [];
      if (assignedIds.length > 0 && !assignedIds.includes(presenterID)) {
        return { success: false, data: null, error: 'This presenter is not in your assigned list.' };
      }

      // Step 11: Duplicate vote check (judge + presenter)
      var dupCheck = getVotesByJudgeForPresenter(judgeData.judgeId, presenterID);
      if (dupCheck.success && dupCheck.data.length > 0) {
        logAudit(judgeData.judgeId, 'judge', 'VOTE_REJECTED', 'vote', presenterID,
          { reason: 'duplicate_vote' }, sessionToken);
        return { success: false, data: null, error: 'You have already scored this presenter.' };
      }

    // ----------------------------------------------------------
    // AUDIENCE-SPECIFIC VALIDATION (steps 8–9)
    // ----------------------------------------------------------
    } else if (voterType === 'audience') {

      // Step 8: Self-vote check
      if (voterID && voterID === presenterID) {
        logAudit(voterID, 'audience', 'VOTE_REJECTED', 'vote', presenterID,
          { reason: 'self_vote' }, null);
        return { success: false, data: null, error: 'You cannot vote for yourself.' };
      }

      // Audience voting must be enabled
      if (!bool(settings.audienceVotingEnabled)) {
        return { success: false, data: null, error: 'Audience voting is not enabled for this event.' };
      }

      // Step 9: Duplicate check (voterID + presenterID)
      if (voterID) {
        var audiDup = _checkAudienceDuplicate(voterID, presenterID);
        if (audiDup) {
          logAudit(voterID, 'audience', 'VOTE_REJECTED', 'vote', presenterID,
            { reason: 'duplicate_audience_vote' }, null);
          return { success: false, data: null, error: 'You have already submitted a vote for this presenter.' };
        }
      }

    } else {
      return { success: false, data: null, error: 'Invalid voterType. Must be "judge" or "audience".' };
    }

    // ----------------------------------------------------------
    // ALL VALIDATION PASSED — STORE THE VOTE(S)
    // ----------------------------------------------------------
    var voteGroupId = generateUUID(); // Same for all rows in a multi-rubric submission
    var now         = nowISO();

    if (rubricMode === 'multi') {
      scores.forEach(function(entry) {
        var cat = rubricCategories.find(function(c) { return str(c.id) === str(entry.category); });
        appendRow(SHEET_NAMES.VOTES, {
          VoteID:          generateUUID(),
          Timestamp:       now,
          PresenterID:     presenterID,
          PresenterName:   presenterName,
          VoterType:       voterType,
          VoterID:         voterType === 'judge' ? judgeData.judgeId : voterID,
          VoterName:       voterType === 'judge' ? judgeData.judgeName : voterName,
          RubricCategoryID: str(entry.category),
          Score:           round2(parseFloat(entry.score)),
          Comment:         str(entry.comment),
          SessionToken:    voterType === 'judge' ? hashString(sessionToken) : '',
          EventDay:        eventDay,
          IPHash:          ipHash,
        }, COLUMNS.VOTES);
      });
    } else {
      // Single mode — one row with categoryID = 'total'
      var singleEntry = scores[0];
      appendRow(SHEET_NAMES.VOTES, {
        VoteID:          generateUUID(),
        Timestamp:       now,
        PresenterID:     presenterID,
        PresenterName:   presenterName,
        VoterType:       voterType,
        VoterID:         voterType === 'judge' ? judgeData.judgeId : voterID,
        VoterName:       voterType === 'judge' ? judgeData.judgeName : voterName,
        RubricCategoryID: 'total',
        Score:           round2(parseFloat(singleEntry.score)),
        Comment:         str(singleEntry.comment),
        SessionToken:    voterType === 'judge' ? hashString(sessionToken) : '',
        EventDay:        eventDay,
        IPHash:          ipHash,
      }, COLUMNS.VOTES);
    }

    // Update judge's LastActivity timestamp
    if (voterType === 'judge' && judgeData) {
      var judgeRow = findRowByColumn(SHEET_NAMES.JUDGES, 'ID', judgeData.judgeId);
      if (judgeRow) updateRow(SHEET_NAMES.JUDGES, judgeRow.rowIndex, { LastActivity: now });
    }

    logAudit(
      voterType === 'judge' ? judgeData.judgeId : (voterID || 'audience'),
      voterType,
      'VOTE_SUBMITTED',
      'vote',
      presenterID,
      { presenterName: presenterName, scoreCount: scores.length, rubricMode: rubricMode },
      voterType === 'judge' ? sessionToken : null
    );

    return {
      success: true,
      data: { voteId: voteGroupId, presenterName: presenterName, timestamp: now },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// VOTE QUERIES
// ============================================================

/**
 * Returns all votes for a given presenter.
 * @param {string} presenterId
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getVotesForPresenter(presenterId) {
  try {
    var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    var filtered = rows.filter(function(r) {
      return str(r.PresenterID) === str(presenterId);
    }).map(_mapVote);
    return { success: true, data: filtered, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns all votes submitted by a given judge.
 * @param {string} judgeId
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getVotesByJudge(judgeId) {
  try {
    var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    var filtered = rows.filter(function(r) {
      return str(r.VoterType) === 'judge' && str(r.VoterID) === str(judgeId);
    }).map(_mapVote);
    return { success: true, data: filtered, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns all votes by a specific judge for a specific presenter.
 * Used for duplicate detection.
 * @param {string} judgeId
 * @param {string} presenterId
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getVotesByJudgeForPresenter(judgeId, presenterId) {
  try {
    var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    var filtered = rows.filter(function(r) {
      return str(r.VoterType)    === 'judge'
          && str(r.VoterID)      === str(judgeId)
          && str(r.PresenterID)  === str(presenterId);
    }).map(_mapVote);
    return { success: true, data: filtered, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns all votes (admin only).
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllVotes(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    logAudit('admin', 'admin', 'RESULTS_EXPORTED', 'vote', 'all', { count: rows.length }, adminToken);
    return { success: true, data: rows.map(_mapVote), error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Deletes a single vote by VoteID (admin only — for correcting erroneous votes).
 * @param {string} voteId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function deleteVote(voteId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.VOTES, 'VoteID', str(voteId));
    if (!found) return { success: false, data: null, error: 'Vote not found: ' + voteId };

    var voteData = found.data;
    deleteRow(SHEET_NAMES.VOTES, found.rowIndex);

    logAudit('admin', 'admin', 'VOTE_DELETED', 'vote', str(voteId),
      { presenterID: str(voteData.PresenterID), voterID: str(voteData.VoterID) }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns aggregate voting statistics.
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getVotingStats() {
  try {
    var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    var judgeVotes    = rows.filter(function(r) { return str(r.VoterType) === 'judge'; });
    var audienceVotes = rows.filter(function(r) { return str(r.VoterType) === 'audience'; });

    // Unique judges who have voted
    var uniqueJudges = {};
    judgeVotes.forEach(function(r) { uniqueJudges[str(r.VoterID)] = true; });

    // Unique presenters scored
    var uniquePresenters = {};
    rows.forEach(function(r) { uniquePresenters[str(r.PresenterID)] = true; });

    return {
      success: true,
      data: {
        totalVotes:         rows.length,
        judgeVotes:         judgeVotes.length,
        audienceVotes:      audienceVotes.length,
        uniqueJudgesVoted:  Object.keys(uniqueJudges).length,
        uniquePresenters:   Object.keys(uniquePresenters).length,
        votingStatus:       getSetting('votingStatus'),
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Checks if an audience voter has already voted for a presenter.
 * @param {string} voterID
 * @param {string} presenterID
 * @returns {boolean}
 * @private
 */
function _checkAudienceDuplicate(voterID, presenterID) {
  var rows = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
  return rows.some(function(r) {
    return str(r.VoterType)   === 'audience'
        && str(r.VoterID)     === str(voterID)
        && str(r.PresenterID) === str(presenterID);
  });
}

/**
 * Maps a raw vote row to a safe public shape.
 * Strips raw session token; exposes only that it existed.
 * @param {object} row
 * @returns {object}
 * @private
 */
function _mapVote(row) {
  return {
    voteId:           str(row.VoteID),
    timestamp:        str(row.Timestamp),
    presenterID:      str(row.PresenterID),
    presenterName:    str(row.PresenterName),
    voterType:        str(row.VoterType),
    voterID:          str(row.VoterID),
    voterName:        str(row.VoterName),
    rubricCategoryID: str(row.RubricCategoryID),
    score:            num(row.Score),
    comment:          str(row.Comment),
    hasToken:         str(row.SessionToken) !== '',
    eventDay:         num(row.EventDay),
  };
}
