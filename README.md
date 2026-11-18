# Claude Project Bridge

A Chrome extension (Manifest V3) that backs up a Claude.ai project and helps you resume it from another account.
Everything is stored locally. Nothing is sent to any server.

> **Status: Phases 1–3 of 8.** Interface, claude.ai detection, and conversation/project capture are in.
> Context generation, file tracking, IndexedDB storage, ZIP export/import and the real resume prompt arrive in Phases 4–7.
> Everything marked **Sample** in the UI is placeholder data. Captured projects are saved with interim
> storage (`chrome.storage.local`) until Phase 5.

## Capturing a conversation

1. Open a conversation (or project page) on claude.ai and let Claude finish replying.
2. Click the extension, then **Capture** on the dashboard (or Projects → **New**).
3. **Read this tab**, check the preview and any warnings, choose a project, **Save capture**.
4. If the page can't be read, use **Paste it instead**.

If capture finds no messages, claude.ai's markup has probably changed. Update the selectors in
`src/content/selectors.js` (they are unverified best guesses) and rebuild.

## Tests

```bash
npm test
```

Covers the HTML→markdown conversion, merge logic and manual-paste parser. Selectors against the live site
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
src/popup/                   React UI (components/ui, components/layout, pages, hooks, context, data)
src/background/              service worker
src/content/                 claude.ai content script (page-type ping only, for now)
src/core/                    progressAnalyzer, captureMerge, manualParser (more in later phases)
src/storage/                 settings + interim project storage (database.js arrives in Phase 5)
src/utils/                   cn, time, clipboard, claudeTab (popup ↔ content script)
tests/                       node:test unit tests
src/styles/index.css         design tokens (dark + light) and component classes
```

## Permissions

| Permission | Why |
|---|---|
| `storage`, `unlimitedStorage` | Keep settings and backups on this device |
| `https://claude.ai/*` host access | Detect an open claude.ai tab and (Phase 3) read the page you choose to capture |

No cookies, tokens, passwords or network requests to third parties.
