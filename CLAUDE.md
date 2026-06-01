# CLAUDE.md — Ava Judging System
# THE AUTHORITATIVE PROJECT CONSTITUTION
# Last Updated: 2026
# Version: 1.0.0

---

## ⚠️ CRITICAL INSTRUCTION FOR CLAUDE CODE

**NEVER simplify. NEVER skip features. NEVER generate placeholder code.**
Every function must be fully implemented. Every feature in this document must exist in the final code.
If something is complex, implement it correctly. Complexity is not a reason to simplify.
This is a production system used at real academic events with real people.

---

## Project Identity

**Name:** Ava Judging System
**Purpose:** Free, open-source, QR-based research presentation judging platform for academic events
**Target Users:** PhD symposiums, undergraduate research days, poster competitions, hackathons
**Scale:** Up to 200 presenters, 30+ judges per event
**Stack:** GitHub Pages (frontend) + Google Apps Script + Google Sheets (backend)
**License:** MIT
**Repo:** https://github.com/mdindoost/Ava-Judging-System

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Pages                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Admin   │  │  Judge   │  │  Audience/Public │  │
│  │  Portal  │  │  Portal  │  │  Vote Page       │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
└───────┼─────────────┼─────────────────┼─────────────┘
        │             │                 │
        └─────────────┴─────────────────┘
                      │
              HTTPS POST/GET
                      │
┌─────────────────────▼─────────────────────────────┐
│              Google Apps Script                    │
│  ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │  Auth   │ │ Votes  │ │Results │ │ Reports  │  │
│  │  .gs    │ │  .gs   │ │  .gs   │ │   .gs    │  │
│  └────┬────┘ └───┬────┘ └───┬────┘ └────┬─────┘  │
└───────┼──────────┼──────────┼───────────┼─────────┘
        └──────────┴──────────┴───────────┘
                      │
