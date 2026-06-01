/**
 * config.js — Ava Judging System
 * SINGLE SOURCE OF TRUTH for all frontend configuration.
 * All other JS files import from this module.
 * NEVER hardcode URLs, keys, or settings elsewhere.
 */

export const CONFIG = {
  // Google Apps Script deployment URL.
  // Admin sets this once after deploying the backend.
  // Stored in localStorage so it persists across pages.
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyaqUA-zrDQlV5ZEauzaZZ8DLZ7jkL1P4BeaDILMXdmmM_DRGm39nhfhCkCVUtE8dtSyg/exec',

  // GitHub Pages base URL
  BASE_URL: window.location.origin,

  // App version
  VERSION: '1.0.0',

  // Debug mode — set to false for production.
  // When true, verbose console logs appear under [Module] prefix.
  DEBUG: false,

  // ----------------------------------------------------------------
  // STORAGE KEYS — all localStorage / sessionStorage keys live here
  // ----------------------------------------------------------------
  STORAGE: {
    JUDGE_SESSION:    'ava_judge_session',
    ADMIN_SESSION:    'ava_admin_session',
    OFFLINE_QUEUE:    'ava_offline_queue',
    SCRIPT_URL:       'ava_script_url',
    EVENT_CACHE:      'ava_event_cache',
    PRESENTER_CACHE:  'ava_presenter_cache',
    SETTINGS_CACHE:   'ava_settings_cache',
    LOGIN_ATTEMPTS:   'ava_login_attempts',
    LOGIN_LOCKOUT:    'ava_login_lockout',
    ACCESSIBILITY:    'ava_accessibility',
    DARK_MODE:        'ava_dark_mode',
    LEADERBOARD_LAST: 'ava_leaderboard_last',
  },

  // ----------------------------------------------------------------
  // CACHE TTLs in milliseconds
  // ----------------------------------------------------------------
  CACHE: {
    PRESENTERS:      5  * 60 * 1000,   // 5 minutes
    LEADERBOARD:     30 * 1000,         // 30 seconds
    JUDGE_PROGRESS:  60 * 1000,         // 1 minute
    EVENT_SETTINGS: 10  * 60 * 1000,   // 10 minutes
    RESULTS:         30 * 1000,         // 30 seconds
  },

  // ----------------------------------------------------------------
  // AUTO-REFRESH / POLLING INTERVALS
  // ----------------------------------------------------------------
  POLL: {
    LEADERBOARD:     30 * 1000,
    JUDGE_PROGRESS:  60 * 1000,
    ADMIN_DASHBOARD: 30 * 1000,
    VOTING_STATUS:   15 * 1000,
  },

  // ----------------------------------------------------------------
  // SCORING DEFAULTS — overridden by event settings from backend
  // ----------------------------------------------------------------
  SCORING: {
    MIN_SCORE:              0,
    MAX_JUDGE_SCORE:        25,
    MAX_AUDIENCE_SCORE:     25,
    DECIMAL_PLACES:         2,
    DEFAULT_JUDGE_WEIGHT:   75,
    DEFAULT_AUDIENCE_WEIGHT: 25,
  },

  // ----------------------------------------------------------------
  // QR CODE GENERATION OPTIONS
  // ----------------------------------------------------------------
  QR: {
    SIZE:             256,
    ERROR_CORRECTION: 'M',   // L / M / Q / H
    MARGIN:           2,
    COLOR_DARK:       '#1a365d',
    COLOR_LIGHT:      '#ffffff',
    // Printed card size (px at 96dpi)
    PRINT_SIZE:       300,
  },

  // ----------------------------------------------------------------
  // PAGINATION DEFAULTS
  // ----------------------------------------------------------------
  PAGINATION: {
    PRESENTERS_PER_PAGE: 50,
    JUDGES_PER_PAGE:     50,
    VOTES_PER_PAGE:     100,
    LOGS_PER_PAGE:      100,
    QR_GRID_PER_PAGE:    50,
  },

  // ----------------------------------------------------------------
  // TIMEOUTS
  // ----------------------------------------------------------------
  TIMEOUT: {
    API_REQUEST:    30 * 1000,   // 30 seconds
    TOAST_DURATION:  5 * 1000,   // 5 seconds
    OFFLINE_RETRY:   5 * 1000,   // 5 seconds between retries
    SYNC_INTERVAL:  10 * 1000,   // 10 seconds — check offline queue
    MODAL_CLOSE:       300,       // animation duration ms
  },

  // ----------------------------------------------------------------
  // ADMIN SECURITY
  // ----------------------------------------------------------------
  ADMIN: {
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes
    SESSION_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours
  },

  // ----------------------------------------------------------------
  // JUDGE SESSION
  // ----------------------------------------------------------------
  JUDGE: {
    TOKEN_DURATION_HOURS: 24,
    SESSION_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
    INACTIVITY_ALERT_MINUTES: 30,
  },

  // ----------------------------------------------------------------
  // EXPORT / PDF SETTINGS
  // ----------------------------------------------------------------
  EXPORT: {
    PDF_MARGIN_MM:      15,
    PDF_FONT_SIZE_PT:   11,
    PDF_TITLE_SIZE_PT:  20,
    QR_CARDS_PER_PAGE_OPTIONS: [1, 2, 4, 6, 9],
    QR_CARDS_PER_PAGE_DEFAULT: 6,
    EXCEL_DATE_FORMAT: 'YYYY-MM-DD',
  },

  // ----------------------------------------------------------------
  // CHART COLORS — match CSS variables (duplicated for Chart.js)
  // ----------------------------------------------------------------
  CHART_COLORS: {
    primary:   '#1a365d',
    accent:    '#c9a227',
    success:   '#276749',
    warning:   '#b7791f',
    danger:    '#c53030',
    info:      '#2b6cb0',
    neutral:   '#718096',
    // Array for multi-series charts
    series: [
      '#1a365d', '#c9a227', '#276749', '#2b6cb0',
      '#b7791f', '#c53030', '#718096', '#553c9a',
      '#00b5d8', '#e53e3e',
    ],
  },

  // ----------------------------------------------------------------
  // RUBRIC MODE CONSTANTS
  // ----------------------------------------------------------------
  RUBRIC_MODE: {
    SINGLE: 'single',
    MULTI:  'multi',
  },

  // ----------------------------------------------------------------
  // SCORING MODE CONSTANTS
  // ----------------------------------------------------------------
  SCORING_MODE: {
    JUDGES_ONLY:       'judges_only',
    JUDGES_AUDIENCE:   'judges_audience',
    CUSTOM:            'custom',
  },

  // ----------------------------------------------------------------
  // VOTING STATUS CONSTANTS
  // ----------------------------------------------------------------
  VOTING_STATUS: {
    OPEN:   'open',
    PAUSED: 'paused',
    CLOSED: 'closed',
  },

  // ----------------------------------------------------------------
  // VOTER TYPE CONSTANTS
  // ----------------------------------------------------------------
  VOTER_TYPE: {
    JUDGE:    'judge',
    AUDIENCE: 'audience',
  },

  // ----------------------------------------------------------------
  // TIEBREAKER RULE CONSTANTS
  // ----------------------------------------------------------------
  TIEBREAKER: {
    JUDGE_AVG:   'judge_avg',
    VOTE_COUNT:  'vote_count',
    RANDOM:      'random',
  },

  // ----------------------------------------------------------------
  // AUDIT LOG ACTION ENUM (mirrors backend)
  // ----------------------------------------------------------------
  AUDIT_ACTIONS: {
    VOTE_SUBMITTED:     'VOTE_SUBMITTED',
    VOTE_REJECTED:      'VOTE_REJECTED',
    TOKEN_VALIDATED:    'TOKEN_VALIDATED',
    TOKEN_EXPIRED:      'TOKEN_EXPIRED',
    SETTINGS_CHANGED:   'SETTINGS_CHANGED',
    PRESENTER_ADDED:    'PRESENTER_ADDED',
    PRESENTER_EDITED:   'PRESENTER_EDITED',
    PRESENTER_DELETED:  'PRESENTER_DELETED',
    JUDGE_ADDED:        'JUDGE_ADDED',
    JUDGE_INVITED:      'JUDGE_INVITED',
    JUDGE_LOGIN:        'JUDGE_LOGIN',
    VOTING_OPENED:      'VOTING_OPENED',
    VOTING_PAUSED:      'VOTING_PAUSED',
    VOTING_CLOSED:      'VOTING_CLOSED',
    RESULTS_EXPORTED:   'RESULTS_EXPORTED',
    CHECKIN_MARKED:     'CHECKIN_MARKED',
  },

  // ----------------------------------------------------------------
  // URL PATH HELPERS — derive page URLs from BASE_URL
  // ----------------------------------------------------------------
  PATHS: {
    judgeLogin:    '/judge/login.html',
    judgeDashboard: '/judge/dashboard.html',
    judgeScore:    '/judge/score.html',
    adminLogin:    '/admin/login.html',
    adminDashboard: '/admin/index.html',
    adminSetup:    '/admin/setup.html',
    vote:          '/vote.html',
    leaderboard:   '/leaderboard.html',
    index:         '/index.html',
  },
};

