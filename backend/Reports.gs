/**
 * Reports.gs — Ava Judging System
 * Statistical report generation for admin analytics.
 * All functions require a valid admin token.
 */

// ============================================================
// JUDGE QUALITY REPORT
// ============================================================

/**
 * Generates the full judge quality report.
 * Per-judge stats, inter-rater reliability, outlier flags.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getJudgeQualityReport(adminToken) {
  try {
    requireValidAdminSession(adminToken);

    var allVotes  = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    var allJudges = getAllRows(SHEET_NAMES.JUDGES, COLUMNS.JUDGES)
      .filter(function(j) { return bool(j.Active); });
    var settings  = getSettings().data || {};
    var rubricCats = parseJSON(str(settings.rubricCategories), [
      { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0 }
    ]);

    var judgeVotes = allVotes.filter(function(v) { return str(v.VoterType) === 'judge'; });

    if (judgeVotes.length < 5) {
      return { success: false, data: null, error: 'Not enough data to generate this report. At least 5 judge votes are required.' };
    }

    // ----------------------------------------------------------
    // Per-judge statistics
    // ----------------------------------------------------------
    var judgeStats = allJudges.map(function(judge) {
      var jid    = str(judge.ID);
      var jVotes = judgeVotes.filter(function(v) { return str(v.VoterID) === jid; });
      var scores = jVotes.map(function(v) { return num(v.Score); });

      var uniquePresenters = {};
      jVotes.forEach(function(v) { uniquePresenters[str(v.PresenterID)] = true; });

      var stats = calculateScoreStats(scores);

      // Score distribution histogram (buckets per 5-point intervals, relative to maxJudgeScore)
      var maxScore = num(settings.maxJudgeScore) || 25;
      var buckets  = _buildHistogram(scores, 0, maxScore, 5);

      // Per-rubric mean + stdDev
      var perRubric = {};
      rubricCats.forEach(function(cat) {
        var cid      = str(cat.id);
        var catScores = jVotes
          .filter(function(v) { return str(v.RubricCategoryID) === cid; })
          .map(function(v) { return num(v.Score); });
        perRubric[cid] = Object.assign({ categoryName: str(cat.name) }, calculateScoreStats(catScores));
      });

      // Response time: avg ms between consecutive submissions (sorted by timestamp)
      var avgResponseMs = _computeAvgResponseTime(jVotes);

      return {
        judgeId:           jid,
        judgeName:         str(judge.Name),
        judgeEmail:        str(judge.Email),
        presentersScored:  Object.keys(uniquePresenters).length,
        totalVotes:        jVotes.length,
        mean:              stats.mean,
        stdDev:            stats.stdDev,
        min:               stats.min,
        max:               stats.max,
        median:            stats.median,
        histogram:         buckets,
        perRubric:         perRubric,
        avgResponseMinutes: avgResponseMs > 0 ? round2(avgResponseMs / 60000) : null,
        lastActivity:      str(judge.LastActivity),
        allScores:         scores,  // kept for correlation matrix — stripped before response
      };
    }).filter(function(j) { return j.totalVotes > 0; });

    // ----------------------------------------------------------
    // Outlier flagging: flag judges whose mean is > 1.5 SD from group mean
    // ----------------------------------------------------------
    var groupMeans = judgeStats.map(function(j) { return j.mean; });
    var groupStats = calculateScoreStats(groupMeans);
    var outlierThreshold = 1.5;

    judgeStats.forEach(function(j) {
      var deviation = groupStats.stdDev > 0
        ? Math.abs(j.mean - groupStats.mean) / groupStats.stdDev
        : 0;
      j.isOutlier       = deviation > outlierThreshold;
      j.outlierDeviation = round2(deviation);
    });

    // ----------------------------------------------------------
    // Inter-rater reliability — simplified Intraclass Correlation Coefficient
    // ----------------------------------------------------------
    var irrResult = _computeICC(judgeStats);

    // ----------------------------------------------------------
    // Pairwise judge correlation matrix
    // ----------------------------------------------------------
    var correlationMatrix = _computeCorrelationMatrix(judgeVotes, allJudges);

    // Strip raw allScores from final output
    judgeStats.forEach(function(j) { delete j.allScores; });

    logAudit('admin', 'admin', 'RESULTS_EXPORTED', 'report', 'judge_quality', {}, adminToken);

    return {
      success: true,
      data: {
        generatedAt:       nowISO(),
        eventName:         str(settings.eventName),
        judgeStats:        judgeStats,
        groupMean:         groupStats.mean,
        groupStdDev:       groupStats.stdDev,
        icc:               irrResult,
        correlationMatrix: correlationMatrix,
        totalJudges:       judgeStats.length,
        totalVotes:        judgeVotes.length,
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// COMPETITOR SCORECARD DATA
// ============================================================

/**
 * Returns all data needed to generate a competitor's scorecard PDF.
 * @param {string} presenterId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getCompetitorScorecardData(presenterId, adminToken) {
  try {
    requireValidAdminSession(adminToken);

    var presResult = getPresenter(presenterId);
    if (!presResult.success) return presResult;
    var presenter  = presResult.data;

    var resultFound = findRowByColumn(SHEET_NAMES.RESULTS, 'PresenterID', str(presenterId));
    if (!resultFound) {
      return { success: false, data: null, error: 'No results found for this presenter. Refresh results first.' };
    }

    var settings   = getSettings().data || {};
    var rubricCats = parseJSON(str(settings.rubricCategories), [
      { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0 }
    ]);

    var resultRow    = resultFound.data;
    var breakdown    = parseJSON(str(resultRow.RubricBreakdown), {});
    var percentilesR = getPresenterPercentiles(presenterId);
    var percentiles  = percentilesR.success ? percentilesR.data : {};

    // All results for event averages per rubric
    var allResults = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS)
      .filter(function(r) { return bool(r.Active); });
    var eventAvgBreakdown = {};
    allResults.forEach(function(r) {
      var bd = parseJSON(str(r.RubricBreakdown), {});
      rubricCats.forEach(function(cat) {
        var cid = str(cat.id);
        if (!eventAvgBreakdown[cid]) eventAvgBreakdown[cid] = [];
        if (bd[cid]) eventAvgBreakdown[cid].push(num(bd[cid].avg));
      });
    });
    var rubricEventAvgs = {};
    Object.keys(eventAvgBreakdown).forEach(function(cid) {
      var s = calculateScoreStats(eventAvgBreakdown[cid]);
      rubricEventAvgs[cid] = s.mean;
    });

    // Anonymized judge comments
    var allVotes  = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);
    var presVotes = allVotes.filter(function(v) {
      return str(v.PresenterID) === str(presenterId)
          && str(v.VoterType)   === 'judge'
          && str(v.Comment)     !== '';
    });
    var comments = presVotes.map(function(v) {
      return { category: str(v.RubricCategoryID), comment: str(v.Comment) };
    });

    // Strengths: rubrics where presenter scored above event avg
    var strengths = [];
    var growthAreas = [];
    rubricCats.forEach(function(cat) {
      var cid     = str(cat.id);
      var presAvg = breakdown[cid] ? num(breakdown[cid].avg) : 0;
      var evtAvg  = rubricEventAvgs[cid] || 0;
      if (presAvg > evtAvg) strengths.push({ categoryId: cid, categoryName: str(cat.name), presAvg: round2(presAvg), eventAvg: round2(evtAvg) });
      else if (presAvg < evtAvg) growthAreas.push({ categoryId: cid, categoryName: str(cat.name), presAvg: round2(presAvg), eventAvg: round2(evtAvg) });
    });

    logAudit('admin', 'admin', 'RESULTS_EXPORTED', 'report', 'scorecard_' + presenterId, {}, adminToken);

    return {
      success: true,
      data: {
        presenter:         presenter,
        eventName:         str(settings.eventName),
        eventDate:         str(settings.eventDate),
        generatedAt:       nowISO(),
        overallRank:       num(resultRow.OverallRank),
        trackRank:         num(resultRow.TrackRank),
        totalPresenters:   allResults.length,
        trackPresenters:   allResults.filter(function(r) { return str(r.Track) === presenter.track; }).length,
        judgeAvg:          round2(num(resultRow.JudgeAvg)),
        audienceAvg:       round2(num(resultRow.AudienceAvg)),
        finalScore:        round2(num(resultRow.FinalScore)),
        judgeVoteCount:    num(resultRow.JudgeVoteCount),
        rubricBreakdown:   breakdown,
        rubricCategories:  rubricCats,
        rubricEventAvgs:   rubricEventAvgs,
        percentiles:       percentiles.rubricPercentiles || {},
        overallPercentile: percentiles.overallPercentile || 0,
        comments:          comments,
        strengths:         strengths,
        growthAreas:       growthAreas,
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// EVENT SUMMARY REPORT
// ============================================================

/**
 * Returns complete event statistics.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getEventSummaryData(adminToken) {
  try {
    requireValidAdminSession(adminToken);

    var settings    = getSettings().data || {};
    var allResults  = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS).filter(function(r) { return bool(r.Active); });
    var allVotes    = getAllRows(SHEET_NAMES.VOTES,    COLUMNS.VOTES);
    var allJudges   = getAllRows(SHEET_NAMES.JUDGES,   COLUMNS.JUDGES).filter(function(j) { return bool(j.Active); });
    var allPresenters = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS).filter(function(p) { return bool(p.Active); });
    var rubricCats  = parseJSON(str(settings.rubricCategories), [
      { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0 }
    ]);

    // Score distribution across all presenters
    var finalScores   = allResults.map(function(r) { return num(r.FinalScore); });
    var scoreStats    = calculateScoreStats(finalScores);
    var scoreHistogram = _buildHistogram(finalScores, 0, 100, 10);

    // Top 10 presenters
    var top10 = allResults
      .slice().sort(function(a, b) { return num(a.OverallRank) - num(b.OverallRank); })
      .slice(0, 10)
      .map(_mapResult);

    // Winners per track
    var trackWinnersMap = {};
    allResults.forEach(function(r) {
      var t = str(r.Track);
      if (!t) return;
      if (!trackWinnersMap[t]) trackWinnersMap[t] = [];
      trackWinnersMap[t].push(r);
    });
    var trackWinners = Object.keys(trackWinnersMap).map(function(t) {
      var sorted = trackWinnersMap[t].sort(function(a, b) { return num(a.TrackRank) - num(b.TrackRank); });
      return {
        track:   t,
        winners: sorted.slice(0, 3).map(function(r, i) { return Object.assign(_mapResult(r), { place: i + 1 }); }),
      };
    });

    // Rubric difficulty analysis
    var rubricDifficulty = _computeRubricDifficulty(allResults, rubricCats);

    // Judge participation
    var judgeProgress = [];
    allJudges.forEach(function(judge) {
      var jid    = str(judge.ID);
      var jVotes = allVotes.filter(function(v) { return str(v.VoterType) === 'judge' && str(v.VoterID) === jid; });
      var unique = {};
      jVotes.forEach(function(v) { unique[str(v.PresenterID)] = true; });
      var scored = Object.keys(unique).length;
      var total  = allPresenters.length;
      judgeProgress.push({
        judgeId:      jid,
        judgeName:    str(judge.Name),
        scored:       scored,
        total:        total,
        pct:          total > 0 ? Math.round((scored / total) * 100) : 0,
        loggedIn:     bool(judge.TokenUsed),
        lastActivity: str(judge.LastActivity),
      });
    });

    // Voting timeline (votes per hour)
    var timeline = getVotingTimeline(adminToken).data || [];

    // Audience vs judge score correlation
    var audienceJudgeCorrelation = _computeAudienceJudgeCorrelation(allResults);

    logAudit('admin', 'admin', 'RESULTS_EXPORTED', 'report', 'event_summary', {}, adminToken);

    return {
      success: true,
      data: {
        eventName:        str(settings.eventName),
        eventDate:        str(settings.eventDate),
        generatedAt:      nowISO(),
        totalPresenters:  allPresenters.length,
        totalJudges:      allJudges.length,
        totalVotes:       allVotes.length,
        judgeVotes:       allVotes.filter(function(v) { return str(v.VoterType) === 'judge'; }).length,
        audienceVotes:    allVotes.filter(function(v) { return str(v.VoterType) === 'audience'; }).length,
        votingStatus:     str(settings.votingStatus),
        scoreStats:       scoreStats,
        scoreHistogram:   scoreHistogram,
        top10:            top10,
        trackWinners:     trackWinners,
        rubricDifficulty: rubricDifficulty,
        judgeProgress:    judgeProgress,
        votingTimeline:   timeline,
        audienceJudgeCorrelation: audienceJudgeCorrelation,
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// VOTING TIMELINE
// ============================================================

/**
 * Returns vote counts aggregated by hour for charting.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getVotingTimeline(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var allVotes = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);

    var byHour = {};
    allVotes.forEach(function(v) {
      var d = toDate(str(v.Timestamp));
      if (!d) return;
      var key = d.getFullYear() + '-'
        + String(d.getMonth() + 1).padStart(2, '0') + '-'
        + String(d.getDate()).padStart(2, '0') + ' '
        + String(d.getHours()).padStart(2, '0') + ':00';
      if (!byHour[key]) byHour[key] = { hour: key, judgeVotes: 0, audienceVotes: 0, total: 0 };
      byHour[key].total++;
      if (str(v.VoterType) === 'judge') byHour[key].judgeVotes++;
      else byHour[key].audienceVotes++;
    });

    var sorted = Object.keys(byHour).sort().map(function(k) { return byHour[k]; });
    return { success: true, data: sorted, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// RUBRIC DIFFICULTY ANALYSIS
// ============================================================

/**
 * Returns per-rubric difficulty statistics.
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getRubricDifficultyAnalysis(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var allResults = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS).filter(function(r) { return bool(r.Active); });
    var settings   = getSettings().data || {};
    var rubricCats = parseJSON(str(settings.rubricCategories), [
      { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0 }
    ]);
    return { success: true, data: _computeRubricDifficulty(allResults, rubricCats), error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTER-RATER RELIABILITY
// ============================================================

/**
 * Computes a simplified Intraclass Correlation Coefficient (ICC).
 * Uses the two-way random effects model (ICC 2,1).
 * @param {string} adminToken
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function calculateInterRaterReliability(adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var allJudges = getAllRows(SHEET_NAMES.JUDGES, COLUMNS.JUDGES)
      .filter(function(j) { return bool(j.Active); });
    var allVotes = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES)
      .filter(function(v) { return str(v.VoterType) === 'judge'; });

    var judgeStats = allJudges.map(function(j) {
      var jid    = str(j.ID);
      var scores = allVotes.filter(function(v) { return str(v.VoterID) === jid; })
                           .map(function(v) { return num(v.Score); });
      return { judgeId: jid, allScores: scores };
    }).filter(function(j) { return j.allScores.length > 0; });

    var iccResult = _computeICC(judgeStats);
    return { success: true, data: iccResult, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTERNAL STATISTICAL HELPERS
// ============================================================

/**
 * Builds a histogram with evenly-spaced buckets.
 * @param {number[]} values
 * @param {number} min
 * @param {number} max
 * @param {number} bucketSize
 * @returns {Array<{ label: string, count: number, min: number, max: number }>}
 * @private
 */
