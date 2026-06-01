# AVA JUDGING SYSTEM — CLAUDE CODE MASTER PROMPT
# Paste this entire file into Claude Code to start the build.
# Version: 1.0.0

---

## MANDATORY FIRST INSTRUCTION

Before writing a single line of code:
1. Read CLAUDE.md completely — it is the project constitution
2. Read every file that already exists in the repo
3. Do NOT simplify any feature
4. Do NOT generate placeholder functions with TODO comments
5. Do NOT skip any module listed in CLAUDE.md
6. Every function must be fully implemented
7. Every validation must actually run
8. Every export must actually produce a real file
9. If something is hard to implement, implement it correctly — complexity is not an excuse

This is a production system used at real academic PhD events.
Real judges, real presenters, real careers on display.
Quality is non-negotiable.

---

## PROJECT SUMMARY

Build the complete Ava Judging System:
- Free, open-source, QR-based research presentation judging platform
- Frontend: Vanilla JS + HTML5 + CSS3 on GitHub Pages (NO frameworks, NO build step)
- Backend: Google Apps Script + Google Sheets (one sheet per event)
- Scale: 200 presenters, 30+ judges per event
- MIT licensed, public repo, built to grow

Full spec is in CLAUDE.md. This prompt adds implementation details.

---

## PHASE 1: FOUNDATION — Build this first, everything depends on it

### 1.1 — Create complete directory structure
Create every folder and every file listed in CLAUDE.md file structure section.
Empty files are acceptable at this stage ONLY for HTML pages.
CSS and JS foundation files must be fully written in this phase.

