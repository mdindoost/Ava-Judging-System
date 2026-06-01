# AVA JUDGING SYSTEM — COMPLETE STEP-BY-STEP GUIDE
# Everything you need to do, in exact order.
# Zero ambiguity. Zero guessing.

---

## OVERVIEW OF WHAT YOU'RE BUILDING

Frontend: GitHub Pages (free static hosting)
Backend: Google Apps Script + Google Sheets (free)
Total cost: $0
Time to complete all steps: ~3-4 hours first time

---

## PART 1: PREPARE YOUR LOCAL ENVIRONMENT

### Step 1.1 — Install Claude Code
Open terminal and run:
```bash
npm install -g @anthropic/claude-code
```
Verify installation:
```bash
claude --version
```

### Step 1.2 — Clone your existing repo
```bash
git clone https://github.com/mdindoost/Ava-Judging-System.git
cd Ava-Judging-System
```

### Step 1.3 — Clean the repo for fresh start
If there is existing code that doesn't follow the new architecture:
```bash
# Back up anything you want to keep
git checkout -b backup-original

# Return to main
git checkout main

# Remove old files (keep .git, README if it exists)
# Claude Code will create everything fresh
```

### Step 1.4 — Copy the project files into your repo
Copy these two files from the Claude output into your repo root:
- CLAUDE.md  (the project constitution)
- CLAUDE_CODE_PROMPT.md  (the build instructions)

---

## PART 2: GOOGLE SHEETS SETUP

Do this BEFORE running Claude Code — the backend needs a real sheet.

### Step 2.1 — Create the Google Sheet

1. Go to https://sheets.google.com
2. Click "Blank spreadsheet"
3. Name it exactly: **Ava Judging System — [Your Event Name]**
   Example: "Ava Judging System — NJIT PhD Symposium 2026"
4. Create these tabs IN THIS EXACT ORDER (right-click tab → Insert sheet):
   - Settings
   - Presenters
   - Judges
   - Tracks
   - Votes
   - Results
   - AuditLog
   - Templates

5. In the **Settings** tab, add these headers in Row 1:
   - Column A: Key
   - Column B: Value

6. In the **Presenters** tab, add these headers in Row 1:
   - ID | Name | Department | Email | PosterNumber | Track | CheckedIn | CheckInTime | Active | CreatedAt

7. In the **Judges** tab, add these headers in Row 1:
   - ID | Name | Email | Token | TokenExpiry | TokenUsed | TokenUsedAt | AssignedTrack | AssignedPresenters | Active | CreatedAt | LastActivity

8. In the **Tracks** tab, add these headers in Row 1:
   - TrackID | Name | Description | Color | Active

9. In the **Votes** tab, add these headers in Row 1:
   - VoteID | Timestamp | PresenterID | PresenterName | VoterType | VoterID | VoterName | RubricCategoryID | Score | Comment | SessionToken | EventDay | IPHash

10. In the **Results** tab, add these headers in Row 1:
    - PresenterID | Name | Department | Track | JudgeAvg | AudienceAvg | FinalScore | JudgeVoteCount | AudienceVoteCount | RubricBreakdown | OverallRank | TrackRank | CheckedIn | Active

11. In the **AuditLog** tab, add these headers in Row 1:
    - LogID | Timestamp | Actor | ActorType | Action | EntityType | EntityID | Details | SessionToken | IPHash

12. In the **Templates** tab, add these headers in Row 1:
    - TemplateID | Name | Description | Config | CreatedAt | CreatedBy

13. **Copy the Sheet ID** from the URL:
    URL looks like: https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit
    Save this — you'll need it in Step 3.