function _buildHistogram(values, min, max, bucketSize) {
  var buckets = [];
  for (var lo = min; lo < max; lo += bucketSize) {
    var hi = lo + bucketSize;
    buckets.push({
      label: lo + '–' + hi,
      min:   lo,
      max:   hi,
      count: values.filter(function(v) { return v >= lo && (hi >= max ? v <= hi : v < hi); }).length,
    });
  }
  return buckets;
}

/**
 * Computes average time (ms) between consecutive votes for a judge.
 * @param {object[]} jVotes
 * @returns {number} Average gap in ms, or 0 if fewer than 2 votes.
 * @private
 */
function _computeAvgResponseTime(jVotes) {
  if (!jVotes || jVotes.length < 2) return 0;
  var sorted = jVotes.slice().sort(function(a, b) {
    return new Date(str(a.Timestamp)).getTime() - new Date(str(b.Timestamp)).getTime();
  });
  var gaps = [];
  for (var i = 1; i < sorted.length; i++) {
    var t1 = new Date(str(sorted[i - 1].Timestamp)).getTime();
    var t2 = new Date(str(sorted[i].Timestamp)).getTime();
    if (!isNaN(t1) && !isNaN(t2) && t2 > t1) gaps.push(t2 - t1);
  }
  if (gaps.length === 0) return 0;
  return gaps.reduce(function(a, b) { return a + b; }, 0) / gaps.length;
}

