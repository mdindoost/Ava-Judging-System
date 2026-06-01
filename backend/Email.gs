/**
 * Email.gs — Ava Judging System
 * All outbound email functions. Uses GmailApp (built into Apps Script).
 * HTML emails are well-designed and match the Ava brand.
 */

// ============================================================
// MAGIC LINK EMAIL
// ============================================================

/**
 * Sends the magic link invitation email to a judge.
 * @param {string} judgeEmail
 * @param {string} judgeName
 * @param {string} token
 * @param {string} eventName
 */
function sendMagicLink(judgeEmail, judgeName, token, eventName) {
  var baseURL = PropertiesService.getScriptProperties().getProperty('BASE_URL') || '';
  var link    = baseURL + '/judge/login.html?token=' + encodeURIComponent(token);
  var subject = 'Your judging link for ' + eventName;
  var html    = buildMagicLinkEmail(judgeName, eventName, link);
  sendEmail(judgeEmail, subject, html);
}

/**
 * Builds the magic link HTML email body.
 * @param {string} judgeName
 * @param {string} eventName
 * @param {string} link
 * @returns {string} HTML string.
 */
function buildMagicLinkEmail(judgeName, eventName, link) {
  return _wrapEmail(
    eventName,
    'You\'re invited to judge',
    '<p style="margin:0 0 16px;">Hi <strong>' + _esc(judgeName) + '</strong>,</p>' +
    '<p style="margin:0 0 24px;">You have been invited to judge <strong>' + _esc(eventName) + '</strong>. ' +
    'Click the button below to access your personal judging portal.</p>' +
    _ctaButton(link, 'Access My Judging Portal') +
    '<p style="margin:24px 0 0;font-size:14px;color:#718096;">This link expires in <strong>24 hours</strong>.</p>' +
    '<p style="margin:8px 0 0;font-size:13px;color:#a0aec0;">If you did not expect this email, please ignore it. ' +
    'You were added as a judge by the event administrator.</p>'
  );
}

// ============================================================
// JUDGE REMINDER EMAIL
// ============================================================

/**
 * Sends a reminder email to a judge with remaining presenter count.
 * @param {string} judgeEmail
 * @param {string} judgeName
 * @param {number} remaining
 * @param {number} total
 * @param {string} eventName
 */
function sendJudgeReminder(judgeEmail, judgeName, remaining, total, eventName) {
  var subject = 'Reminder: ' + remaining + ' presenter(s) remaining — ' + eventName;
  var html    = buildReminderEmail(judgeName, remaining, total, eventName);
  sendEmail(judgeEmail, subject, html);
}

/**
 * Builds the reminder HTML email body.
 * @param {string} judgeName
 * @param {number} remaining
 * @param {number} total
 * @param {string} eventName
 * @returns {string}
 */
function buildReminderEmail(judgeName, remaining, total, eventName) {
  var done    = total - remaining;
  var pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  var baseURL = PropertiesService.getScriptProperties().getProperty('BASE_URL') || '';
  var link    = baseURL + '/judge/dashboard.html';

  return _wrapEmail(
    eventName,
    'You have presentations to score',
    '<p style="margin:0 0 16px;">Hi <strong>' + _esc(judgeName) + '</strong>,</p>' +
    '<p style="margin:0 0 16px;">You have scored <strong>' + done + ' of ' + total + '</strong> assigned presenter(s) for ' + _esc(eventName) + '.</p>' +
    '<p style="margin:0 0 24px;">You have <strong style="color:#c53030;">' + remaining + ' presenter(s) remaining</strong>.</p>' +
    _progressBar(pct) +
    _ctaButton(link, 'Continue Judging') +
    '<p style="margin:24px 0 0;font-size:13px;color:#a0aec0;">Use your original invitation link if you need to log in again.</p>'
  );
}

// ============================================================
// ADMIN ALERT EMAILS
// ============================================================

/**
 * Sends an admin alert email.
 * @param {'inactivity'|'completion'} type
 * @param {object} data - Context data for the alert.
 */
function sendAdminAlert(type, data) {
  var adminEmail = getSetting('superAdminEmail');
  if (!adminEmail) return;

  var eventName = getSetting('eventName') || 'Event';
  var subject, html;

  if (type === 'inactivity') {
    subject = 'Alert: ' + _esc(data.judgeName) + ' has been inactive for '
      + data.minutes + ' minutes — ' + eventName;
    html = _wrapEmail(
      eventName,
      'Judge Inactivity Alert',
      '<p style="margin:0 0 16px;"><strong>' + _esc(data.judgeName) + '</strong> (' + _esc(data.judgeEmail) + ') ' +
      'has been inactive for <strong style="color:#c53030;">' + data.minutes + ' minutes</strong>.</p>' +
      '<p style="margin:0 0 16px;">They have scored <strong>' + data.scored + ' of ' + data.total + '</strong> assigned presenters.</p>' +
      '<p style="margin:0 0 24px;">You may want to send them a reminder or check in directly.</p>' +
      _ctaButton(_adminURL(), 'Go to Admin Dashboard')
    );

  } else if (type === 'completion') {
    subject = 'All judges have completed — ' + eventName;
    html = _wrapEmail(
      eventName,
      'All Judges Have Completed',
      '<p style="margin:0 0 16px;">All <strong>' + data.count + ' judges</strong> have finished scoring for <strong>' + _esc(eventName) + '</strong>.</p>' +
      '<p style="margin:0 0 24px;">You can now close voting and generate the final results.</p>' +
      _ctaButton(_adminURL(), 'Close Voting & View Results')
    );
  }

  if (subject && html) sendEmail(adminEmail, subject, html);
}