### Step 2.2 — Note your Google account email
The Apps Script will run under this account.
Make sure Gmail is enabled (it's needed to send magic link emails).

---

## PART 3: GOOGLE APPS SCRIPT SETUP

### Step 3.1 — Open Apps Script editor
From your Google Sheet:
Extensions → Apps Script

### Step 3.2 — Name the project
Click "Untitled project" at the top
Name it: **Ava Judging System Backend**

### Step 3.3 — Prepare for Claude Code files
You will paste Claude Code's generated .gs files here.
For now, just leave it open — you'll come back after running Claude Code.

### Step 3.4 — Set the Sheet ID in Script Properties
In Apps Script:
1. Click gear icon (Project Settings) in left sidebar
2. Scroll to "Script Properties"
3. Click "Add script property"
4. Property name: SPREADSHEET_ID
5. Value: [paste your Sheet ID from Step 2.1 step 13]
6. Click Save

---

## PART 4: RUN CLAUDE CODE — BUILD THE PROJECT

This is the main build step. Follow exactly.

### Step 4.1 — Start Claude Code in your repo
```bash
cd Ava-Judging-System
claude
```

### Step 4.2 — Load the required skills
When Claude Code starts, type these commands ONE AT A TIME:
Wait for each to complete before typing the next.

```
/read /mnt/skills/public/frontend-design/SKILL.md
```
Wait for confirmation.

```
/read /mnt/skills/public/pdf/SKILL.md
```
Wait for confirmation.

```
/read /mnt/skills/public/xlsx/SKILL.md
```
Wait for confirmation.

### Step 4.3 — Give Claude Code the master instruction
Copy the ENTIRE contents of CLAUDE_CODE_PROMPT.md
Paste it into Claude Code as your first message.

Add this at the very beginning before pasting:

```
IMPORTANT: Read CLAUDE.md first. Then read this entire prompt before 
writing any code. Do not simplify. Do not use placeholders. 
Do not skip any feature. Implement everything completely.
When in doubt, implement more, not less.
Start with Phase 1 exactly as described.
```

### Step 4.4 — Monitor Claude Code's progress
Claude Code will work through the phases.
If it tries to skip something or simplify, type:

```
Do not simplify this. Implement [feature name] completely as specified 
in the prompt. No placeholders, no TODOs.
```

### Step 4.5 — Phase checkpoints
After each phase completes, verify by asking Claude Code:

After Phase 1:
```
Show me variables.css — confirm it has all CSS variables including 
dark mode, high contrast, and large text variants.
Show me i18n.js — confirm it has ALL strings including all error 
messages, success messages, and labels.
```

After Phase 2 (Backend):
```
Show me Votes.gs — confirm it has ALL validation steps in the exact 
order specified: honeypot, rate limit, voting status, presenter check, 
score validation, token validation, duplicate check.
Show me Code.gs — confirm it has ALL routes listed in the prompt.
```

After Phase 3 (Judge Portal):
```
Show me judge/score.html — confirm it handles both QR scan and 
manual ID entry, both single score and multi-rubric modes, 
and offline vote storage.
```

After Phase 4 (Admin Portal):
```
Show me admin/reports.html — confirm it has all three tabs: 
Judge Quality, Competitor Scorecards, Event Summary.
Show me admin/setup.html — confirm the 5-step wizard is complete.
```

### Step 4.6 — If Claude Code runs out of context
If the conversation gets too long, start a new Claude Code session:
```bash
claude
```
Then say:
```
Continue building the Ava Judging System. 
Read CLAUDE.md and CLAUDE_CODE_PROMPT.md first.
The following phases are already complete: [list phases done]
Continue with Phase [N].
Do not simplify. Do not regenerate already-completed files 
unless fixing a bug.
```

---

## PART 5: PASTE BACKEND CODE INTO APPS SCRIPT

After Claude Code generates all .gs files:

### Step 5.1 — In Apps Script editor
For each .gs file generated by Claude Code:
1. Click "+" next to "Files" in left sidebar
2. Select "Script"
3. Name it exactly as the filename (e.g., Auth for Auth.gs)
4. Delete the default function myFunction() {}
5. Paste the complete contents of that file

Files to add (in this order):
1. Utils (from Utils.gs)
2. RateLimit (from RateLimit.gs)
3. Auth (from Auth.gs)
4. Settings (from Settings.gs)
5. Presenters (from Presenters.gs)
6. Judges (from Judges.gs)
7. Tracks (from Tracks.gs)
8. Votes (from Votes.gs)
9. Results (from Results.gs)
10. Reports (from Reports.gs)
11. Email (from Email.gs)
12. Checkin (from Checkin.gs)
13. Templates (from Templates.gs)
14. Code (from Code.gs) ← this is the default Code.gs, replace it

### Step 5.2 — Test the backend
In Apps Script, click Run → Run function → select "doPost"
Check the execution log for errors.

Common errors and fixes:
- "SpreadsheetApp is not defined" → You're not running in Apps Script context, ignore
- "Cannot find property of undefined" → Check SPREADSHEET_ID in Script Properties
- "Permission denied" → You need to authorize the script (Step 5.3)

### Step 5.3 — Authorize the script
1. Click Run on any function
2. "Authorization required" dialog appears
3. Click "Review permissions"
4. Choose your Google account
5. Click "Advanced" → "Go to Ava Judging System Backend (unsafe)"
6. Click "Allow"
7. The script now has permission to access Sheets and Gmail

### Step 5.4 — Deploy as Web App
1. Click "Deploy" → "New deployment"
2. Click gear icon next to "Type" → Select "Web app"
3. Settings:
   - Description: Ava Judging System v1.0
   - Execute as: **Me** (your Google account)
   - Who has access: **Anyone** (required for GitHub Pages to call it)
4. Click "Deploy"
5. Click "Authorize access" if prompted
6. **COPY THE WEB APP URL** — looks like:
   https://script.google.com/macros/s/LONG_ID_HERE/exec
   Save this — you need it for config.js

### Step 5.5 — Test the deployed endpoint
Open a new browser tab and go to:
```
YOUR_SCRIPT_URL?action=getSettings
```
You should see a JSON response (even if empty settings).
If you see an HTML error page, check the Apps Script logs.

---

## PART 6: CONFIGURE THE FRONTEND

### Step 6.1 — Set the Script URL in config.js
Open assets/js/config.js in your repo.
Find the SCRIPT_URL line.
Either:
a) Hardcode it directly: SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_ID/exec'
b) Or leave the localStorage approach — admin will enter it on first setup