/**
 * Computes simplified ICC (Krippendorff-inspired) from judge score arrays.
 * Returns icc value (0–1) and interpretation label.
 * @param {object[]} judgeStats - Each has allScores[] or mean/stdDev.
 * @returns {{ icc: number, interpretation: string, judgeCount: number }}
 * @private
 */
function _computeICC(judgeStats) {
  var allScores = [];
  judgeStats.forEach(function(j) {
    if (j.allScores) allScores = allScores.concat(j.allScores);
  });

  if (allScores.length < 4 || judgeStats.length < 2) {
    return { icc: null, interpretation: 'insufficient_data', judgeCount: judgeStats.length };
  }

  var grandMean = allScores.reduce(function(a, b) { return a + b; }, 0) / allScores.length;

  // Between-judges variance
  var judgeMeans = judgeStats
    .filter(function(j) { return j.allScores && j.allScores.length > 0; })
    .map(function(j) {
      return j.allScores.reduce(function(a, b) { return a + b; }, 0) / j.allScores.length;
    });
  var bv = judgeMeans.reduce(function(s, m) { return s + Math.pow(m - grandMean, 2); }, 0)
    / Math.max(1, judgeMeans.length - 1);

  // Within-judges variance
  var wvParts = judgeStats
    .filter(function(j) { return j.allScores && j.allScores.length > 1; })
    .map(function(j) {
      var jMean = j.allScores.reduce(function(a, b) { return a + b; }, 0) / j.allScores.length;
      return j.allScores.reduce(function(s, v) { return s + Math.pow(v - jMean, 2); }, 0)
        / (j.allScores.length - 1);
    });
  var wv = wvParts.length > 0
    ? wvParts.reduce(function(a, b) { return a + b; }, 0) / wvParts.length
    : 0;

  var icc = wv + bv > 0 ? bv / (bv + wv) : 0;
  icc = Math.min(1, Math.max(0, round2(icc)));

  var interpretation = icc < 0.4 ? 'poor'
    : icc < 0.6 ? 'fair'
    : icc < 0.75 ? 'good'
    : 'excellent';

  return { icc: icc, interpretation: interpretation, judgeCount: judgeStats.length };
}