### 1.2 — variables.css
Write the complete CSS design system.
Design direction: **Academic precision meets modern clarity.**
- Primary palette: deep navy (#1a365d) with gold accent (#c9a227)
- Secondary: slate grays for structure, white for breathing room
- Typography: Playfair Display (display/headings) + Source Sans Pro (body) + JetBrains Mono (IDs/codes)
- Load fonts from CDN (bunny.net — privacy-respecting Google Fonts alternative)
- Include ALL variables: colors, typography, spacing scale, shadows, transitions, breakpoints, z-index scale, border radii
- Include dark mode variables under @media (prefers-color-scheme: dark)
- Include high-contrast variables under .high-contrast class on body
- Include large-text variables under .large-text class on body

### 1.3 — base.css
- Modern CSS reset (based on Andy Bell's reset)
- Global typography with the font stack
- Body, html base styles
- Scrollbar styling
- Selection color
- Focus ring styles (keyboard navigation)
- Print styles

### 1.4 — components.css
Build a complete component library. Every component fully styled:
- .btn (primary, secondary, danger, ghost, icon-only, loading state, disabled state)
- .card (default, elevated, bordered, clickable)
- .form-group, .form-label, .form-input, .form-select, .form-textarea
- .form-error, .form-hint
- .badge (success, warning, danger, info, neutral)
- .table (sortable headers, hover rows, zebra stripes, responsive)
- .modal (overlay, dialog, header, body, footer, close button)
- .toast (success, error, warning, info — top-right positioning, auto-dismiss)
- .progress-bar (animated fill)
- .spinner (loading indicator)
- .empty-state (icon + heading + description + action)
- .pagination
- .tabs (horizontal tab navigation)
- .accordion
- .tooltip
- .dropdown-menu
- .sidebar-nav (for admin layout)
- .stat-card (number + label + trend indicator)
- .alert (dismissible, persistent)
- .stepper (wizard step indicator)
- .tag (for tracks/categories with color support)

### 1.5 — config.js
```javascript
// THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR ALL CONFIGURATION
// All other JS files import from here
// NEVER hardcode URLs, keys, or settings elsewhere

export const CONFIG = {
  // Google Apps Script deployment URL
  // Admin sets this once after deploying backend
  SCRIPT_URL: localStorage.getItem('ava_script_url') || '',

  // GitHub Pages base URL
  BASE_URL: window.location.origin,

  // App version
  VERSION: '1.0.0',

  // Debug mode (set to false for production)
  DEBUG: false,

  // Storage keys
  STORAGE: {
    JUDGE_SESSION: 'ava_judge_session',
    ADMIN_SESSION: 'ava_admin_session',
    OFFLINE_QUEUE: 'ava_offline_queue',
    SCRIPT_URL: 'ava_script_url',
    EVENT_CACHE: 'ava_event_cache',
    PRESENTER_CACHE: 'ava_presenter_cache',
  },

  // Cache TTLs in milliseconds
  CACHE: {
    PRESENTERS: 5 * 60 * 1000,      // 5 minutes
    LEADERBOARD: 30 * 1000,          // 30 seconds
    JUDGE_PROGRESS: 60 * 1000,       // 1 minute
    EVENT_SETTINGS: 10 * 60 * 1000,  // 10 minutes
  },

  // Polling intervals
  POLL: {
    LEADERBOARD: 30 * 1000,
    JUDGE_PROGRESS: 60 * 1000,
    ADMIN_DASHBOARD: 30 * 1000,
  },

  // Score defaults (overridden by event settings)
  SCORING: {
    MIN_SCORE: 0,
    MAX_JUDGE_SCORE: 25,
    MAX_AUDIENCE_SCORE: 25,
    DECIMAL_PLACES: 2,
    DEFAULT_JUDGE_WEIGHT: 75,
    DEFAULT_AUDIENCE_WEIGHT: 25,
  },

  // QR code settings
  QR: {
    SIZE: 256,
    ERROR_CORRECTION: 'M',
    MARGIN: 2,
    COLOR_DARK: '#1a365d',
    COLOR_LIGHT: '#ffffff',
  },

  // Pagination
  PAGINATION: {
    PRESENTERS_PER_PAGE: 50,
    JUDGES_PER_PAGE: 50,
    VOTES_PER_PAGE: 100,
    LOGS_PER_PAGE: 100,
  },

  // Timeouts
  TIMEOUT: {
    API_REQUEST: 30 * 1000,       // 30 seconds
    TOAST_DURATION: 5 * 1000,     // 5 seconds
    OFFLINE_RETRY: 5 * 1000,      // 5 seconds
  },

  // Judge inactivity alert threshold
  JUDGE_INACTIVITY_MINUTES: 30,
};
```

### 1.6 — i18n.js
Write the complete STRINGS object with every user-facing string.
No other JS file may contain user-facing text.
Strings support simple interpolation: STRINGS.success.judgeInvited.replace('{email}', email)
Include strings for: all errors, all success messages, all labels, all headings,
all button text, all status messages, all confirmation dialogs, all email subjects/bodies.

### 1.7 — ui.js
Implement the complete UI utility module:
- Toast system (show, dismiss, auto-dismiss, queue)
- Modal system (open, close, confirm dialog with promise)
- Loading overlay (show/hide)
- Skeleton loading (for async content)
- Form utilities (serialize form to object, validate form, show field errors)
- Table utilities (sort, filter, paginate, render)
- Date/time formatting
- Number formatting (scores with decimal places, percentages)
- DOM utilities (qs, qsa, on, off, show, hide, toggle)
- Clipboard copy
- Debounce + throttle
- Local storage with expiry (get, set, remove with TTL)
- Event bus (pub/sub for cross-module communication)

---

## PHASE 2: BACKEND — Google Apps Script

Write all .gs files in the backend/ folder.

### Critical rules for ALL .gs files:
1. Every public function that handles a request must validate token first (except doGet for public pages)
2. Every write operation appends a row to AuditLog
3. All functions return: { success: boolean, data: any, error: string|null }
4. Wrap every function body in try/catch — never let an uncaught error reach the client
5. Use SpreadsheetApp.getActiveSpreadsheet() — sheet ID comes from PropertiesService
6. Never expose raw row data — always map to named objects before returning

### 2.1 — Utils.gs
```javascript
// Implement:
// generateUUID() — RFC 4122 compliant UUID v4
// generateID(prefix, existingIds) — P001, P002... or J001, J002...
// hashString(str) — SHA-256 via Utilities.computeDigest
// nowISO() — current timestamp as ISO string
// parseJSON(str) — safe JSON.parse with fallback
// getSheet(name) — get sheet by name, throw if not found
// appendRow(sheetName, rowObject, columnOrder) — type-safe append
// findRowByColumn(sheetName, columnName, value) — returns {rowIndex, data}
// updateRow(sheetName, rowIndex, updates) — partial update
// getAllRows(sheetName, columnOrder) — returns array of objects
// sendEmail(to, subject, htmlBody) — via GmailApp
// jsonResponse(data) — consistent ContentService response
// errorResponse(message) — consistent error response
```

### 2.2 — RateLimit.gs
Implement token bucket algorithm using PropertiesService as storage.
- Max 2 requests per 1 second per token
- Max 100 requests per minute per token
- Stores: {token_hash: {count, windowStart}}
- If limit exceeded: return 429-equivalent error response
- Clean up stale entries periodically

### 2.3 — Auth.gs
```javascript
// Implement fully:
// generateJudgeToken(judgeId) — creates UUID, sets expiry, stores in sheet
// validateJudgeToken(token) — checks exists, not expired, returns judge data
// invalidateToken(token) — for logout
// generateAdminSession(adminId) — for event admin sessions
// validateAdminSession(sessionToken)
// hashPassword(password) — for admin passwords
// verifyPassword(password, hash)
// isTokenExpired(expiryTimestamp)
// refreshToken(token) — extend expiry if used within last hour
```

### 2.4 — Settings.gs
Full CRUD for the Settings tab.
- getSettings() — returns all settings as object
- getSetting(key) — single value
- updateSetting(key, value, adminToken) — with audit log
- updateSettings(updates, adminToken) — bulk update
- initializeDefaultSettings(eventName, eventDate) — called when new sheet created
- validateSettings(settings) — check weights sum to 100, required fields present

### 2.5 — Presenters.gs
Full CRUD + import.
- getAllPresenters() — active only
- getPresenter(id)
- addPresenter(data, adminToken)
- editPresenter(id, data, adminToken)
- deletePresenter(id, adminToken) — soft delete (Active = FALSE)
- importPresenters(csvData, adminToken) — parse CSV, validate, bulk insert
- exportPresenters() — returns CSV string
- checkInPresenter(id, adminToken)
- getPresentersByTrack(trackId)

### 2.6 — Judges.gs
Full CRUD + invitation system.
- getAllJudges() — returns data without tokens
- getJudge(id)
- addJudge(data, adminToken)
- editJudge(id, data, adminToken)
- deleteJudge(id, adminToken)
- sendInvitation(judgeId, adminToken) — generates token, sends magic link email
- sendBulkInvitations(judgeIds, adminToken)
- resendInvitation(judgeId, adminToken) — regenerates token, resends
- getJudgeProgress(judgeId) — scored count vs assigned count
- getAllJudgeProgress() — for admin progress dashboard
- assignPresenters(judgeId, presenterIds, adminToken)
- assignTrack(judgeId, trackId, adminToken)
- sendReminder(judgeId, adminToken) — sends "X remaining" email
- sendBulkReminders(adminToken) — send to all incomplete judges

### 2.7 — Tracks.gs
- getAllTracks()
- addTrack(data, adminToken)
- editTrack(id, data, adminToken)
- deleteTrack(id, adminToken)
- getTrackWinners(trackId) — top 3 from Results

### 2.8 — Votes.gs — THE MOST CRITICAL FILE
Every vote submission goes through here. Implement ALL validation.

```javascript
function submitVote(payload) {
  // payload: { presenterID, voterType, voterID, voterName, scores[], sessionToken, honeypot }
  
  // VALIDATION SEQUENCE (fail fast, in this order):
  // 1. Honeypot check (audience only) — if honeypot field filled, silently accept but don't store
  // 2. Rate limit check
  // 3. Voting status check — must be "open"
  // 4. Presenter existence + active check
  // 5. Score structure validation — array matches rubric categories
  // 6. Score range validation — each score 0 <= s <= maxScore
  // 7. Score decimal validation — max 2 decimal places
  
  // For judge votes (voterType == "judge"):
  // 8. Token validation — must be valid, not expired
  // 9. Judge existence check
  // 10. Track assignment check (if tracks enabled)
  // 11. Duplicate check — judge + presenter combo must not exist in Votes
  
  // For audience votes (voterType == "audience"):
  // 8. Self-vote check — voterID must not match presenterID
  // 9. Duplicate check — voterID + presenterID must not exist in Votes
  
  // If all pass:
  // - Generate VoteID (UUID)
  // - For multi-rubric: insert one row per category
  // - For single: insert one row with categoryID = "total"
  // - Log to AuditLog: VOTE_SUBMITTED
  // - Return success
}
```

Also implement:
- getVotesForPresenter(presenterId) — for results calculation
- getVotesByJudge(judgeId) — for progress tracking
- getVotesByJudgeForPresenter(judgeId, presenterId) — for duplicate check
- getAllVotes(adminToken) — for export
- deleteVote(voteId, adminToken) — admin can remove erroneous votes
- getVotingStats() — counts by type, totals

### 2.9 — Results.gs
- refreshResults() — recalculates entire Results tab from Votes
  - For each presenter: calculate judgeAvg, audienceAvg, finalScore
  - For each presenter: calculate per-rubric breakdown (avg, count, stdDev)
  - For each presenter: calculate overall rank and track rank
  - Write all to Results tab
- getLeaderboard(trackId?) — returns ranked array
- getPresenterResult(presenterId) — full result with rubric breakdown
- getWinners() — top 3 overall + top 3 per track
- getPresenterPercentiles(presenterId) — percentile per rubric
- calculateScoreStats(scores) — mean, median, stdDev, min, max

### 2.10 — Reports.gs
- getJudgeQualityReport(adminToken) — full statistical report data
  - Per judge: mean, stdDev, perRubricStats, distributionHistogram, consistencyScore
  - Inter-rater reliability matrix
  - Overall reliability score
  - Outlier flags
- getCompetitorScorecardData(presenterId, adminToken) — all data for PDF
- getEventSummaryData(adminToken) — complete event statistics
- getVotingTimeline(adminToken) — votes aggregated by hour
- getRubricDifficultyAnalysis(adminToken)
- calculateInterRaterReliability(adminToken) — simplified ICC

### 2.11 — Email.gs
- sendMagicLink(judgeEmail, judgeName, token) — HTML email with button
- sendJudgeReminder(judgeEmail, judgeName, remaining, total)
- sendAdminAlert(type, data) — inactivity alert, completion alert
- sendScorecardReady(presenterEmail, presenterName, downloadLink)
- buildMagicLinkEmail(judgeName, link) — returns HTML string (well-designed)
- buildReminderEmail(judgeName, remaining, total) — returns HTML string

### 2.12 — Checkin.gs
- checkInPresenter(presenterId, adminToken)
- bulkCheckIn(presenterIds, adminToken)
- getCheckinStatus() — count checked in vs total
- markAbsent(presenterId, adminToken)

### 2.13 — Templates.gs
- saveAsTemplate(name, description, adminToken) — saves current settings as template
- loadTemplate(templateId, adminToken) — applies template settings to current event
- getAllTemplates()
- deleteTemplate(templateId, adminToken)

### 2.14 — Code.gs — THE ROUTER
```javascript
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action;
  
  // Route to correct handler
  const routes = {
    // Auth
    'validateToken': () => Auth.validateJudgeToken(payload.token),
    'validateAdminSession': () => Auth.validateAdminSession(payload.sessionToken),
    
    // Settings
    'getSettings': () => Settings.getSettings(),
    'updateSettings': () => Settings.updateSettings(payload.updates, payload.adminToken),
    
    // Presenters
    'getAllPresenters': () => Presenters.getAllPresenters(),
    'addPresenter': () => Presenters.addPresenter(payload.data, payload.adminToken),
    'editPresenter': () => Presenters.editPresenter(payload.id, payload.data, payload.adminToken),
    'deletePresenter': () => Presenters.deletePresenter(payload.id, payload.adminToken),
    'importPresenters': () => Presenters.importPresenters(payload.csvData, payload.adminToken),
    'checkInPresenter': () => Checkin.checkInPresenter(payload.id, payload.adminToken),
    
    // Judges
    'getAllJudges': () => Judges.getAllJudges(),
    'addJudge': () => Judges.addJudge(payload.data, payload.adminToken),
    'editJudge': () => Judges.editJudge(payload.id, payload.data, payload.adminToken),
    'deleteJudge': () => Judges.deleteJudge(payload.id, payload.adminToken),
    'sendInvitation': () => Judges.sendInvitation(payload.judgeId, payload.adminToken),
    'sendBulkInvitations': () => Judges.sendBulkInvitations(payload.judgeIds, payload.adminToken),
    'resendInvitation': () => Judges.resendInvitation(payload.judgeId, payload.adminToken),
    'getAllJudgeProgress': () => Judges.getAllJudgeProgress(),
    'sendReminder': () => Judges.sendReminder(payload.judgeId, payload.adminToken),
    'sendBulkReminders': () => Judges.sendBulkReminders(payload.adminToken),
    
    // Tracks
    'getAllTracks': () => Tracks.getAllTracks(),
    'addTrack': () => Tracks.addTrack(payload.data, payload.adminToken),
    
    // Votes
    'submitVote': () => Votes.submitVote(payload),
    'getVotingStats': () => Votes.getVotingStats(),
    'deleteVote': () => Votes.deleteVote(payload.voteId, payload.adminToken),
    
    // Results
    'refreshResults': () => Results.refreshResults(),
    'getLeaderboard': () => Results.getLeaderboard(payload.trackId),
    'getWinners': () => Results.getWinners(),
    
    // Reports
    'getJudgeQualityReport': () => Reports.getJudgeQualityReport(payload.adminToken),
    'getCompetitorScorecardData': () => Reports.getCompetitorScorecardData(payload.presenterId, payload.adminToken),
    'getEventSummaryData': () => Reports.getEventSummaryData(payload.adminToken),
    
    // Templates
    'getAllTemplates': () => Templates.getAllTemplates(),
    'saveAsTemplate': () => Templates.saveAsTemplate(payload.name, payload.description, payload.adminToken),
    'loadTemplate': () => Templates.loadTemplate(payload.templateId, payload.adminToken),
    
    // Export
    'getAllVotes': () => Votes.getAllVotes(payload.adminToken),
  };
  
  const handler = routes[action];
  if (!handler) return Utils.errorResponse('Unknown action: ' + action);
  
  return handler();
}

function doGet(e) {
  // Only public endpoints via GET
  const action = e.parameter.action;
  if (action === 'getSettings') return Settings.getPublicSettings();
  if (action === 'getLeaderboard') return Results.getLeaderboard(e.parameter.trackId);
  return Utils.errorResponse('Not found');
}
```

---

## PHASE 3: JUDGE PORTAL

### 3.1 — auth.js (frontend)
Complete session management module:
- saveJudgeSession(sessionData) — stores in localStorage with expiry
- getJudgeSession() — returns session or null if expired
- clearJudgeSession()
- isJudgeAuthenticated() — checks session exists and not expired
- requireJudgeAuth() — call at top of every judge page, redirects if not authenticated
- saveAdminSession(sessionData)
- getAdminSession()
- isAdminAuthenticated()
- requireAdminAuth()
- getJudgeToken() — from session
- getJudgeId() — from session

### 3.2 — api.js (frontend)
The ONLY file that calls fetch().
Every method wraps the Apps Script call.
Implements:
- request(action, payload) — base method with timeout, error handling, retry on network failure
- All methods listed in Code.gs routes
- requestWithOfflineSupport(action, payload) — for vote submission: stores offline if network fails

### 3.3 — scoring.js (frontend)
Client-side score calculation + validation (mirrors backend logic):
- validateScore(score, min, max, decimals)
- validateScoreSet(scores, rubricCategories)
- calculateWeightedAverage(scores, rubricCategories)
- calculateFinalScore(judgeAvg, audienceAvg, judgeWeight, audienceWeight)
- standardDeviation(scores)
- percentile(value, allValues)
- formatScore(score, decimals)

### 3.4 — offline.js
Complete offline queue implementation:
- addToQueue(action, payload) — stores in localStorage
- getQueue() — returns pending items
- syncQueue() — submits all queued votes, removes successful ones
- getQueueCount() — number of pending offline votes
- clearQueue()
- initOfflineDetection() — listens for online/offline events, auto-syncs on reconnect
- showOfflineStatus() — updates UI banner

### 3.5 — judge/login.html
Magic link landing page. Full implementation:
- Extract token from URL query parameter
- Show loading state while validating
- Call api.validateToken(token)
- On success:
  - Save full session to localStorage
  - Show welcome message with judge name
  - Show "Go to Dashboard" button
  - Auto-redirect after 3 seconds
- On token expired:
  - Show clear error with instructions to contact admin
  - Do NOT redirect anywhere
- On invalid token:
  - Show error message
- Design: Clean, welcoming, matches academic tone
- Must work perfectly on mobile

### 3.6 — judge/dashboard.html
Judge's personal command center:
- Header: judge name, event name, logout button
- Offline status banner (shows when offline, with queue count)
- Progress summary: "You have scored X of Y assigned presenters"
- Progress bar visualization
- Assigned presenters list:
  - Table with: Poster#, Name, Department, Track, Status (Scored/Not Scored)
  - Sortable by column
  - Filter: show all / show unscored only
  - Search by name or ID
  - Click row → goes to score.html?presenter=ID
  - Scored rows have green checkmark
- Quick stats: completion %, average score given, time since last submission
- "Scan QR Code" button (opens camera-based QR scanner using jsQR library)
- Notification if behind schedule

### 3.7 — judge/score.html — THE MOST USED PAGE
The scoring form. Must be perfect on mobile.

**URL parameters:** ?presenter=ID (from QR scan) OR manual entry
**Session:** Must be authenticated

**Page flow:**
1. Load presenter info from API (name, department, track, poster#)
2. Load rubric categories from event settings
3. Show scoring form
4. Submit scores
5. Show success confirmation
6. Offer: "Scan next QR" or "Go to dashboard"

**Scoring form for multi-rubric mode:**
- For each rubric category:
  - Category name + description
  - Score input (number, min=0, max=category.maxScore, step=0.01 if decimals)
  - Visual score indicator (shows score / max)
  - Optional: comment textarea (if category.allowComments)
- Score summary panel:
  - Shows each category score as entered
  - Running weighted total
  - Submit button (disabled until all categories filled)

**Scoring form for single mode:**
- One large score input
- Clear min/max display
- Optional comment

**Manual presenter ID entry:**
- If no presenter param in URL: show ID entry field
- "Load Presenter" button
- Validates ID exists before showing form

**After submission:**
- Large success checkmark animation
- Summary of what was submitted
- "Next Presenter" button (clears form for new entry)
- "Back to Dashboard" button

**Offline behavior:**
- If network fails: show "Saved offline" with yellow banner
- Count shows pending offline votes

---

## PHASE 4: ADMIN PORTAL

All admin pages check authentication on load.
All admin pages share a consistent sidebar navigation layout.

### 4.1 — admin/login.html
- Password entry form (admin password set during setup)
- Hash password client-side before comparison
- Store session on success
- Rate limit login attempts (3 tries, then 5 minute lockout in localStorage)
- Link: "First time? Configure your Script URL"

### 4.2 — admin/setup.html — Competition Setup Wizard
Multi-step wizard. Each step validates before allowing next.

**Step 1: Event Basics**
- Event Name (required)
- Event Date (date picker)
- Event Description
- Script URL (the Google Apps Script URL — test connection button)

**Step 2: Scoring Configuration**
- Scoring Mode: Judges Only / Judges + Audience / Custom
- Judge Weight (if custom or judges+audience mode)
- Audience Weight (auto-calculated to ensure sum = 100%)
- Score Type: Single Score OR Multi-Rubric
- If Single: max judge score, max audience score
- If Multi-Rubric: rubric builder
  - Add/remove/reorder categories
  - Each category: name, description, max score, weight, allow comments toggle
  - Live preview of total possible score

**Step 3: Competition Options**
- Enable Tracks/Categories (yes/no)
  - If yes: track builder (add tracks with name + color)
- Enable Presenter Check-in (yes/no)
- Enable Public Leaderboard (yes/no)
- Tiebreaker Rule selection
- Multi-day Event toggle
  - If yes: number of days

**Step 4: Admin Settings**
- Admin Password (set event admin password)
- Admin Email
- Notification preferences (checkboxes for each email type)
- Judge inactivity alert threshold (minutes)

**Step 5: Review + Create**
- Summary of all choices
- "Create Event" button
- Calls api to initialize Google Sheet with all settings
- Success: redirect to admin/index.html

### 4.3 — admin/presenters.html
Full presenter management:
- Header with count and "Add Presenter" button
- Import CSV button (with template download)
- Export CSV button
- Search + filter (by track, by check-in status)
- Paginated table (50 per page)
- Each row: ID, Name, Department, Track, Poster#, Check-in status, Actions (edit/delete)
- Inline edit or modal edit
- Bulk actions: delete selected, assign track, export selected
- Add Presenter modal: all fields, track selector
- CSV import: preview before confirming, show validation errors per row

### 4.4 — admin/judges.html
Full judge management:
- Header with count, completion summary (X of Y have logged in)
- Add Judge button, Import CSV button
- Table: ID, Name, Email, Status (Not Invited / Invited / Logged In), Assigned Track, Progress, Last Activity, Actions
- Actions per judge: Edit, Resend Invite, Send Reminder, Assign Presenters, Delete
- "Send All Invites" bulk action
- "Send Reminders to Incomplete" bulk action
- Add/Edit Judge modal
- Presenter assignment modal: assign specific presenters or "all" or by track

### 4.5 — admin/tracks.html
Track management (only shown if tracks enabled):
- Add/edit/delete tracks
- Color picker for each track
- Assign presenters to tracks (bulk or individual)
- Assign judges to tracks
- Track statistics: presenter count, judge count, completion %

### 4.6 — admin/qr-manager.html
QR code management:
- Grid view of all presenter QR codes
- Each card: presenter name, ID, department, QR code preview
- Individual actions: preview full size, download PNG
- Bulk actions: Download all as ZIP, Generate printable PDF
- Print PDF layout: configurable cards per page (1, 2, 4, 6, 9 per page)
- Each printed card:
  - Ava Judging System header
  - Presenter Name (large)
  - Presenter ID + Department + Track
  - Large QR code (centered)
  - "Scan to Rate This Presentation"
  - Event name + date footer
- Filter by track for partial print runs
- Judge QR codes section (for judge login links)

### 4.7 — admin/checkin.html
Presenter check-in management:
- Large search bar (search by name, ID, or poster number)
- Quick check-in: find presenter, click "Check In"
- Stats: X checked in / Y total (live updating)
- Table: all presenters with check-in status + timestamp
- Bulk import check-ins from CSV
- Mark as absent
- Check-in history log

### 4.8 — admin/progress.html — Judge Progress Dashboard
Live monitoring of judge completion:

- Summary row: X judges, Y total assignments, Z% complete
- Auto-refresh every 60 seconds
- Filter: show all / show incomplete / show inactive
- Per judge card showing:
  - Judge name
  - Progress bar (scored / assigned)
  - Percentage
  - Last activity (e.g., "2 min ago")
  - Inactivity flag (red if > configured threshold)
  - "Send Reminder" button
  - "View Scores" link
- Sortable: by completion %, by last activity, by name
- Missing evaluations panel: for each judge, list which presenters are unscored
- Alert banner if any judge has been inactive > threshold

### 4.9 — admin/results.html — Live Leaderboard
- Voting control strip: Open / Pause / Close buttons (big, clear)
- Current status banner (color-coded)
- "Refresh Results" button + auto-refresh toggle
- Filter by track
- Full leaderboard table:
  - Rank (with medal for 1-3), Presenter Name, Department, Track
  - Judge Avg, Audience Avg (if enabled), Final Score
  - Judge Votes, Audience Votes
  - Rubric breakdown (expandable row)
- Score distribution histogram (Chart.js)
- Top 3 winners section (visual, ceremony-ready)
- Track winners sections

### 4.10 — admin/reports.html — Analytics + Statistical Reports
Tabs: Judge Quality | Competitor Scorecards | Event Summary

**Judge Quality Tab:**
- Generate report button
- Summary: overall inter-rater reliability score with interpretation
- Per judge: expandable card with full stats
  - Mean, std dev per rubric (bar chart)
  - Score distribution histogram
  - Outlier flag if applicable
- Pairwise correlation heatmap
- Export: Judge Quality Report PDF

**Competitor Scorecards Tab:**
- Search presenter
- Individual scorecard preview
  - All data as it will appear in PDF
  - Radar chart (Chart.js)
  - Rubric bars
  - Comments section
- Actions: Download PDF, Email to Presenter
- Bulk: Generate all scorecards, Email all presenters

**Event Summary Tab:**
- All event statistics
- Charts: score distribution, voting timeline, rubric difficulty
- Export: Event Summary PDF, Full Results Excel

### 4.11 — admin/templates.html
Event template library:
- Current event → Save as Template
- Template list: name, description, date saved, rubric count
- Load template → applies to current event settings
- Delete template
- Export/import templates as JSON

### 4.12 — admin/index.html — Main Admin Dashboard
The live event hub:

- Top status bar: event name, date, voting status (color coded)
- Voting controls: Open / Pause / Close (large buttons)
- Stats row (5 stat cards):
  - Total Presenters / Checked In
  - Total Judges / Logged In
  - Total Votes
  - Completion %
  - Leading Presenter
- Judge Progress panel: mini version of progress.html
- Recent Votes feed: last 10 votes (live updating)
- Alerts panel: inactive judges, any issues
- Quick Actions: Send Reminders, Refresh Results, Export CSV
- Live score chart: top 10 presenters bar chart (Chart.js, auto-refresh)

---

## PHASE 5: PUBLIC PAGES

### 5.1 — vote.html — Audience Voting Page
URL: vote.html?presenter=ID

**Load flow:**
- Get presenter ID from URL
- Fetch presenter info from API
- Check voting status — if closed: show "Voting is closed" message
- Show voting form

**Voter identity fields:**
- Student ID (required — for duplicate check)
- Full Name (required)
- Note: "Your ID will only be used to prevent duplicate votes"
- Honeypot field (hidden, if filled = bot)

**Scoring:**
- Same rubric display as judge scoring (but audience-appropriate labels)
- No comment field for audience

**Validation:**
- Client-side: all fields required, score in range
- Server-side: duplicate check, self-vote check

**Success state:**
- Thank you message
- Presenter name they voted for
- "Vote for another presenter" (requires scanning a different QR)

### 5.2 — leaderboard.html — Public Leaderboard
Public-facing, suitable for display on a large screen at the event.

- Auto-refresh every 30 seconds
- Reads publicLeaderboard setting — if false, show "Results will be announced at the ceremony"
- If true: full live leaderboard
- Track filter tabs
- Top 3 highlighted with gold/silver/bronze styling
- Responsive: works on TV, tablet, phone
- Optional: full-screen mode button

### 5.3 — index.html — Landing Page
Project landing page:
- Ava Judging System branding
- Brief description
- Links: Admin Portal, Judge Login, Public Leaderboard
- GitHub link
- "Powered by Ava Judging System" footer

---

## PHASE 6: EXPORT MODULE

### 6.1 — charts.js
Chart.js wrapper module:
- renderBarChart(canvasId, data, options)
- renderRadarChart(canvasId, data, options) — for competitor scorecards
- renderHistogram(canvasId, data, options) — for score distributions
- renderLineChart(canvasId, data, options) — for voting timeline
- renderHeatmap(canvasId, matrix, labels) — for inter-rater correlation
- All charts use CSS variable colors
- All charts are responsive
- exportChartAsPNG(canvasId) — returns data URL for PDF embedding

### 6.2 — reports.js
Client-side report assembly:
- generateJudgeQualityReport(data) — assembles report data into structured object for PDF
- generateCompetitorScorecard(presenterData, eventData) — for PDF
- generateEventSummary(eventData) — for PDF
- generateWinnerReport(winners, eventData) — ceremony-ready

### 6.3 — export.js
All export functionality:
- exportVotesCSV(votes) — raw vote data
- exportResultsCSV(results) — rankings
- exportResultsExcel(results, judgeStats, eventData) — multi-sheet Excel with SheetJS
  - Sheet 1: Summary
  - Sheet 2: Full Rankings
  - Sheet 3: Rubric Breakdown per Presenter
  - Sheet 4: Judge Statistics
- exportQRCodesZIP(presenters, qrOptions) — JSZip, one PNG per presenter
- exportQRPosterPDF(presenters, settings) — jsPDF, printable cards
- exportCompetitorScorecardPDF(scorecardData) — individual PDF
- exportAllScorecardsPDF(allScorecardData) — bulk PDF
- exportJudgeQualityReportPDF(reportData) — statistical report PDF
- exportEventSummaryPDF(summaryData) — full event report PDF
- exportWinnerReportPDF(winners, eventData) — ceremony document
- exportEventConfigJSON(settings) — backup/template export

All PDF exports use jsPDF and are professionally formatted:
- Ava Judging System header with logo
- Event name and date
- Proper typography hierarchy
- Page numbers
- Generated date footer

---

## PHASE 7: QR MODULE

### 7.1 — qr.js
- generateQRCode(text, options) — returns canvas or data URL using QRCode.js
- generatePresenterQRURL(presenterId) — full URL for presenter voting page
- generateJudgeQRURL(token) — full URL for judge login
- renderQRToCanvas(canvasId, text, options)
- downloadQRAsPNG(presenterId, presenterName)
- generateAllQRsAsZIP(presenters) — uses JSZip
- renderQRPosterCard(presenter, eventData) — returns HTML element for print

---

## PHASE 8: NOTIFICATIONS

### 8.1 — notifications.js
- init() — starts polling for status changes
- showToast(message, type, duration)
- showPersistentBanner(message, type)
- hidePersistentBanner()
- showOfflineBanner(queueCount)
- hideOfflineBanner()
- showSyncSuccess(count)
- showVotingStatusChange(newStatus)
- requestBrowserNotification(message) — if user granted permission
- initBrowserNotificationPermission()

---

## PHASE 9: OPEN SOURCE FILES

### README.md — Write a complete, professional README:

```markdown
# Ava Judging System

> Free, open-source QR-based judging platform for academic research presentations

[badges: MIT License, GitHub Stars, GitHub Issues, PRs Welcome]

[Screenshot of admin dashboard]

## Features
[Complete feature list from CLAUDE.md — formatted as checkboxes]

## Quick Start (5 steps)
[Concise numbered steps]

## Documentation
[Links to all docs/ files]

## Demo
[Link to demo if available]

## Contributing
[Link to CONTRIBUTING.md]

## License
MIT
```

### CONTRIBUTING.md — Full contributor guide
### CODE_OF_CONDUCT.md — Contributor Covenant standard
### CHANGELOG.md — Start with v1.0.0 entry
### .github/ISSUE_TEMPLATE/bug_report.md
### .github/ISSUE_TEMPLATE/feature_request.md
### .github/PULL_REQUEST_TEMPLATE.md

---

## DEMO DATA

### demo/sample-presenters.csv
Generate 20 realistic PhD presenter entries:
- Mix of departments: Computer Science, Biology, Physics, Chemistry, Mechanical Engineering, Civil Engineering, Electrical Engineering, Mathematics
- Mix of tracks if applicable
- Realistic names
- Realistic poster numbers P101-P120

### demo/sample-judges.csv
5 judge entries with realistic names and emails.

### demo/sample-votes.csv
100 vote records covering all 20 presenters with 5 judges.
Realistic score distributions (normal distribution, mean ~18/25, std dev ~3).

---

## DOCUMENTATION

### docs/setup-guide.md
Step-by-step guide:
1. Create Google Sheet
2. Set up Apps Script
3. Configure sheet tabs (exact tab names + column headers)
4. Deploy Apps Script as web app (exact settings)
5. Copy Script URL
6. Fork/clone GitHub repo
7. Configure config.js with Script URL
8. Enable GitHub Pages
9. Create first event in setup wizard
10. Test with sample data

### docs/deployment-guide.md
### docs/admin-guide.md
### docs/judge-guide.md
### docs/api-reference.md — document every route in Code.gs

---

## FINAL QUALITY CHECKLIST

Before considering any phase complete, verify:

**Functionality:**
- [ ] Every button does something when clicked
- [ ] Every form validates and shows errors
- [ ] Every API call handles both success and error responses
- [ ] Every page that requires auth redirects if not authenticated
- [ ] Offline mode stores votes and syncs on reconnect

**Mobile:**
- [ ] Score page works on 375px wide screen (iPhone SE)
- [ ] All tap targets are >= 44px
- [ ] No horizontal scroll on any page
- [ ] QR scanner works on mobile camera

**Code Quality:**
- [ ] Every JS function has JSDoc comment
- [ ] No hardcoded user-facing strings (all in i18n.js)
- [ ] No hardcoded colors (all in variables.css)
- [ ] No console.log outside DEBUG flag check
- [ ] No TODO comments
- [ ] No placeholder implementations

**Security:**
- [ ] Every admin page has auth check at top
- [ ] Every judge page has auth check at top
- [ ] Token sent in request body, not URL
- [ ] All user input escaped before DOM insertion

**Accessibility:**
- [ ] All form inputs have labels
- [ ] All images have alt text
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