┌─────────────────────▼─────────────────────────────┐
│              Google Sheets                         │
│  Settings | Presenters | Judges | Votes |          │
│  Results  | AuditLog   | Tracks | Templates        │
└────────────────────────────────────────────────────┘
```

---

## Complete File Structure

```
ava-judging-system/
│
├── index.html                    # Public landing page
├── vote.html                     # Audience/student voting page
├── leaderboard.html              # Public leaderboard (toggleable)
├── CLAUDE.md                     # This file
├── README.md                     # Public documentation
├── CHANGELOG.md                  # Version history
├── CONTRIBUTING.md               # Contributor guide
├── CODE_OF_CONDUCT.md            # Community standards
├── LICENSE                       # MIT License
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── admin/
│   ├── index.html                # Admin dashboard (live event hub)
│   ├── login.html                # Admin authentication
│   ├── setup.html                # Competition setup wizard
│   ├── presenters.html           # Presenter management
│   ├── judges.html               # Judge management
│   ├── tracks.html               # Track/category management
│   ├── qr-manager.html           # QR generation + bulk print
│   ├── results.html              # Live leaderboard + rankings
│   ├── progress.html             # Judge completion dashboard
│   ├── reports.html              # Analytics + statistical reports
│   ├── checkin.html              # Presenter check-in management
│   └── templates.html            # Event template library
│
├── judge/
│   ├── login.html                # Magic link landing + session init
│   ├── dashboard.html            # Judge's personal scoring dashboard
│   └── score.html                # Scoring form (QR scan or manual ID)
│
├── assets/
│   ├── css/
│   │   ├── variables.css         # ALL CSS custom properties
│   │   ├── base.css              # Reset, typography, global styles
│   │   ├── components.css        # Reusable UI components
│   │   ├── admin.css             # Admin portal styles
│   │   ├── judge.css             # Judge portal styles
│   │   ├── vote.css              # Voting page styles
│   │   ├── reports.css           # Charts and report styles
│   │   └── print.css             # Print/PDF styles
│   │
│   ├── js/
│   │   ├── config.js             # SINGLE SOURCE OF TRUTH for all config
│   │   ├── api.js                # ALL Google Apps Script calls
│   │   ├── auth.js               # Token/session management
│   │   ├── qr.js                 # QR generation + download
│   │   ├── export.js             # CSV/Excel/PDF export
│   │   ├── scoring.js            # Score calculation + validation
│   │   ├── charts.js             # Chart rendering (Chart.js wrapper)
│   │   ├── reports.js            # Report generation logic
│   │   ├── offline.js            # Offline queue + sync
│   │   ├── notifications.js      # In-app + email notifications
│   │   ├── i18n.js               # Internationalization (English strings)
│   │   └── ui.js                 # Shared UI utilities
│   │
│   ├── fonts/                    # Self-hosted fonts (no Google Fonts CDN)
│   └── img/
│       └── logo.svg              # Ava Judging System logo
│
├── backend/
│   ├── Code.gs                   # Main router + doGet + doPost
│   ├── Auth.gs                   # Token generation + validation
│   ├── Settings.gs               # Event config read/write
│   ├── Presenters.gs             # Presenter CRUD
│   ├── Judges.gs                 # Judge CRUD + assignment
│   ├── Tracks.gs                 # Track/category management
│   ├── Votes.gs                  # Vote submission + validation
│   ├── Results.gs                # Score computation + ranking
│   ├── Reports.gs                # Statistical report generation
│   ├── Email.gs                  # Magic link + notification emails
│   ├── Checkin.gs                # Presenter check-in
│   ├── Templates.gs              # Event template save/load
│   ├── RateLimit.gs              # Request throttling
│   └── Utils.gs                  # Shared utilities
│
├── demo/
│   ├── sample-presenters.csv     # 20 sample presenters
│   ├── sample-judges.csv         # 5 sample judges
│   ├── sample-votes.csv          # 100 sample votes
│   └── README.md                 # How to use demo data
│
└── docs/
    ├── setup-guide.md            # Google Sheet + Apps Script setup
    ├── deployment-guide.md       # GitHub Pages deployment
    ├── admin-guide.md            # Admin user manual
    ├── judge-guide.md            # Judge user manual
    ├── api-reference.md          # Apps Script endpoint docs
    └── screenshots/              # UI screenshots for README
```

---

## Technology Decisions

### Frontend
- **Vanilla JS only** — No React, No Vue, No jQuery, No frameworks
- **No build step** — All files work directly in the browser
- **Chart.js** — For all charts and visualizations (CDN)
- **QRCode.js** — For QR generation (CDN)
- **JSZip** — For bulk QR download as ZIP (CDN)
- **jsPDF** — For PDF export (CDN)
- **SheetJS (xlsx.js)** — For Excel export (CDN)
- **Self-hosted fonts** — No Google Fonts CDN dependency

### Backend
- **Google Apps Script** — Free, serverless, integrates with Sheets
- **Google Sheets** — One sheet per event
- **Gmail API** — For magic link emails (built into Apps Script)

### Hosting
- **GitHub Pages** — Free static hosting

---

## Code Standards — MANDATORY

### JavaScript
```javascript
// EVERY function must have JSDoc
/**
 * Submits a judge's score for a presenter.
 * @param {string} presenterId - The presenter's unique ID
 * @param {string} judgeToken - The judge's session token
 * @param {Array<{category: string, score: number, comment: string}>} scores - Array of rubric scores
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
async function submitJudgeScore(presenterId, judgeToken, scores) { ... }

// ALL user-facing strings go through i18n module
// NEVER hardcode user-visible text
ui.showError(STRINGS.errors.invalidScore);  // ✓
ui.showError("Invalid score");              // ✗

// ALL API calls go through api.js ONLY
// NEVER call fetch() directly from page scripts
const result = await api.submitVote(payload);  // ✓
const result = await fetch(SCRIPT_URL, {...}); // ✗

// Debug logging uses DEBUG flag, never console.log in production
if (CONFIG.DEBUG) console.log('[Auth]', 'Token validated', tokenId);

// Error handling: always catch, always surface to user
try {
  const result = await api.submitVote(payload);
  if (!result.success) throw new Error(result.error);
  ui.showSuccess(STRINGS.success.voteSubmitted);
} catch (err) {
  ui.showError(err.message || STRINGS.errors.generic);
  logger.error('submitVote failed', err);
}
```

### CSS
```css
/* ALL values use CSS variables — no hardcoded colors or sizes */
/* variables.css is the single source of truth */
:root {
  /* Colors */
  --color-primary: #1a365d;
  --color-primary-light: #2a4a7f;
  --color-accent: #e53e3e;
  --color-success: #38a169;
  --color-warning: #d69e2e;
  --color-danger: #e53e3e;
  --color-text: #1a202c;
  --color-text-muted: #718096;
  --color-bg: #ffffff;
  --color-bg-secondary: #f7fafc;
  --color-border: #e2e8f0;
  
  /* Typography */
  --font-display: 'Your-Display-Font', serif;
  --font-body: 'Your-Body-Font', sans-serif;
  --font-mono: 'Your-Mono-Font', monospace;
  
  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

/* Mobile-first — base styles for mobile, media queries for larger */
/* Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl) */
```

### Google Apps Script
```javascript
// EVERY endpoint validates before doing anything
function doPost(e) {
  // 1. Parse request
  // 2. Validate token (if required)
  // 3. Rate limit check
  // 4. Business logic
  // 5. Log to AuditLog
  // 6. Return consistent response
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: result, error: null }))
    .setMimeType(ContentService.MimeType.JSON);
}

