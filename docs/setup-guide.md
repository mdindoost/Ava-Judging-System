# Ava Judging System — Setup Guide

Complete step-by-step guide to deploying the backend and running your first event.

---

## Overview

The system has two parts:
- **Frontend** — static HTML/CSS/JS files hosted on GitHub Pages (or any static host)
- **Backend** — Google Apps Script + Google Sheets (free, no server needed)

Setup takes about 15 minutes.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and sign in with your Google account
2. Click **Blank spreadsheet**
3. Name it (top-left): e.g. `Ava Judging System — PhD Symposium 2026`

### Create the required tabs

Right-click the default "Sheet1" tab at the bottom → **Rename** → type `Settings`

Then add 7 more tabs (click the **+** icon at the bottom for each):

| Tab name | Notes |
|---|---|
| `Settings` | Event configuration key/value pairs |
| `Presenters` | One row per presenter |
| `Judges` | One row per judge + their token |
| `Votes` | Every submitted score (append-only) |
| `Results` | Computed rankings (refreshed on demand) |
| `AuditLog` | System action log |
| `Tracks` | Track/category definitions |
| `Templates` | Saved event templates |

> **Important:** Tab names are case-sensitive and must match exactly.

---

## Step 2 — Open Apps Script

Inside your Google Sheet:

**Extensions → Apps Script**

A new browser tab opens with the Apps Script editor. You'll see one file: `Code.gs`.

---

## Step 3 — Add the backend files

Your project has a `backend/` folder with `.gs` files. You need to paste each one into the Apps Script editor.

### Add each file

For every file in `backend/` (except `Code.gs` which already exists):

1. In the left panel, click **+** next to "Files"
2. Choose **Script**
3. Type the filename **without** `.gs` (Apps Script adds it automatically)
4. Delete all placeholder content in the editor
5. Copy the entire contents of that `.gs` file from your project
6. Paste it into the editor
7. Press **Ctrl+S** (or Cmd+S) to save

### Files to add — in this order

```
Utils
RateLimit
Auth
Settings
Presenters
Judges
Tracks
Votes
Results
Reports
Email
Checkin
Templates
```

Then **replace** the content of the existing `Code.gs` with the contents of your project's `backend/Code.gs`.

---

## Step 4 — Set the Spreadsheet ID

1. In the Apps Script editor, click the **⚙ gear icon** (Project Settings) in the left panel
2. Scroll down to **Script Properties**
3. Click **Add script property**
4. Set:
   - **Property:** `SPREADSHEET_ID`
   - **Value:** your Google Sheet's ID

### Finding your Sheet ID

Look at the URL of your Google Sheet:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
```
The ID is the long string between `/d/` and `/edit`:
```
1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

5. Click **Save script properties**

---

## Step 5 — Deploy as a Web App

1. Click **Deploy** (top-right button) → **New deployment**
2. Click the **⚙ gear icon** next to "Select type" → choose **Web app**
3. Fill in the deployment settings:

| Field | Value |
|---|---|
| Description | `Ava Judging System v1.0` |
| Execute as | `Me` |
| Who has access | `Anyone` |

> **"Anyone" is required** — this is what allows your static frontend (on GitHub Pages) to call the script. The script itself validates every request with tokens.

4. Click **Deploy**
5. Google will show an authorization screen — click **Authorize access** and follow the prompts (you may see a "Google hasn't verified this app" warning — click **Advanced → Go to [project name] (unsafe)** — this is your own script)
6. After authorization, you'll see a **Web app URL**:

```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

**Copy this URL.** This is your Script URL.

---

## Step 6 — Run the Setup Wizard

1. Open your Ava Judging System frontend (e.g. `http://localhost:8080` or your GitHub Pages URL)
2. Go to `admin/setup.html`
3. **Step 1 — Event Basics:**
   - Enter your event name and date
   - Paste the Script URL into the **Google Apps Script URL** field
   - Click **Test Connection** — you should see a green "Connected!" message
   - Click **Next**
4. Complete the remaining wizard steps
5. Click **Create Event** on Step 5

The wizard will write all your settings to the Google Sheet and log you in as admin.

---

## Step 7 — Verify it works

After the wizard completes you'll be on the admin dashboard. Check:

- The sidebar shows your event name
- Go to **Presenters** and add a test presenter
- Go to **Judges** and add a judge with your own email
- Click **Send Invite** — you should receive a magic-link email
- Click the link in the email — you should reach `judge/login.html` and be logged in

---

## Troubleshooting

### "Test Connection" fails with red error

| Symptom | Fix |
|---|---|
| "Could not connect" | Check the URL — it must start with `https://script.google.com/macros/s/` and end with `/exec` |
| "Who has access" error | Re-deploy and set **Who has access** to **Anyone** (not "Only myself") |
| CORS error in browser console | Re-deploy — every time you change the script you must create a **new deployment** |

### Magic link emails not arriving

- Check your spam folder
- In Apps Script, go to **Services** (left panel) → make sure **Gmail API** is enabled
- The "Execute as: Me" setting means emails come from your Google account

### "Sheet not found" errors

- Double-check all 8 tab names are spelled exactly as listed in Step 1
- Tab names are case-sensitive: `AuditLog` not `Audit Log` or `auditlog`

### Re-deploying after code changes

If you edit any `.gs` file: **Deploy → Manage deployments → Edit (pencil icon) → Version: New version → Deploy**. The URL stays the same.

---

## GitHub Pages Deployment

To host the frontend publicly:

1. Push your repo to GitHub
2. Go to your repo → **Settings → Pages**
3. Source: **Deploy from a branch** → branch: `main` → folder: `/ (root)`
4. Click **Save**
5. Your site will be live at `https://yourusername.github.io/ava-judging-system/`

The Script URL you set during the wizard is stored in `localStorage` — each user/device needs to have it set. For a shared deployment, the simplest approach is to complete the setup wizard once from the device you'll use as the admin console. Judges access the system through their magic-link email, which contains the full URL, so they never need to configure anything.
