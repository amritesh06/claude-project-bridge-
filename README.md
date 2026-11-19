# Claude Project Bridge

A Chrome extension (Manifest V3) that backs up a Claude.ai project and helps you resume it from another account.
Everything is stored locally. Nothing is sent to any server.

> **Status:** capture, analysis, ZIP export, ZIP import and the resume prompt are working.
> Still to do: IndexedDB storage (projects currently use `chrome.storage.local`), automatic scheduled backups, and backup history UI.
> Items marked **Sample** in the UI are placeholder data.

## The two things this does

**1. Export (old account).** Open the extension → pick the project → **Export ZIP**.
You get `Claude-Project-Backup_<project>_<date>.zip` with the Markdown documents, `files/`, and `backup.json`.

**2. Import (new account).** Install the extension in the browser where you use the new account → **Choose ZIP**
(or drag it onto the card). Review the preview, then:
- **Copy prompt** and paste it into a new Claude chat,
- attach the **Context file** (one combined .md) or the .md documents from the ZIP,
- **Save to this device** to keep the project in the extension.

> If the popup closes when you pick a file (it does on some systems), click **Open in a tab** on the Home screen,
> or drag the ZIP onto the Import card.

## ZIP contents

```
Claude-Project-Backup/
├── PROJECT_OVERVIEW.md  PROJECT_CONTEXT.md  CONVERSATION_HISTORY.md  TECHNICAL_ARCHITECTURE.md
├── FILE_TRACKER.md      CURRENT_PROGRESS.md NEXT_STEPS.md            RESUME_PROJECT_PROMPT.md
├── README.md
├── backup.json          what the extension reads on import (do not edit)
└── files/               files you uploaded; _from-conversation/ holds code Claude showed (may be partial)
```

## Import safety

A ZIP is untrusted input. The importer reads only `backup.json`, rebuilds the project field by field (unknown fields
dropped, types and sizes enforced, links outside claude.ai removed), never executes anything, and **regenerates the resume
prompt from the data instead of reusing the prompt text stored in the ZIP**. Limits: 100 MB ZIP, 10,000 entries.

## Capturing a conversation

1. Open a conversation (or project page) on claude.ai and let Claude finish replying.
2. Click the extension, then **Capture** on the dashboard (or Projects → **New**).
3. **Read this tab**, check the preview and any warnings, choose a project, **Save capture**.
4. If the page can't be read, use **Paste it instead**.

If capture finds no messages, claude.ai's markup has probably changed. Update the selectors in
`src/content/selectors.js` (they are unverified best guesses) and rebuild.

## How the analysis works (Phase 4)

After each capture, fixed rules (no AI, no network) derive a file list, suggested tasks and the 12 context sections.
Everything is labelled with how strong its evidence is:

- **Files:** a file only discussed is *Referenced, unavailable*. Code provided under a filename gives *Created* or
  *Modified*, but stays **Unconfirmed** until you confirm it, upload it, or an attachment is captured.
  Paths under "Next steps" or with future wording are *Pending*.
- **Tasks:** suggested only from structure: lists under headings like "Next steps" or "Completed", ✅ / ☐ markers,
  `TODO:` lines, and error reports in your own messages. Change any status, add or delete tasks.
- **Context:** sections that can't be derived stay empty so you can write them. Edited sections and edited tasks/files
  are never overwritten by **Re-analyze**.
- Conversations are processed oldest first by capture time.

## Tests

```bash
npm test
```

Covers HTML→markdown conversion, capture merging, the manual-paste parser, and the analysis engine (file status rules, task extraction, stack detection, preservation of user edits), ZIP export/import (real JSZip round trip), and hostile-input handling. Selectors against the live site
need manual testing.

## Install

Requires Node 18+.

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select the `dist/` folder
4. Pin the extension from the puzzle-piece menu

After code changes, run `npm run build` again and click the reload icon on the extension card.
If a claude.ai tab was open before you loaded the extension, reload that tab.

## Preview the UI in a browser tab

```bash
npm run dev
```

Open http://localhost:5173/popup.html. Chrome APIs are unavailable there, so settings fall back to
`localStorage` and the status pill reads "Browser preview".

## Structure

```
public/manifest.json         MV3 manifest, icons
popup.html                   popup entry (400×580)
src/popup/                   React UI (components, pages, hooks, context, data)
src/background/              service worker
src/content/                 claude.ai content script (page-type ping only, for now)
src/core/                    fileTracker, progressAnalyzer, contextBuilder, projectAnalyzer, projectView,
                             captureMerge, manualParser, backupManager, migrationManager, resumePrompt
src/storage/                 settings + interim project storage (database.js arrives in Phase 5)
src/utils/                   markdownGenerator, zipExporter (JSZip), exporter, importer, download, claudeTab, ...
tests/                       node:test unit tests
src/styles/index.css         design tokens (dark + light) and component classes
```

## Permissions

| Permission | Why |
|---|---|
| `storage`, `unlimitedStorage` | Keep settings and backups on this device |
| `https://claude.ai/*` host access | Detect an open claude.ai tab and (Phase 3) read the page you choose to capture |

No cookies, tokens, passwords or network requests to third parties.