// EVERY response follows this schema — no exceptions
// Success: { success: true, data: <any>, error: null }
// Failure: { success: false, data: null, error: "Human readable message" }

// EVERY write operation logs to AuditLog
logAudit(actor, action, details, sessionToken);
```

---

## Google Sheets Schema

### Tab: Settings
| Key | Value | Notes |
|-----|-------|-------|
| eventName | "NJIT PhD Symposium 2026" | |
| eventDate | "2026-04-15" | ISO format |
| scoringMode | "judges_only" OR "judges_audience" OR "custom" | |
| judgeWeight | 75 | Percentage, integer |
| audienceWeight | 25 | Percentage, integer |
| votingStatus | "open" OR "paused" OR "closed" | |
| rubricMode | "single" OR "multi" | |
| rubricCategories | JSON string | See schema below |
| tracksEnabled | "true" OR "false" | |
| tiebreakerRule | "judge_avg" OR "vote_count" OR "random" | |
| publicLeaderboard | "true" OR "false" | |
| selfVotePrevention | "true" OR "false" | |
| audienceVotingEnabled | "true" OR "false" | |
| maxAudienceScore | 25 | Per category or total |
| maxJudgeScore | 25 | Per category or total |
| allowDecimalScores | "true" OR "false" | |
| multiDayEvent | "false" OR "true" | |
| currentDay | 1 | Integer |
| adminPasswordHash | SHA256 hash | |
| superAdminEmail | email string | |
| createdAt | ISO timestamp | |
| lastModified | ISO timestamp | |

**rubricCategories JSON schema:**
```json
[
  {
    "id": "clarity",
    "name": "Clarity of Presentation",
    "maxScore": 5,
    "weight": 1.0,
    "allowComments": true,
    "description": "How clearly did the presenter explain their research?"
  },
  {
    "id": "innovation",
    "name": "Innovation & Originality",
    "maxScore": 5,
    "weight": 1.0,
    "allowComments": true,
    "description": "How novel is the research contribution?"
  }
]
```

### Tab: Presenters
| Column | Type | Notes |
|--------|------|-------|
| ID | String | Auto-generated P001, P002... |
| Name | String | Full name |
| Department | String | |
| Email | String | Optional |
| PosterNumber | String | Physical poster # |
| Track | String | Category/track ID |
| CheckedIn | Boolean | TRUE/FALSE |
| CheckInTime | Timestamp | ISO |
| Active | Boolean | FALSE = soft deleted |
| CreatedAt | Timestamp | |

### Tab: Judges
| Column | Type | Notes |
|--------|------|-------|
| ID | String | Auto-generated J001, J002... |
| Name | String | |
| Email | String | Required for magic link |
| Token | String | UUID v4 |
| TokenExpiry | Timestamp | 24h from send |
| TokenUsed | Boolean | |
| TokenUsedAt | Timestamp | |
| AssignedTrack | String | Empty = all tracks |
| AssignedPresenters | String | JSON array or empty = all |
| Active | Boolean | |
| CreatedAt | Timestamp | |
| LastActivity | Timestamp | |

### Tab: Votes
| Column | Type | Notes |
|--------|------|-------|
| VoteID | String | UUID |
| Timestamp | Timestamp | ISO |
| PresenterID | String | |
| PresenterName | String | Denormalized |
| VoterType | String | "judge" OR "audience" |
| VoterID | String | Judge ID or audience-provided ID |
| VoterName | String | |
| RubricCategoryID | String | "total" if single mode |
| Score | Number | Decimal allowed |
| Comment | String | Optional judge comment |
| SessionToken | String | Judge token (audience = empty) |
| EventDay | Integer | For multi-day events |
| IPHash | String | Hashed, for abuse detection |

### Tab: Results (computed, refreshed by Apps Script)
| Column | Type | Notes |
|--------|------|-------|
| PresenterID | String | |
| Name | String | |
| Department | String | |
| Track | String | |
| JudgeAvg | Number | Weighted average across rubrics |
| AudienceAvg | Number | |
| FinalScore | Number | Weighted composite |
| JudgeVoteCount | Integer | |
| AudienceVoteCount | Integer | |
| RubricBreakdown | String | JSON: {categoryId: {avg, count, stdDev}} |
| OverallRank | Integer | |
| TrackRank | Integer | |
| CheckedIn | Boolean | |
| Active | Boolean | |

### Tab: AuditLog
| Column | Type | Notes |
|--------|------|-------|
| LogID | String | UUID |
| Timestamp | Timestamp | |
| Actor | String | JudgeID, AdminID, or "system" |
| ActorType | String | "judge", "admin", "audience", "system" |
| Action | String | See action enum below |
| EntityType | String | "vote", "presenter", "judge", "settings" |
| EntityID | String | |
| Details | String | JSON |
| SessionToken | String | Hashed |
| IPHash | String | |

**Action enum:** VOTE_SUBMITTED, VOTE_REJECTED, TOKEN_VALIDATED, TOKEN_EXPIRED, SETTINGS_CHANGED, PRESENTER_ADDED, PRESENTER_EDITED, PRESENTER_DELETED, JUDGE_ADDED, JUDGE_INVITED, JUDGE_LOGIN, VOTING_OPENED, VOTING_PAUSED, VOTING_CLOSED, RESULTS_EXPORTED, CHECKIN_MARKED

### Tab: Tracks
| Column | Type | Notes |
|--------|------|-------|
| TrackID | String | |
| Name | String | |
| Description | String | |
| Color | String | Hex color for UI |
| Active | Boolean | |

### Tab: Templates
| Column | Type | Notes |
|--------|------|-------|
| TemplateID | String | |
| Name | String | |
| Description | String | |
| Config | String | Full settings JSON |
| CreatedAt | Timestamp | |
| CreatedBy | String | |

---

## Authentication System — Full Specification

### Roles
```
SuperAdmin
  └── Can do everything
  └── Authenticated via hardcoded credentials in config.js (hashed)
  └── Can create/delete events
  └── Can create per-event admins

