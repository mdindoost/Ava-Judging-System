/**
 * RateLimit.gs — Ava Judging System
 * Token-bucket rate limiter using PropertiesService as storage.
 *
 * Limits:
 *   - Max 2 requests per 1-second window per token/key
 *   - Max 100 requests per 60-second window per token/key
 *
 * Storage schema (PropertiesService, key = 'rl_' + hashedKey):
 *   JSON: { short: { count, windowStart }, long: { count, windowStart } }
 */

var RATE_LIMIT = {
  SHORT_WINDOW_MS:  1000,   // 1 second
  SHORT_MAX:        2,       // max requests per short window
  LONG_WINDOW_MS:   60000,  // 60 seconds
  LONG_MAX:         100,    // max requests per long window
  STORAGE_PREFIX:   'rl_',
  CLEANUP_CHANCE:   0.05,   // 5% chance to run cleanup on each check
};

/**
 * Checks if the given key (token hash or IP hash) is within rate limits.
 * Increments counters if within limit.
 * Should be called at the top of every request handler.
 *
 * @param {string} key - Raw key (token, IP, etc). Will be hashed internally.
 * @returns {{ allowed: boolean, error: string|null }}
 */
function checkRateLimit(key) {
  try {
    // Probabilistically clean up stale entries to avoid bloating properties
    if (Math.random() < RATE_LIMIT.CLEANUP_CHANCE) {
      cleanupRateLimitEntries_();
    }

    var hashedKey = hashString(String(key));
    var storageKey = RATE_LIMIT.STORAGE_PREFIX + hashedKey;
    var props = PropertiesService.getScriptProperties();
    var now = Date.now();

    var raw = props.getProperty(storageKey);
    var state = raw ? parseJSON(raw, null) : null;

    if (!state || typeof state !== 'object') {
      state = {
        short: { count: 0, windowStart: now },
        long:  { count: 0, windowStart: now },
      };
    }

    // Reset expired windows
    if (now - state.short.windowStart >= RATE_LIMIT.SHORT_WINDOW_MS) {
      state.short = { count: 0, windowStart: now };
    }
    if (now - state.long.windowStart >= RATE_LIMIT.LONG_WINDOW_MS) {
      state.long = { count: 0, windowStart: now };
    }

    // Check limits BEFORE incrementing
    if (state.short.count >= RATE_LIMIT.SHORT_MAX) {
      return {
        allowed: false,
        error: 'Rate limit exceeded. Too many requests per second. Please wait and try again.',
      };
    }
    if (state.long.count >= RATE_LIMIT.LONG_MAX) {
      return {
        allowed: false,
        error: 'Rate limit exceeded. Too many requests per minute. Please wait before retrying.',
      };
    }

    // Increment
    state.short.count += 1;
    state.long.count  += 1;

    props.setProperty(storageKey, JSON.stringify(state));
    return { allowed: true, error: null };

  } catch (e) {
    // On storage failure, fail open (allow) to avoid blocking legitimate requests
    console.error('RateLimit.checkRateLimit error: ' + e.message);
    return { allowed: true, error: null };
  }
}

/**
 * Checks rate limit and returns an error response if exceeded.
 * Convenience wrapper that returns a jsonResponse-compatible error or null.
 *
 * @param {string} key
 * @returns {GoogleAppsScript.Content.TextOutput|null}
 *   Returns errorResponse() if rate-limited, null if allowed.
 */
function enforceRateLimit(key) {
  var result = checkRateLimit(key);
  if (!result.allowed) {
    logAudit('system', 'system', 'RATE_LIMIT_EXCEEDED', 'request', '',
      { key: hashString(String(key)) }, null);
    return errorResponse(result.error);
  }
  return null;
}

/**
 * Removes PropertiesService entries whose long window has fully expired.
 * Called probabilistically on each request to prevent unbounded growth.
 * @private
 */
function cleanupRateLimitEntries_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var now = Date.now();
    var toDelete = [];

    Object.keys(all).forEach(function(key) {
      if (!key.startsWith(RATE_LIMIT.STORAGE_PREFIX)) return;
      var state = parseJSON(all[key], null);
      if (!state) { toDelete.push(key); return; }
      // Safe to delete if the long window expired more than 2 minutes ago
      var longExpired = state.long && (now - state.long.windowStart > RATE_LIMIT.LONG_WINDOW_MS * 2);
      if (longExpired) toDelete.push(key);
    });

    if (toDelete.length > 0) {
      props.deleteProperty(toDelete[0]); // Delete one per cleanup to stay fast
    }
  } catch (e) {
    console.error('RateLimit.cleanupRateLimitEntries_ error: ' + e.message);
  }
}

/**
 * Resets the rate limit state for a given key.
 * Useful for testing or admin-forced resets.
 * @param {string} key
 */
function resetRateLimit(key) {
  try {
    var hashedKey = hashString(String(key));
    var storageKey = RATE_LIMIT.STORAGE_PREFIX + hashedKey;
    PropertiesService.getScriptProperties().deleteProperty(storageKey);
  } catch (e) {
    console.error('RateLimit.resetRateLimit error: ' + e.message);
  }
}