/**
 * Builds a pairwise Pearson correlation matrix between judges based on
 * scores for shared presenters.
 * @param {object[]} judgeVotes
 * @param {object[]} allJudges
 * @returns {object} { judges: string[], matrix: number[][] }
 * @private
 */
function _computeCorrelationMatrix(judgeVotes, allJudges) {
  var judgeIds = allJudges
    .filter(function(j) { return bool(j.Active); })
    .map(function(j) { return str(j.ID); });

  var judgeNames = {};
  allJudges.forEach(function(j) { judgeNames[str(j.ID)] = str(j.Name); });

  // Build score map: judgeId -> { presenterID -> mean score }
  var scoreMap = {};
  judgeIds.forEach(function(jid) {
    scoreMap[jid] = {};
    var jv = judgeVotes.filter(function(v) { return str(v.VoterID) === jid; });
    var presGroups = {};
    jv.forEach(function(v) {
      var pid = str(v.PresenterID);
      if (!presGroups[pid]) presGroups[pid] = [];
      presGroups[pid].push(num(v.Score));
    });
    Object.keys(presGroups).forEach(function(pid) {
      var arr = presGroups[pid];
      scoreMap[jid][pid] = arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
    });
  });

  var n = judgeIds.length;
  var matrix = [];
  for (var i = 0; i < n; i++) {
    matrix.push([]);
    for (var j2 = 0; j2 < n; j2++) {
      if (i === j2) { matrix[i].push(1.0); continue; }
      var corr = _pearsonCorrelation(scoreMap[judgeIds[i]], scoreMap[judgeIds[j2]]);
      matrix[i].push(corr);
    }
  }

  return {
    judges: judgeIds.map(function(id) { return { id: id, name: judgeNames[id] || id }; }),
    matrix: matrix,
  };
}