Option (a) is simpler for your use case. Use it.

### Step 6.2 — Set the admin password hash
In config.js, set the super-admin password hash.
Generate SHA-256 of your chosen password:
```javascript
// Run this in browser console to get your hash:
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
sha256('your-password-here').then(console.log);
```
Copy the output hash into config.js.

### Step 6.3 — Set the GitHub Pages base URL
In config.js:
```javascript
BASE_URL: 'https://mdindoost.github.io/Ava-Judging-System',
```

---

## PART 7: DEPLOY TO GITHUB PAGES

### Step 7.1 — Commit all files
```bash
cd Ava-Judging-System
git add .
git commit -m "feat: initial complete implementation v1.0.0"
git push origin main
```

### Step 7.2 — Enable GitHub Pages
1. Go to https://github.com/mdindoost/Ava-Judging-System
2. Click "Settings" tab
3. Click "Pages" in left sidebar
4. Under "Source": select "Deploy from a branch"
5. Branch: main, folder: / (root)
6. Click Save
7. Wait 2-3 minutes
8. Your site is live at: https://mdindoost.github.io/Ava-Judging-System

### Step 7.3 — Verify deployment
Open these URLs and verify they load:
- https://mdindoost.github.io/Ava-Judging-System/index.html
- https://mdindoost.github.io/Ava-Judging-System/admin/login.html
- https://mdindoost.github.io/Ava-Judging-System/judge/login.html

---

## PART 8: FIRST EVENT SETUP

### Step 8.1 — Create your first event
1. Go to: https://mdindoost.github.io/Ava-Judging-System/admin/login.html
2. Enter your admin password
3. You'll be redirected to admin/index.html
4. Click "Setup New Event" or go to admin/setup.html
5. Complete the 5-step wizard:
   - Event name, date
   - Scoring mode (judges only for most PhD events)
   - Rubric categories (e.g., Clarity 0-5, Innovation 0-5, Methodology 0-5, Impact 0-5, Presentation 0-5)
   - Enable tracks if needed
   - Set admin email + notifications
6. Click "Create Event"

### Step 8.2 — Add presenters
Option A — CSV import (fastest):
1. Download the CSV template from admin/presenters.html
2. Fill in your presenter data
3. Import

Option B — Manual:
1. Click "Add Presenter" for each presenter

### Step 8.3 — Add judges
1. Go to admin/judges.html
2. Add each judge (name + email required)
3. Optionally assign tracks

### Step 8.4 — Send judge invitations
1. In admin/judges.html
2. Select all judges → "Send All Invites"
3. Each judge receives a magic link email
4. Magic link expires in 24 hours — send no more than 24h before event

### Step 8.5 — Generate QR codes
1. Go to admin/qr-manager.html
2. Click "Generate All QR Codes"
3. Preview them
4. Click "Download PDF" for printing
5. Print the PDF — one card per presenter to place at their poster

### Step 8.6 — Test the complete flow
Before the event:
1. Click one QR code URL manually
2. Verify the scoring page loads with correct presenter
3. Submit a test score
4. Go to admin/results.html and verify the vote appears
5. Check admin/progress.html shows the judge's progress

---

## PART 9: RUNNING THE LIVE EVENT

### On event day:

**1. Morning prep (30 min before):**
- Go to admin/index.html
- Verify all judges have logged in (check admin/progress.html)
- Send reminder to any judges who haven't logged in yet
- Print the QR posters

**2. Open voting:**
- Go to admin/index.html
- Click "Open Voting" (big green button)
- Confirm

**3. During the event:**
- Monitor admin/index.html on your laptop
- admin/progress.html shows judge completion in real time
- If a judge is inactive > 30 min: click "Send Reminder" next to their name
- If issues: Pause Voting temporarily to investigate