EventAdmin
  └── Authenticated via session token (localStorage)
  └── Can manage one event: presenters, judges, settings, QR, reports
  └── Cannot access other events

Judge
  └── Authenticated via email magic link (tokenized URL)
  └── Token = UUID v4, stored in Judges sheet
  └── Token expires 24 hours after send
  └── Token stored in localStorage after first use
  └── Every API call sends token in request body
  └── Server validates token on every write

Audience
  └── No authentication
  └── Self-reported Student ID + Name
  └── Server checks for duplicates by VoterID + PresenterID
  └── Self-vote prevention by comparing VoterID to PresenterID
```

### Magic Link Flow
```
1. Admin adds judge email to Judges sheet
2. Admin clicks "Send Invite" (individual or bulk)
3. Apps Script (Email.gs):
   a. Generate UUID v4 token
   b. Set expiry = now + 24 hours
   c. Store token + expiry in Judges sheet
   d. Send email: "Your judging link: https://[github-pages]/judge/login.html?token=UUID"
4. Judge clicks link → judge/login.html
5. login.html calls api.validateToken(token)
6. Apps Script (Auth.gs):
   a. Find token in Judges sheet
   b. Check not expired
   c. Check not already used by different device (optional strict mode)
   d. Return: {success: true, data: {judgeId, judgeName, assignedTrack, assignedPresenters}}