/**
 * Computes Pearson correlation between two judge score maps over shared presenters.
 * @param {object} mapA - { presenterID: score }
 * @param {object} mapB - { presenterID: score }
 * @returns {number} -1 to 1, or null if insufficient shared data.
 * @private
 */
function _pearsonCorrelation(mapA, mapB) {
  var shared = Object.keys(mapA).filter(function(pid) { return pid in mapB; });
  if (shared.length < 3) return null;

  var xs = shared.map(function(pid) { return mapA[pid]; });
  var ys = shared.map(function(pid) { return mapB[pid]; });
  var n  = shared.length;

  var mx = xs.reduce(function(a, b) { return a + b; }, 0) / n;
  var my = ys.reduce(function(a, b) { return a + b; }, 0) / n;

  var num_ = 0, denX = 0, denY = 0;
  for (var i = 0; i < n; i++) {
    var dx = xs[i] - mx;
    var dy = ys[i] - my;
    num_ += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  var denom = Math.sqrt(denX * denY);
  if (denom === 0) return 0;
  return round2(num_ / denom);
}

/**
 * Computes per-rubric averages across all presenters.
 * @param {object[]} allResults
 * @param {object[]} rubricCats
 * @returns {object[]}
 * @private
 */
function _computeRubricDifficulty(allResults, rubricCats) {
  return rubricCats.map(function(cat) {
    var cid  = str(cat.id);
    var avgs = allResults.map(function(r) {
      var bd = parseJSON(str(r.RubricBreakdown), {});
      return bd[cid] ? num(bd[cid].avg) : null;
    }).filter(function(v) { return v !== null; });

    var stats = calculateScoreStats(avgs);
    return {
      categoryId:   cid,
      categoryName: str(cat.name),
      maxScore:     num(cat.maxScore),
      mean:         stats.mean,
      stdDev:       stats.stdDev,
      min:          stats.min,
      max:          stats.max,
      count:        stats.count,
    };
  }).sort(function(a, b) { return a.mean - b.mean }); // hardest first
}

/**
 * Computes correlation between audience and judge scores per presenter.
 * @param {object[]} allResults
 * @returns {{ correlation: number|null, count: number }}
 * @private
 */
function _computeAudienceJudgeCorrelation(allResults) {
  var pairs = allResults.filter(function(r) {
    return num(r.JudgeVoteCount) > 0 && num(r.AudienceVoteCount) > 0;
  });

  if (pairs.length < 3) return { correlation: null, count: pairs.length };

  var judgeMap = {};
  var audiMap  = {};
  pairs.forEach(function(r) {
    judgeMap[str(r.PresenterID)] = num(r.JudgeAvg);
    audiMap[str(r.PresenterID)]  = num(r.AudienceAvg);
  });

  return {
    correlation: _pearsonCorrelation(judgeMap, audiMap),
    count:       pairs.length,
  };
}