/**
 * Returns the full URL for a path constant.
 * @param {keyof CONFIG.PATHS} pathKey
 * @returns {string}
 */
export function pageURL(pathKey) {
  return CONFIG.BASE_URL + CONFIG.PATHS[pathKey];
}

/**
 * Returns the judge login URL pre-loaded with a token.
 * @param {string} token
 * @returns {string}
 */
export function judgeLoginURL(token) {
  return `${CONFIG.BASE_URL}${CONFIG.PATHS.judgeLogin}?token=${encodeURIComponent(token)}`;
}

/**
 * Returns the audience vote URL pre-loaded with a presenter ID.
 * @param {string} presenterId
 * @returns {string}
 */
export function voteURL(presenterId) {
  return `${CONFIG.BASE_URL}${CONFIG.PATHS.vote}?presenter=${encodeURIComponent(presenterId)}`;
}

/**
 * Updates CONFIG.SCRIPT_URL and persists it to localStorage.
 * Call this from the setup wizard after the user enters their Script URL.
 * @param {string} url
 */
export function setScriptURL(url) {
  CONFIG.SCRIPT_URL = url.trim();
  localStorage.setItem(CONFIG.STORAGE.SCRIPT_URL, CONFIG.SCRIPT_URL);
}

/**
 * Returns true when the system has a configured Script URL.
 * @returns {boolean}
 */
export function isConfigured() {
  return Boolean(CONFIG.SCRIPT_URL);
}