7. login.html stores in localStorage:
   { token, judgeId, judgeName, assignedTrack, expiresAt }
8. Redirect to judge/dashboard.html
9. All subsequent requests include token in body
10. Token is re-validated server-side on every write
```

### Admin Session Flow
```
1. Admin goes to admin/login.html
2. Enters password
3. JS hashes password with SHA-256
4. Compares to hash stored in config.js (for super-admin)
   OR calls api.validateAdminPassword() for event-admins
5. On success: generate session token, store in sessionStorage
6. Redirect to admin/index.html
7. All admin pages check sessionStorage on load, redirect if missing
```

---

## Scoring System — Full Specification

### Single Score Mode
- One score per presenter per judge
- Range: 0 to maxJudgeScore (configurable, default 25)
- Decimals allowed (up to 2 decimal places)
- Final Judge Average = mean of all judge scores

### Multi-Rubric Mode
- N categories defined by admin (e.g., Clarity 0-5, Innovation 0-5, Methodology 0-5)
- Each category has: id, name, maxScore, weight, allowComments
- Judge scores each category separately
- Optional written comment per category
- Category weighted average = sum(score_i * weight_i) / sum(weight_i)
- Final Judge Score = weighted average normalized to maxJudgeScore

### Score Calculation (scoring.js)
```javascript
// Multi-rubric final score calculation
function calculatePresenterJudgeScore(votes, rubricCategories) {
  // Group votes by category
  // For each category: avg = mean of all judge scores
  // Weighted total = sum(categoryAvg * categoryWeight) / sum(weights)
  // Normalize to 0-100 scale for comparison
}

// Final composite score
function calculateFinalScore(judgeAvg, audienceAvg, judgeWeight, audienceWeight) {
  return (judgeAvg * judgeWeight / 100) + (audienceAvg * audienceWeight / 100);
}

