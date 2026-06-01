/**
 * Results.gs — Ava Judging System
 * Score computation, ranking, and leaderboard generation.
 * Results are computed on-demand and written to the Results sheet.
 */

// ============================================================
// REFRESH RESULTS — MASTER COMPUTATION
// ============================================================

/**
 * Recomputes the entire Results sheet from the Votes sheet.
 * Called manually by admin or via time-based trigger.
 * Steps:
 *  1. Load all votes, settings, presenters, tracks
 *  2. For each presenter: compute judge avg, audience avg, per-rubric breakdown
 *  3. Compute final weighted score
 *  4. Rank overall and per-track
 *  5. Write to Results sheet (clear + rewrite)
 * @returns {{ success: boolean, data: { count: number }, error: string|null }}
 */
function refreshResults() {
  try {
    var settings = getSettings().data || {};
    var judgeWeight    = num(settings.judgeWeight)    || 75;
    var audienceWeight = num(settings.audienceWeight) || 25;
    var rubricMode     = str(settings.rubricMode)     || 'single';
    var rubricCats     = parseJSON(str(settings.rubricCategories), [
      { id: 'total', name: 'Overall Score', maxScore: 25, weight: 1.0 }
    ]);
    var maxJudgeScore  = num(settings.maxJudgeScore)  || 25;
    var maxAudiScore   = num(settings.maxAudienceScore) || 25;

    // Load all active presenters
    var presenters = getAllRows(SHEET_NAMES.PRESENTERS, COLUMNS.PRESENTERS)
      .filter(function(p) { return bool(p.Active); });

    // Load all votes
    var allVotes = getAllRows(SHEET_NAMES.VOTES, COLUMNS.VOTES);

    // Group votes by presenter
    var votesByPresenter = {};
    allVotes.forEach(function(v) {
      var pid = str(v.PresenterID);
      if (!votesByPresenter[pid]) votesByPresenter[pid] = [];
      votesByPresenter[pid].push(v);
    });

    // Compute results per presenter
    var results = presenters.map(function(p) {
      var pid    = str(p.ID);
      var pvotes = votesByPresenter[pid] || [];

      var judgeVotes    = pvotes.filter(function(v) { return str(v.VoterType) === 'judge'; });
      var audienceVotes = pvotes.filter(function(v) { return str(v.VoterType) === 'audience'; });

      // Per-rubric breakdown for judge votes
      var rubricBreakdown = _computeRubricBreakdown(judgeVotes, rubricCats);

      // Judge average (normalized to 0–maxJudgeScore scale)
      var judgeAvg = _computeJudgeAverage(judgeVotes, rubricCats, rubricMode, maxJudgeScore);

      // Audience average (simple mean of all audience scores)
      var audienceAvg = audienceVotes.length > 0
        ? audienceVotes.reduce(function(sum, v) { return sum + num(v.Score); }, 0) / audienceVotes.length
        : 0;

      // Final weighted composite score (normalised to 0–100)
      var finalScore = calculateFinalScore(judgeAvg, audienceAvg, judgeWeight, audienceWeight,
                                           maxJudgeScore, maxAudiScore);

      // Count unique judges who scored this presenter
      var uniqueJudgeIds = {};
      judgeVotes.forEach(function(v) { uniqueJudgeIds[str(v.VoterID)] = true; });
      var uniqueAudiIds = {};
      audienceVotes.forEach(function(v) { uniqueAudiIds[str(v.VoterID)] = true; });

      return {
        PresenterID:        pid,
        Name:               str(p.Name),
        Department:         str(p.Department),
        Track:              str(p.Track),
        JudgeAvg:           round2(judgeAvg),
        AudienceAvg:        round2(audienceAvg),
        FinalScore:         round2(finalScore),
        JudgeVoteCount:     Object.keys(uniqueJudgeIds).length,
        AudienceVoteCount:  Object.keys(uniqueAudiIds).length,
        RubricBreakdown:    JSON.stringify(rubricBreakdown),
        OverallRank:        0,   // filled in below
        TrackRank:          0,   // filled in below
        CheckedIn:          bool(p.CheckedIn),
        Active:             true,
        _finalScore:        finalScore, // internal sort key
        _track:             str(p.Track),
      };
    });

    // Overall ranking — sort by FinalScore desc, apply tiebreaker
    var tiebreakerRule = str(settings.tiebreakerRule) || 'judge_avg';
    results = _applyRanking(results, tiebreakerRule, judgeVotes = null);

    // Track ranking — for each track, rank within track
    var trackGroups = {};
    results.forEach(function(r) {
      var t = r._track || '';
      if (!trackGroups[t]) trackGroups[t] = [];
      trackGroups[t].push(r);
    });
    Object.keys(trackGroups).forEach(function(t) {
      var sorted = _sortByScore(trackGroups[t], tiebreakerRule);
      sorted.forEach(function(r, idx) { r.TrackRank = idx + 1; });
    });

    // Clear the Results sheet and rewrite
    var sheet = getSheet(SHEET_NAMES.RESULTS);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);

    results.forEach(function(r) {
      // Remove internal sort helpers before writing
      var writeRow = {
        PresenterID:       r.PresenterID,
        Name:              r.Name,
        Department:        r.Department,
        Track:             r.Track,
        JudgeAvg:          r.JudgeAvg,
        AudienceAvg:       r.AudienceAvg,
        FinalScore:        r.FinalScore,
        JudgeVoteCount:    r.JudgeVoteCount,
        AudienceVoteCount: r.AudienceVoteCount,
        RubricBreakdown:   r.RubricBreakdown,
        OverallRank:       r.OverallRank,
        TrackRank:         r.TrackRank,
        CheckedIn:         r.CheckedIn,
        Active:            r.Active,
      };
      appendRow(SHEET_NAMES.RESULTS, writeRow, COLUMNS.RESULTS);
    });

    logAudit('system', 'system', 'RESULTS_REFRESHED', 'results', 'all',
      { count: results.length }, null);

    return { success: true, data: { count: results.length }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// LEADERBOARD & RESULTS QUERIES
// ============================================================

/**
 * Returns the leaderboard, optionally filtered by track.
 * Results are read from the pre-computed Results sheet.
 * @param {string} [trackId] - If provided, filters to this track.
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getLeaderboard(trackId) {
  try {
    var rows = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS);
    var active = rows.filter(function(r) { return bool(r.Active); });

    if (trackId && str(trackId) !== '') {
      active = active.filter(function(r) { return str(r.Track) === str(trackId); });
      active.sort(function(a, b) { return num(a.TrackRank) - num(b.TrackRank); });
    } else {
      active.sort(function(a, b) { return num(a.OverallRank) - num(b.OverallRank); });
    }

    var settings      = getSettings().data || {};
    var publicBoard   = bool(settings.publicLeaderboard);

    return {
      success: true,
      data: {
        isPublic:  publicBoard,
        updatedAt: nowISO(),
        rows: active.map(function(r) { return _mapResult(r); }),
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns the full result for a single presenter including rubric breakdown.
 * @param {string} presenterId
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function getPresenterResult(presenterId) {
  try {
    var found = findRowByColumn(SHEET_NAMES.RESULTS, 'PresenterID', str(presenterId));
    if (!found) {
      return { success: false, data: null, error: 'No result found for presenter: ' + presenterId };
    }
    var result = _mapResult(found.data);
    result.rubricBreakdown = parseJSON(str(found.data.RubricBreakdown), {});
    return { success: true, data: result, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns the top 3 overall winners plus top 3 per track.
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getWinners() {
  try {
    var rows = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS)
      .filter(function(r) { return bool(r.Active); });

    rows.sort(function(a, b) { return num(a.OverallRank) - num(b.OverallRank); });

    var overall = rows.slice(0, 3).map(function(r, i) {
      return Object.assign(_mapResult(r), { place: i + 1 });
    });

    // Per-track winners
    var trackGroups = {};
    rows.forEach(function(r) {
      var t = str(r.Track);
      if (!t) return;
      if (!trackGroups[t]) trackGroups[t] = [];
      trackGroups[t].push(r);
    });

    var tracks = [];
    Object.keys(trackGroups).forEach(function(trackId) {
      var sorted = trackGroups[trackId].sort(function(a, b) { return num(a.TrackRank) - num(b.TrackRank); });
      tracks.push({
        trackId: trackId,
        winners: sorted.slice(0, 3).map(function(r, i) {
          return Object.assign(_mapResult(r), { place: i + 1 });
        }),
      });
    });

    return { success: true, data: { overall: overall, tracks: tracks }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

/**
 * Returns percentile ranks for a presenter across all rubric categories.
 * @param {string} presenterId
 * @returns {{ success: boolean, data: object, error: string|null }}
 */
function getPresenterPercentiles(presenterId) {
  try {
    var allResults = getAllRows(SHEET_NAMES.RESULTS, COLUMNS.RESULTS)
      .filter(function(r) { return bool(r.Active); });

    var target = allResults.find(function(r) { return str(r.PresenterID) === str(presenterId); });
    if (!target) return { success: false, data: null, error: 'Presenter result not found.' };

    var allFinalScores = allResults.map(function(r) { return num(r.FinalScore); });
    var overallPct = _percentile(num(target.FinalScore), allFinalScores);

    var rubricBreakdown = parseJSON(str(target.RubricBreakdown), {});
    var rubricPercentiles = {};

    Object.keys(rubricBreakdown).forEach(function(catId) {
      var catAvgs = allResults.map(function(r) {
        var bd = parseJSON(str(r.RubricBreakdown), {});
        return bd[catId] ? num(bd[catId].avg) : 0;
      });
      rubricPercentiles[catId] = _percentile(num(rubricBreakdown[catId].avg), catAvgs);
    });

    return {
      success: true,
      data: {
        presenterId:       presenterId,
        overallPercentile: overallPct,
        rubricPercentiles: rubricPercentiles,
        totalPresenters:   allResults.length,
      },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// SCORE STATISTICS
// ============================================================

/**
 * Computes descriptive statistics for an array of scores.
 * @param {number[]} scores
 * @returns {{ mean, median, stdDev, min, max, count }}
 */
function calculateScoreStats(scores) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 };
  }
  var sorted = scores.slice().sort(function(a, b) { return a - b; });
  var count  = sorted.length;
  var sum    = sorted.reduce(function(a, b) { return a + b; }, 0);
  var mean   = sum / count;

  var mid    = Math.floor(count / 2);
  var median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  var variance = sorted.reduce(function(s, v) { return s + Math.pow(v - mean, 2); }, 0) / count;
  var stdDev   = Math.sqrt(variance);

  return {
    mean:   round2(mean),
    median: round2(median),
    stdDev: round2(stdDev),
    min:    round2(sorted[0]),
    max:    round2(sorted[count - 1]),
    count:  count,
  };
}

/**
 * Computes the final weighted composite score.
 * Normalises both judge and audience averages to 0–100 before weighting.
 * @param {number} judgeAvg         - Raw judge average (0–maxJudgeScore)
 * @param {number} audienceAvg      - Raw audience average (0–maxAudiScore)
 * @param {number} judgeWeight      - Percentage 0–100
 * @param {number} audienceWeight   - Percentage 0–100
 * @param {number} maxJudgeScore
 * @param {number} maxAudiScore
 * @returns {number} 0–100 composite
 */
function calculateFinalScore(judgeAvg, audienceAvg, judgeWeight, audienceWeight,
                              maxJudgeScore, maxAudiScore) {
  var jNorm = maxJudgeScore > 0 ? (judgeAvg / maxJudgeScore) * 100 : 0;
  var aNorm = maxAudiScore  > 0 ? (audienceAvg / maxAudiScore) * 100 : 0;
  return (jNorm * judgeWeight / 100) + (aNorm * audienceWeight / 100);
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Computes the judge average score for a presenter, normalized to maxJudgeScore.
 * For multi-rubric: weighted average across categories, then normalised.
 * For single: simple mean.
 * @private
 */
function _computeJudgeAverage(judgeVotes, rubricCats, rubricMode, maxJudgeScore) {
  if (!judgeVotes || judgeVotes.length === 0) return 0;

  if (rubricMode === 'single') {
    var scores = judgeVotes.map(function(v) { return num(v.Score); });
    return scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
  }

  // Multi-rubric: compute weighted average of per-category averages
  var catScores = {};
  judgeVotes.forEach(function(v) {
    var cid = str(v.RubricCategoryID);
    if (!catScores[cid]) catScores[cid] = [];
    catScores[cid].push(num(v.Score));
  });

  var totalWeight = 0;
  var weightedSum = 0;

  rubricCats.forEach(function(cat) {
    var cid  = str(cat.id);
    var cmax = num(cat.maxScore) || 1;
    var w    = num(cat.weight)   || 1;
    totalWeight += w;

    var catArr = catScores[cid] || [];
    var catAvg = catArr.length > 0
      ? catArr.reduce(function(a, b) { return a + b; }, 0) / catArr.length
      : 0;

    // Normalize to maxJudgeScore scale before weighting
    weightedSum += (catAvg / cmax) * maxJudgeScore * w;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Computes per-rubric statistics for a set of judge votes.
 * @param {object[]} judgeVotes
 * @param {object[]} rubricCats
 * @returns {object} { categoryId: { avg, count, stdDev, min, max } }
 * @private
 */
function _computeRubricBreakdown(judgeVotes, rubricCats) {
  var result = {};
  rubricCats.forEach(function(cat) {
    var cid = str(cat.id);
    var catVotes = judgeVotes.filter(function(v) { return str(v.RubricCategoryID) === cid; });
    var catScores = catVotes.map(function(v) { return num(v.Score); });
    result[cid] = calculateScoreStats(catScores);
    result[cid].categoryName = str(cat.name);
    result[cid].maxScore     = num(cat.maxScore);
  });
  return result;
}

/**
 * Sorts result rows by FinalScore desc, with tiebreaker.
 * @param {object[]} rows
 * @param {string} tiebreakerRule
 * @returns {object[]}
 * @private
 */
function _sortByScore(rows, tiebreakerRule) {
  return rows.slice().sort(function(a, b) {
    var diff = num(b._finalScore) - num(a._finalScore);
    if (diff !== 0) return diff;
    if (tiebreakerRule === 'vote_count') {
      return num(b.JudgeVoteCount) - num(a.JudgeVoteCount);
    }
    if (tiebreakerRule === 'random') {
      return Math.random() - 0.5;
    }
    // Default: judge_avg
    return num(b.JudgeAvg) - num(a.JudgeAvg);
  });
}

/**
 * Applies overall ranking to result rows (modifies in-place).
 * @param {object[]} rows
 * @param {string} tiebreakerRule
 * @returns {object[]}
 * @private
 */
function _applyRanking(rows, tiebreakerRule) {
  var sorted = _sortByScore(rows, tiebreakerRule);
  sorted.forEach(function(r, idx) { r.OverallRank = idx + 1; });
  return sorted;
}

/**
 * Computes the percentile of a value within an array of values.
 * Returns 0–100.
 * @param {number} value
 * @param {number[]} allValues
 * @returns {number}
 * @private
 */
function _percentile(value, allValues) {
  if (!allValues || allValues.length === 0) return 0;
  var below = allValues.filter(function(v) { return v < value; }).length;
  return Math.round((below / allValues.length) * 100);
}

/**
 * Maps a raw result row to a public shape.
 * @param {object} row
 * @returns {object}
 * @private
 */
function _mapResult(row) {
  return {
    PresenterID:       str(row.PresenterID),
    Name:              str(row.Name),
    Department:        str(row.Department),
    Track:             str(row.Track),
    JudgeAvg:          round2(num(row.JudgeAvg)),
    AudienceAvg:       round2(num(row.AudienceAvg)),
    FinalScore:        round2(num(row.FinalScore)),
    JudgeVoteCount:    num(row.JudgeVoteCount),
    AudienceVoteCount: num(row.AudienceVoteCount),
    RubricBreakdown:   str(row.RubricBreakdown),
    OverallRank:       num(row.OverallRank),
    TrackRank:         num(row.TrackRank),
    CheckedIn:         bool(row.CheckedIn),
    Active:            bool(row.Active),
  };
}