// ============================================================
// PRESENTER SCORECARD EMAIL
// ============================================================

/**
 * Notifies a presenter that their scorecard is ready.
 * @param {string} presenterEmail
 * @param {string} presenterName
 * @param {string} downloadLink
 */
function sendScorecardReady(presenterEmail, presenterName, downloadLink) {
  var eventName = getSetting('eventName') || 'Event';
  var subject   = 'Your scorecard from ' + eventName;
  var html = _wrapEmail(
    eventName,
    'Your Research Presentation Results',
    '<p style="margin:0 0 16px;">Hi <strong>' + _esc(presenterName) + '</strong>,</p>' +
    '<p style="margin:0 0 24px;">The results from <strong>' + _esc(eventName) + '</strong> are now available. ' +
    'Your individual scorecard is ready for download.</p>' +
    _ctaButton(downloadLink, 'Download My Scorecard') +
    '<p style="margin:24px 0 0;font-size:13px;color:#a0aec0;">Thank you for participating. ' +
    'This scorecard was generated by the event administrator.</p>'
  );
  sendEmail(presenterEmail, subject, html);
}

// ============================================================
// HTML EMAIL BUILDER HELPERS
// ============================================================

/**
 * Wraps email content in the branded Ava Judging System email shell.
 * @param {string} eventName
 * @param {string} heading
 * @param {string} bodyHTML
 * @returns {string}
 * @private
 */
function _wrapEmail(eventName, heading, bodyHTML) {
  var year = new Date().getFullYear();
  return '<!DOCTYPE html>' +
    '<html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + _esc(heading) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f7fafc;font-family:\'Source Sans Pro\',Helvetica,Arial,sans-serif;color:#1a202c;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fafc;padding:40px 20px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">' +

    /* Header */
    '<tr><td style="background:#1a365d;border-radius:12px 12px 0 0;padding:32px 40px;">' +
    '<p style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Ava Judging System</p>' +
    '<p style="margin:4px 0 0;font-size:13px;color:#b8cce8;">' + _esc(eventName) + '</p>' +
    '</td></tr>' +

    /* Heading bar */
    '<tr><td style="background:#c9a227;padding:12px 40px;">' +
    '<p style="margin:0;font-size:16px;font-weight:700;color:#0d1b2e;">' + _esc(heading) + '</p>' +
    '</td></tr>' +

    /* Body */
    '<tr><td style="background:#ffffff;padding:40px;border-radius:0 0 0 0;">' +
    '<div style="font-size:16px;line-height:1.6;color:#2d3748;">' +
    bodyHTML +
    '</div>' +
    '</td></tr>' +

    /* Footer */
    '<tr><td style="background:#f7fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:20px 40px;">' +
    '<p style="margin:0;font-size:12px;color:#718096;line-height:1.5;">' +
    'Sent by <strong>Ava Judging System</strong> &middot; ' + _esc(eventName) + ' &middot; ' + year +
    '</p>' +
    '<p style="margin:4px 0 0;font-size:12px;color:#a0aec0;">' +
    'This is an automated event notification. You were added by the event administrator.' +
    '</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr></table>' +
    '</body></html>';
}

/**
 * Builds a branded CTA button for HTML email.
 * @param {string} href
 * @param {string} label
 * @returns {string}
 * @private
 */
function _ctaButton(href, label) {
  return '<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">' +
    '<tr><td style="background:#1a365d;border-radius:8px;padding:0;">' +
    '<a href="' + _esc(href) + '" target="_blank" ' +
    'style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;' +
    'color:#ffffff;text-decoration:none;border-radius:8px;line-height:1;">' +
    _esc(label) + '</a>' +
    '</td></tr></table>';
}

/**
 * Builds an HTML progress bar.
 * @param {number} pct - 0–100
 * @returns {string}
 * @private
 */
function _progressBar(pct) {
  var safe = Math.min(100, Math.max(0, pct));
  return '<div style="background:#e2e8f0;border-radius:9999px;height:10px;margin:0 0 24px;overflow:hidden;">' +
    '<div style="background:#276749;height:10px;width:' + safe + '%;border-radius:9999px;"></div>' +
    '</div>' +
    '<p style="margin:-16px 0 24px;font-size:13px;color:#718096;">' + safe + '% complete</p>';
}

/**
 * Returns the admin dashboard URL from Script Properties.
 * @returns {string}
 * @private
 */
function _adminURL() {
  var base = PropertiesService.getScriptProperties().getProperty('BASE_URL') || '';
  return base + '/admin/index.html';
}

/**
 * Escapes a string for safe inclusion in HTML.
 * @param {string} s
 * @returns {string}
 * @private
 */
function _esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