// Standard deviation (for judge quality reports)
function standardDeviation(scores) {
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

// Inter-rater reliability (simplified Krippendorff's alpha)
function interRaterReliability(judgeScoreMatrix) { ... }
```

### Validation Rules
- Score must be a number
- Score must be >= 0
- Score must be <= maxScore for that category
- Score must have at most 2 decimal places
- Judge cannot score same presenter twice (server-side check)
- Audience cannot score same presenter twice (server-side check by VoterID)
- Audience VoterID cannot match PresenterID (self-vote)
- Judge can only score presenters in their assigned track (if tracks enabled)
- Voting must be "open" (not paused or closed)
- Token must be valid and not expired

---

## Reports System — Full Specification

### Report 1: Judge Quality Report (admin only)
Generated from all votes in the Votes sheet.

**Per-judge statistics:**
- Total presenters scored / total assigned
- Completion percentage
- Mean score given (across all presenters)
- Standard deviation of scores given
- Per-rubric: mean + std dev
- Score distribution histogram (buckets: 0-5, 5-10, 10-15, 15-20, 20-25)
- Consistency score: correlation between judge's scores and consensus
- Response time: average time between scans
- Last activity timestamp
- "Outlier flag": if judge's mean is >1.5 SD from group mean, flag as potential calibration issue

**Inter-rater reliability:**
- Krippendorff's alpha or Intraclass Correlation Coefficient
- Pairwise judge correlation matrix (heatmap)
- Overall reliability score with interpretation (poor/fair/good/excellent)

**Export:** PDF report + CSV data

---

### Report 2: Competitor Scorecard (shareable with presenter)
One PDF per presenter, shareable after event closes.

**Contents:**
- Presenter name, department, event name, date
- Overall rank (#X of Y presenters)
- Track rank (#X of Y in their track, if applicable)
- Final score (with judge/audience breakdown if applicable)
- Per-rubric breakdown:
  - Bar showing their score vs max possible
  - Their score vs event average for that rubric
  - Percentile rank for that rubric
- Radar/spider chart across all rubrics
- Anonymized written comments from judges (combined, judge identity hidden)
- "Strengths" summary (rubrics where they scored above average)
- "Areas for growth" summary (rubrics where they scored below average)

**Export:** PDF (jsPDF) + option to email directly to presenter

---

### Report 3: Event Summary Report (admin)
Complete event statistics.

**Contents:**
- Event overview: name, date, total presenters, total judges, total votes
- Overall score distribution histogram
- Top 10 presenters leaderboard
- Winners by track
- Rubric difficulty analysis:
  - Average score per rubric across all presenters
  - Which rubric was hardest / easiest
  - Score variance per rubric
- Judge participation summary
- Voting activity timeline (votes per hour chart)
- Audience vs judge score correlation
- Data quality notes (low-participation judges, etc.)

**Export:** PDF + Excel

---

### Report 4: Live Leaderboard (public or admin)
Real-time updating table.

**Contents:**
- Rank, Presenter Name, Department, Track, Final Score, Judge Avg, Audience Avg, Vote Count
- Filter by track
- Toggle to show/hide scores (admin can blind the leaderboard during event)
- Highlight top 3 with medal icons
- Auto-refresh every 30 seconds

---

## Offline Mode — Full Specification

Critical for large venue events with unreliable WiFi.

### Implementation (offline.js)
```javascript
// Vote queue stored in localStorage
const OFFLINE_QUEUE_KEY = 'ava_offline_queue';

// On vote submission:
// 1. Try online submission first
// 2. If fetch fails (network error):
//    a. Store vote in offline queue with timestamp
//    b. Show "Saved offline — will sync when connected"
// 3. Listen for 'online' event
// 4. On reconnect: sync all queued votes in order
// 5. Show sync status to judge

// Queue schema:
{
  id: UUID,
  timestamp: ISO,
  presenterId: string,
  judgeToken: string,
  scores: [...],
  retryCount: 0,
  synced: false
}
```

---

## Notifications System — Full Specification

### In-App Notifications (notifications.js)
- Toast notifications for every action (success/error/warning/info)
- Persistent banner for voting status changes (opened/paused/closed)
- Badge counter on admin dashboard for unread alerts

### Email Notifications (Email.gs)
- Judge invitation with magic link
- Judge reminder: "You have X presenters remaining" (sent at configurable intervals)
- Admin alert: judge has been inactive for 30+ minutes
- Admin alert: all judges have completed their assignments
- Presenter scorecard: "Your results are ready" (sent after voting closes)
- Configurable: admin can enable/disable each notification type

---

## Export System — Full Specification

### exports from export.js:
1. **Raw Votes CSV** — All vote records with all columns
2. **Results CSV** — Final rankings with all score components
3. **Results Excel** — Formatted spreadsheet with multiple sheets (Summary, Rankings, Rubric Breakdown, Judge Stats)
4. **Judge Quality Report PDF** — Full statistical report
5. **Competitor Scorecard PDF** — Individual per-presenter (one or bulk)
6. **Winner Report PDF** — Ceremony-ready winner announcement
7. **QR Poster PDF** — All presenter QR codes for printing
8. **QR ZIP** — Individual PNG files for each presenter
9. **Event Config JSON** — Full event settings for backup/template

---

## Security Checklist

### Client-Side
- [ ] Score range validation before submission
- [ ] Token presence check on every judge page load
- [ ] Token expiry check (compare to stored expiresAt)
- [ ] Self-vote ID comparison before submission
- [ ] No sensitive data in URL parameters (token only in URL for initial login, then moved to localStorage)
- [ ] XSS prevention: escape all user-provided strings before DOM insertion
- [ ] No eval(), no innerHTML with user data (use textContent or sanitized HTML)

### Server-Side (Apps Script)
- [ ] Token validation on every write endpoint
- [ ] Rate limiting: max 2 requests per second per token (RateLimit.gs)
- [ ] Duplicate vote check: VoterID + PresenterID + CategoryID must be unique in Votes sheet
- [ ] Self-vote check: VoterID != PresenterID
- [ ] Presenter existence check: PresenterID must exist in Presenters sheet
- [ ] Judge existence check: token must match a row in Judges sheet
- [ ] Voting status check: Settings.votingStatus must be "open"
- [ ] Score range check: 0 <= score <= maxScore
- [ ] Track assignment check (if tracks enabled)
- [ ] Honeypot field check for audience votes
- [ ] IP hash logging (for abuse pattern detection, not exposed to front end)
- [ ] CORS: Apps Script returns correct headers

---

## Performance Considerations

- Results sheet is refreshed on-demand (not on every vote) — call refreshResults() manually or via time trigger
- Leaderboard polls every 30 seconds, not on every keystroke
- QR codes generated client-side (no server call needed)
- Bulk QR ZIP generated client-side with JSZip
- Judge dashboard loads assigned presenters once, caches in localStorage, refreshes every 5 minutes
- Admin dashboard uses pagination for presenter/judge lists (50 per page)

---

## Accessibility Requirements

- All interactive elements keyboard-navigable
- ARIA labels on all form inputs
- Color is never the only indicator (icons + text always accompany color)
- Minimum contrast ratio 4.5:1 for all text
- High contrast mode toggle (CSS class on body)
- Large text mode toggle (CSS class on body, increases all font sizes by 25%)
- Focus indicators visible and clear
- Error messages associated with their input via aria-describedby

---

## i18n Structure (i18n.js)

```javascript
// ALL user-facing strings live here — no hardcoded text elsewhere
export const STRINGS = {
  errors: {
    generic: "Something went wrong. Please try again.",
    invalidScore: "Score must be between 0 and {max}.",
    duplicateVote: "You have already scored this presenter.",
    selfVote: "You cannot vote for yourself.",
    votingClosed: "Voting is currently closed.",
    tokenExpired: "Your session has expired. Please use your original link.",
    tokenInvalid: "Invalid session. Please contact the event administrator.",
    networkError: "Network error. Your vote has been saved and will sync when connected.",
    presenterNotFound: "Presenter not found. Please check the ID and try again.",
  },
  success: {
    voteSubmitted: "Score submitted successfully!",
    settingsSaved: "Settings saved.",
    presenterAdded: "Presenter added.",
    judgeInvited: "Invitation sent to {email}.",
    exportReady: "Export ready. Download starting...",
    syncComplete: "{count} offline votes synced successfully.",
  },
  labels: { ... },
  headings: { ... },
  buttons: { ... },
  status: {
    votingOpen: "Voting is open",
    votingPaused: "Voting is paused",
    votingClosed: "Voting is closed",
  }
};
```

---

## Open Source Requirements

### README.md Must Include:
- Project description + screenshot
- Feature list
- Quick start (5 steps)
- Full setup guide link
- Contributing guide link
- License badge
- Stars badge
- Demo link (if available)

### CONTRIBUTING.md Must Include:
- Code of conduct reference
- How to report bugs
- How to suggest features
- Development setup (no build step needed — just serve files)
- Code style guidelines (reference CLAUDE.md)
- Pull request process
- Issue labels explanation

### Versioning:
- Semantic versioning: MAJOR.MINOR.PATCH
- CHANGELOG.md updated with every release
- Git tags for releases
- GitHub Releases with release notes

---

## Build Order for Claude Code

**Phase 1: Foundation**
1. Create all file/folder structure (empty files)
2. Write variables.css (complete design system)
3. Write base.css + components.css
4. Write config.js (all configuration constants)
5. Write i18n.js (all strings)
6. Write ui.js (toast notifications, loading states, modal system)

**Phase 2: Backend**
7. Write Utils.gs (shared helpers)
8. Write RateLimit.gs
9. Write Auth.gs (token generation + validation)
10. Write Settings.gs
11. Write Presenters.gs
12. Write Judges.gs
13. Write Tracks.gs
14. Write Votes.gs (with ALL validation)
15. Write Results.gs (score calculation)
16. Write Reports.gs (statistical reports)
17. Write Email.gs
18. Write Checkin.gs
19. Write Templates.gs
20. Write Code.gs (router, ties everything together)

**Phase 3: Judge Portal (highest priority — used live at event)**
21. Write auth.js (token/session management)
22. Write api.js (all API calls)
23. Write scoring.js (score calculation + validation)
24. Write offline.js (offline queue)
25. Write judge/login.html (magic link landing)
26. Write judge/dashboard.html (judge's personal view)
27. Write judge/score.html (the scoring form — QR + manual)

**Phase 4: Admin Portal**
28. Write admin/login.html
29. Write admin/setup.html (competition wizard)
30. Write admin/presenters.html
31. Write admin/judges.html
32. Write admin/tracks.html
33. Write admin/qr-manager.html (with qr.js)
34. Write admin/checkin.html
35. Write admin/progress.html (judge completion)
36. Write admin/results.html (live leaderboard)
37. Write admin/templates.html
38. Write admin/reports.html (with charts.js + reports.js)
39. Write admin/index.html (main dashboard)

**Phase 5: Public Pages**
40. Write vote.html (audience voting)
41. Write leaderboard.html (public leaderboard)
42. Write index.html (landing page)

**Phase 6: Export**
43. Write export.js (CSV + Excel + PDF)
44. Write notifications.js

**Phase 7: Open Source**
45. Write README.md
46. Write CONTRIBUTING.md
47. Write CODE_OF_CONDUCT.md
48. Write CHANGELOG.md
49. Write docs/setup-guide.md
50. Write docs/deployment-guide.md
51. Write docs/admin-guide.md
52. Write docs/judge-guide.md
53. Write docs/api-reference.md
54. Write demo/ sample data files
55. Write .github/ templates

---

## What "Done" Looks Like

A completed implementation passes ALL of these:

- [ ] Judge can receive magic link email, click it, scan QR codes, submit scores on mobile
- [ ] Judge can submit scores offline and sync when reconnected
- [ ] Admin can set up complete event in under 10 minutes using the wizard
- [ ] Admin can monitor judge progress live during event
- [ ] Admin can open/pause/close voting with one click
- [ ] Admin can export results in CSV, Excel, PDF at any time
- [ ] Duplicate votes are rejected server-side
- [ ] Self-votes are rejected
- [ ] Expired tokens are rejected
- [ ] Competitor can receive their individual scorecard PDF
- [ ] Admin can generate judge quality statistical report
- [ ] All QR codes can be bulk-downloaded as ZIP or printed as PDF
- [ ] Public leaderboard works on large screen TV
- [ ] System works on iPhone Safari, Android Chrome, and desktop
- [ ] All text passes AA accessibility contrast
- [ ] High contrast mode works
- [ ] README is clear enough for a non-technical admin to set up the system