**4. Close voting:**
- When all presenters have been judged (or time is up)
- Click "Close Voting"
- Click "Refresh Results" to compute final rankings

**5. Export results:**
- admin/results.html → Export CSV
- admin/results.html → Export Excel
- admin/reports.html → Generate winner report PDF (for ceremony)

**6. Send scorecards to presenters:**
- admin/reports.html → Competitor Scorecards tab
- "Email All Presenters" button
- Each presenter receives their individual scorecard PDF

---

## PART 10: ONGOING MAINTENANCE

### After each event:
```bash
# Tag the event in git for record-keeping
git tag v1.0.0-njit-2026
git push --tags
```

### To create next year's event:
1. Go to admin/templates.html
2. Save current event as template
3. Next year: load template → updates all settings
4. Add new presenters and judges

### To update the system:
When you make improvements:
```bash
git add .
git commit -m "feat: [description]"
git push origin main
# GitHub Pages auto-deploys within 2-3 minutes
```

---

## TROUBLESHOOTING

### "No response from server"
- Check SCRIPT_URL in config.js is correct
- Check Apps Script deployment is "Anyone" access
- Open Script URL directly in browser — should return JSON

### "Token invalid" for judges
- Check token hasn't expired (24h limit)
- Go to admin/judges.html → Resend invitation → generates new token

### "Voting is closed" when it should be open
- Go to admin/index.html → Click "Open Voting"

### Scores not appearing in results
- Go to admin/results.html → Click "Refresh Results"
- Results are computed on-demand, not automatically

### Apps Script quota exceeded
- Google Apps Script has free quotas:
  - 6 min execution time per run
  - 20,000 URL fetch calls per day
  - 100 emails per day
- For 200 presenters × 20 judges = 4,000 votes maximum — well within quota
- If you hit email limit: use a different Google account for large events

### GitHub Pages not updating
- Wait 3-5 minutes after push
- Hard refresh browser: Ctrl+Shift+R
- Check Settings → Pages → verify branch is "main"

---

## QUICK REFERENCE URLS

After deployment, your key URLs are:

| Page | URL |
|------|-----|
| Landing | https://mdindoost.github.io/Ava-Judging-System/ |
| Admin Login | https://mdindoost.github.io/Ava-Judging-System/admin/login.html |
| Admin Dashboard | https://mdindoost.github.io/Ava-Judging-System/admin/ |
| Judge Login | https://mdindoost.github.io/Ava-Judging-System/judge/login.html |
| Judge Dashboard | https://mdindoost.github.io/Ava-Judging-System/judge/dashboard.html |
| Audience Vote | https://mdindoost.github.io/Ava-Judging-System/vote.html?presenter=ID |
| Public Leaderboard | https://mdindoost.github.io/Ava-Judging-System/leaderboard.html |

---

## SKILLS TO LOAD IN CLAUDE CODE

Always load these before starting or continuing a build session:

```
/read /mnt/skills/public/frontend-design/SKILL.md
/read /mnt/skills/public/pdf/SKILL.md
/read /mnt/skills/public/xlsx/SKILL.md
```

---

## IF SOMETHING IS WRONG WITH GENERATED CODE

If Claude Code generates incomplete or simplified code, use these prompts:

For incomplete functions:
```
The function [functionName] in [filename] is incomplete / uses a placeholder.
Implement it fully as specified in CLAUDE_CODE_PROMPT.md.
Do not skip any validation step. Do not use TODO comments.
```

For missing features:
```
[filename] is missing [feature]. 
According to CLAUDE_CODE_PROMPT.md Phase [N], this must include [exact requirement].
Implement it completely now.
```

For wrong architecture:
```
This implementation does not follow CLAUDE.md standards.
Specifically: [what's wrong].
Rewrite [filename] to comply with the architecture in CLAUDE.md.
```

---

## ESTIMATED TIME PER PHASE

| Phase | Description | Estimated Claude Code Time |
|-------|-------------|---------------------------|
| 1 | Foundation (CSS + JS base) | 20-30 min |
| 2 | Backend (14 .gs files) | 45-60 min |
| 3 | Judge Portal (3 HTML pages) | 20-30 min |
| 4 | Admin Portal (12 HTML pages) | 45-60 min |
| 5 | Public Pages (3 HTML pages) | 15-20 min |
| 6 | Export Module | 20-30 min |
| 7 | QR Module | 10-15 min |
| 8 | Notifications | 10-15 min |
| 9 | Open Source files | 15-20 min |
| **Total** | | **~3.5-4.5 hours** |

Claude Code sessions have context limits.
Plan for 3-4 separate sessions.
Each session: read CLAUDE.md + CLAUDE_CODE_PROMPT.md first, then continue where left off.
