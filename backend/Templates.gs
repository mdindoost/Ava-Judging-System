/**
 * Templates.gs — Ava Judging System
 * Event template save/load. Stores full scoring configurations for reuse.
 */

// ============================================================
// READ
// ============================================================

/**
 * Returns all saved templates.
 * @returns {{ success: boolean, data: object[], error: string|null }}
 */
function getAllTemplates() {
  try {
    var rows = getAllRows(SHEET_NAMES.TEMPLATES, COLUMNS.TEMPLATES);
    var result = rows.map(function(r) { return _mapTemplate(r); });
    return { success: true, data: result, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// SAVE AS TEMPLATE
// ============================================================

/**
 * Saves the current event settings as a named template.
 * Captures: scoringMode, rubricMode, rubricCategories, judgeWeight, audienceWeight,
 * maxJudgeScore, maxAudienceScore, allowDecimalScores, tracksEnabled, tiebreakerRule.
 * @param {string} name
 * @param {string} description
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { id: string }, error: string|null }}
 */
function saveAsTemplate(name, description, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    if (!str(name)) return { success: false, data: null, error: 'Template name is required.' };

    var settings = getSettings().data || {};

    // Capture only the scoring-related configuration keys
    var config = {
      scoringMode:           str(settings.scoringMode),
      judgeWeight:           str(settings.judgeWeight),
      audienceWeight:        str(settings.audienceWeight),
      rubricMode:            str(settings.rubricMode),
      rubricCategories:      str(settings.rubricCategories),
      maxJudgeScore:         str(settings.maxJudgeScore),
      maxAudienceScore:      str(settings.maxAudienceScore),
      allowDecimalScores:    str(settings.allowDecimalScores),
      tracksEnabled:         str(settings.tracksEnabled),
      tiebreakerRule:        str(settings.tiebreakerRule),
      publicLeaderboard:     str(settings.publicLeaderboard),
      selfVotePrevention:    str(settings.selfVotePrevention),
      audienceVotingEnabled: str(settings.audienceVotingEnabled),
    };

    var existingRows = getAllRows(SHEET_NAMES.TEMPLATES, COLUMNS.TEMPLATES);
    var existingIds  = existingRows.map(function(r) { return str(r.TemplateID); });
    var newId        = generateID('TPL', existingIds);

    var session = validateAdminSession(adminToken);
    var adminId = session.success ? str(session.data.adminId) : 'admin';

    appendRow(SHEET_NAMES.TEMPLATES, {
      TemplateID:  newId,
      Name:        str(name),
      Description: str(description),
      Config:      JSON.stringify(config),
      CreatedAt:   nowISO(),
      CreatedBy:   adminId,
    }, COLUMNS.TEMPLATES);

    logAudit('admin', 'admin', 'TEMPLATE_SAVED', 'template', newId,
      { name: str(name) }, adminToken);

    return { success: true, data: { id: newId }, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// LOAD TEMPLATE
// ============================================================

/**
 * Applies a template's configuration to the current event settings.
 * Does NOT overwrite event name, date, admin password, or presenter/judge data.
 * @param {string} templateId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: { name: string, appliedKeys: string[] }, error: string|null }}
 */
function loadTemplate(templateId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.TEMPLATES, 'TemplateID', str(templateId));
    if (!found) return { success: false, data: null, error: 'Template not found: ' + templateId };

    var config = parseJSON(str(found.data.Config), null);
    if (!config || typeof config !== 'object') {
      return { success: false, data: null, error: 'Template config is corrupted.' };
    }

    var validation = validateSettings(config);
    if (!validation.valid) {
      return { success: false, data: null, error: 'Template contains invalid settings: ' + validation.error };
    }

    var appliedKeys = [];
    Object.keys(config).forEach(function(key) {
      _writeSetting(key, String(config[key]));
      appliedKeys.push(key);
    });
    _writeSetting('lastModified', nowISO());

    logAudit('admin', 'admin', 'TEMPLATE_LOADED', 'template', str(templateId),
      { name: str(found.data.Name), appliedKeys: appliedKeys }, adminToken);

    return {
      success: true,
      data: { name: str(found.data.Name), appliedKeys: appliedKeys },
      error: null,
    };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// DELETE
// ============================================================

/**
 * Permanently deletes a template.
 * @param {string} templateId
 * @param {string} adminToken
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
function deleteTemplate(templateId, adminToken) {
  try {
    requireValidAdminSession(adminToken);
    var found = findRowByColumn(SHEET_NAMES.TEMPLATES, 'TemplateID', str(templateId));
    if (!found) return { success: false, data: null, error: 'Template not found: ' + templateId };

    var name = str(found.data.Name);
    deleteRow(SHEET_NAMES.TEMPLATES, found.rowIndex);

    logAudit('admin', 'admin', 'TEMPLATE_DELETED', 'template', str(templateId),
      { name: name }, adminToken);

    return { success: true, data: null, error: null };
  } catch (e) {
    return { success: false, data: null, error: e.message };
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Maps a raw template row to a public shape.
 * @param {object} row
 * @returns {object}
 * @private
 */
function _mapTemplate(row) {
  var config = parseJSON(str(row.Config), {});
  return {
    id:          str(row.TemplateID),
    name:        str(row.Name),
    description: str(row.Description),
    config:      config,
    createdAt:   str(row.CreatedAt),
    createdBy:   str(row.CreatedBy),
    // Derived summary for UI display
    rubricMode:   str(config.rubricMode)  || 'single',
    rubricCount:  Array.isArray(parseJSON(str(config.rubricCategories), []))
                    ? parseJSON(str(config.rubricCategories), []).length
                    : 0,
    scoringMode:  str(config.scoringMode) || 'judges_only',
  };
}
