/**
 * scoring.js — Ava Judging System
 * Client-side score calculation and validation.
 * Mirrors the validation logic in backend/Votes.gs so errors are caught
 * before the network round-trip, but the server ALWAYS validates too.
 */

import { CONFIG } from './config.js';
import { STRINGS, interpolate } from './i18n.js';

/* ============================================================
   VALIDATION
   ============================================================ */

/**
 * Result object returned by all validate* functions.
 * @typedef {{ valid: boolean, error: string|null }} ValidationResult
 */

/**
 * Validates a single numeric score against a min, max, and decimal-place limit.
 * @param {number|string} score - The value to validate (accepts string from input)
 * @param {number} min - Minimum allowed value (inclusive)
 * @param {number} max - Maximum allowed value (inclusive)
 * @param {number} [decimals=2] - Maximum allowed decimal places
 * @returns {ValidationResult}
 */
export function validateScore(score, min, max, decimals = CONFIG.SCORING.DECIMAL_PLACES) {
  const num = parseFloat(score);

  if (score === '' || score === null || score === undefined || isNaN(num)) {
    return { valid: false, error: STRINGS.errors.invalidScoreNumber };
  }

  if (num < min || num > max) {
    return {
      valid: false,
      error: interpolate(STRINGS.errors.invalidScore, { min, max }),
    };
  }

  if (decimals >= 0) {
    const factor = Math.pow(10, decimals);
    if (Math.round(num * factor * 10) % 10 !== 0) {
      return {
        valid: false,
        error: interpolate(STRINGS.errors.invalidScoreDecimal, { places: decimals }),
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates a complete set of rubric scores against the event's rubric category definitions.
 * Used in multi-rubric mode.
 *
 * @param {Array<{category: string, score: number|string, comment?: string}>} scores
 *   Array of score objects — one per rubric category.
 * @param {Array<{id: string, name: string, maxScore: number, weight: number, allowComments: boolean}>} rubricCategories
 *   The event's rubric category definitions (from settings.rubricCategories).
 * @param {boolean} [allowDecimalScores=true]
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 *   errors is a map of categoryId → error message. Empty if valid.
 */
export function validateScoreSet(scores, rubricCategories, allowDecimalScores = true) {
  const errors = {};
  const decimals = allowDecimalScores ? CONFIG.SCORING.DECIMAL_PLACES : 0;

  for (const cat of rubricCategories) {
    const entry = scores.find(s => s.category === cat.id);

    if (!entry || entry.score === '' || entry.score === null || entry.score === undefined) {
      errors[cat.id] = interpolate(STRINGS.errors.scoreRequired, { category: cat.name });
      continue;
    }

    const result = validateScore(entry.score, CONFIG.SCORING.MIN_SCORE, cat.maxScore, decimals);
    if (!result.valid) {
      errors[cat.id] = result.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a single score in "single mode" (one score per presenter).
 * @param {number|string} score
 * @param {number} maxScore
 * @param {boolean} [allowDecimalScores=true]
 * @returns {ValidationResult}
 */
export function validateSingleScore(score, maxScore, allowDecimalScores = true) {
  return validateScore(
    score,
    CONFIG.SCORING.MIN_SCORE,
    maxScore,
    allowDecimalScores ? CONFIG.SCORING.DECIMAL_PLACES : 0,
  );
}

/* ============================================================
   CALCULATION
   ============================================================ */

/**
 * Calculates the weighted average of a judge's rubric scores for a single presenter.
 * Weights are the category weight values; scores are normalized within each category.
 *
 * Formula: Σ(score_i / maxScore_i × weight_i) / Σ(weight_i)
 * Result is expressed as a value between 0 and 1 (multiply by overall max to get final score).
 *
 * @param {Array<{category: string, score: number}>} scores
 * @param {Array<{id: string, maxScore: number, weight: number}>} rubricCategories
 * @returns {number} Weighted fraction (0–1), or 0 if no matching categories
 */
export function calculateWeightedAverage(scores, rubricCategories) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cat of rubricCategories) {
    const entry = scores.find(s => s.category === cat.id);
    if (!entry || entry.score === null || entry.score === undefined) continue;

    const normalized = parseFloat(entry.score) / cat.maxScore;
    weightedSum += normalized * cat.weight;
    totalWeight += cat.weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Returns the weighted average score normalized to a specific maximum (e.g., 25).
 *
 * @param {Array<{category: string, score: number}>} scores
 * @param {Array<{id: string, maxScore: number, weight: number}>} rubricCategories
 * @param {number} overallMax - The overall maximum score (e.g., CONFIG.SCORING.MAX_JUDGE_SCORE)
 * @returns {number} Score on the 0–overallMax scale
 */
export function calculateNormalizedScore(scores, rubricCategories, overallMax) {
  return calculateWeightedAverage(scores, rubricCategories) * overallMax;
}

/**
 * Calculates the final composite score from judge and audience averages.
 * Weights must sum to 100.
 *
 * @param {number} judgeAvg - Judge average score (0–maxJudgeScore)
 * @param {number} audienceAvg - Audience average score (0–maxAudienceScore)
 * @param {number} judgeWeight - Judge weight as percentage (e.g., 75)
 * @param {number} audienceWeight - Audience weight as percentage (e.g., 25)
 * @returns {number} Final composite score
 */
export function calculateFinalScore(judgeAvg, audienceAvg, judgeWeight, audienceWeight) {
  return (judgeAvg * judgeWeight / 100) + (audienceAvg * audienceWeight / 100);
}

/**
 * Calculates the arithmetic mean of an array of numbers.
 * @param {number[]} values
 * @returns {number} Mean, or 0 for empty array
 */
export function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculates the median of an array of numbers.
 * @param {number[]} values
 * @returns {number} Median, or 0 for empty array
 */
export function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates the population standard deviation of an array of numbers.
 * @param {number[]} values
 * @returns {number} Standard deviation, or 0 for fewer than 2 values
 */
export function standardDeviation(values) {
  if (!values || values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Returns the percentile rank of a value within an array (0–100).
 * Uses the "percentage of values strictly less than v" formula.
 *
 * @param {number} value - The value whose percentile rank to calculate
 * @param {number[]} allValues - The reference population
 * @returns {number} Percentile rank (0–100), rounded to nearest integer
 */
export function percentile(value, allValues) {
  if (!allValues || allValues.length === 0) return 0;
  const below = allValues.filter(v => v < value).length;
  return Math.round((below / allValues.length) * 100);
}

/**
 * Calculates summary statistics for an array of scores.
 * @param {number[]} scores
 * @returns {{ mean: number, median: number, stdDev: number, min: number, max: number, count: number }}
 */
export function calculateScoreStats(scores) {
  if (!scores || scores.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 };
  }
  return {
    mean:   parseFloat(mean(scores).toFixed(2)),
    median: parseFloat(median(scores).toFixed(2)),
    stdDev: parseFloat(standardDeviation(scores).toFixed(2)),
    min:    Math.min(...scores),
    max:    Math.max(...scores),
    count:  scores.length,
  };
}

/**
 * Computes a simplified inter-rater reliability score (Intraclass Correlation Coefficient,
 * one-way random effects model). Returns a value between -1 and 1.
 * Values above 0.75 are considered excellent; 0.6–0.75 good; 0.4–0.6 fair; below 0.4 poor.
 *
 * @param {number[][]} judgeScoreMatrix
 *   2D array [judgeIndex][presenterIndex] of numeric scores.
 *   Missing values should be represented as null/undefined (skipped).
 * @returns {number} ICC estimate, or 0 if insufficient data
 */
export function interRaterReliability(judgeScoreMatrix) {
  if (!judgeScoreMatrix || judgeScoreMatrix.length < 2) return 0;

  const numJudges = judgeScoreMatrix.length;
  const numTargets = judgeScoreMatrix[0].length;
  if (numTargets < 2) return 0;

  // Flatten all valid scores and calculate grand mean
  const allScores = judgeScoreMatrix.flat().filter(v => v !== null && v !== undefined);
  if (allScores.length === 0) return 0;
  const grandMean = mean(allScores);

  // Between-targets sum of squares (SS_B)
  let ssB = 0;
  for (let t = 0; t < numTargets; t++) {
    const targetScores = judgeScoreMatrix
      .map(row => row[t])
      .filter(v => v !== null && v !== undefined);
    if (targetScores.length === 0) continue;
    const targetMean = mean(targetScores);
    ssB += targetScores.length * Math.pow(targetMean - grandMean, 2);
  }

  // Within-targets sum of squares (SS_W) — error
  let ssW = 0;
  for (let t = 0; t < numTargets; t++) {
    const targetScores = judgeScoreMatrix
      .map(row => row[t])
      .filter(v => v !== null && v !== undefined);
    if (targetScores.length === 0) continue;
    const targetMean = mean(targetScores);
    for (const s of targetScores) {
      ssW += Math.pow(s - targetMean, 2);
    }
  }

  const dfB = numTargets - 1;
  const dfW = allScores.length - numTargets;

  if (dfB === 0 || dfW === 0) return 0;

  const msB = ssB / dfB;
  const msW = ssW / dfW;

  const n = numJudges;
  const icc = (msB - msW) / (msB + (n - 1) * msW);

  return parseFloat(Math.max(-1, Math.min(1, icc)).toFixed(3));
}

/**
 * Interprets an ICC value into a human-readable reliability label.
 * @param {number} icc
 * @returns {'poor'|'fair'|'good'|'excellent'}
 */
export function interpretICC(icc) {
  if (icc < 0.4) return 'poor';
  if (icc < 0.6) return 'fair';
  if (icc < 0.75) return 'good';
  return 'excellent';
}

/* ============================================================
   FORMATTING
   ============================================================ */

/**
 * Formats a numeric score to a fixed number of decimal places.
 * Returns the string "—" for null/undefined/NaN.
 * @param {number|null|undefined} score
 * @param {number} [decimals=CONFIG.SCORING.DECIMAL_PLACES]
 * @returns {string}
 */
export function formatScore(score, decimals = CONFIG.SCORING.DECIMAL_PLACES) {
  if (score === null || score === undefined || isNaN(score)) return '—';
  return parseFloat(score).toFixed(decimals);
}

/**
 * Formats a score as a percentage string (0–100).
 * @param {number} score - Actual score
 * @param {number} maxScore - Maximum possible score
 * @returns {string} e.g. "84%"
 */
export function formatScorePercent(score, maxScore) {
  if (!maxScore || isNaN(score)) return '—';
  return Math.round((score / maxScore) * 100) + '%';
}

/**
 * Rounds a score to a specified number of decimal places.
 * @param {number} score
 * @param {number} [places=2]
 * @returns {number}
 */
export function roundScore(score, places = 2) {
  const factor = Math.pow(10, places);
  return Math.round(score * factor) / factor;
}

/**
 * Returns a score's position on a 0–100 scale (for progress bars).
 * @param {number} score
 * @param {number} maxScore
 * @returns {number} 0–100 clamped
 */
export function scoreToPercent(score, maxScore) {
  if (!maxScore) return 0;
  return Math.min(100, Math.max(0, (score / maxScore) * 100));
}

/**
 * Builds a histogram bin-count array for a set of scores.
 * Used for score distribution charts.
 *
 * @param {number[]} scores
 * @param {number} maxScore
 * @param {number} [bins=5] - Number of equal-width bins
 * @returns {Array<{label: string, count: number, min: number, max: number}>}
 */
export function buildHistogram(scores, maxScore, bins = 5) {
  const binWidth = maxScore / bins;
  const result = [];
  for (let i = 0; i < bins; i++) {
    const binMin = i * binWidth;
    const binMax = (i + 1) * binWidth;
    result.push({
      label: `${formatScore(binMin, 0)}–${formatScore(binMax, 0)}`,
      count: scores.filter(s => s >= binMin && (i === bins - 1 ? s <= binMax : s < binMax)).length,
      min: binMin,
      max: binMax,
    });
  }
  return result;
}
