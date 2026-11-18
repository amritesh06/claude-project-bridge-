// Content script for claude.ai.
//
// Privacy: runs only on claude.ai, answers requests from this extension's own popup,
// and reads message text ONLY when the user presses "Read this tab". It does not touch
// cookies, storage, tokens, or network requests, and sends nothing anywhere.

import { detectPage, startObserver } from './claudeObserver.js';
import { extractConversation } from './conversationExtractor.js';
import { extractProject } from './projectExtractor.js';

const observer = startObserver();

function buildCapture() {
  const page = detectPage();
  if (page === 'other') return { ok: false, code: 'UNSUPPORTED_PAGE' };
  return {
    ok: true,
    capture: {
      source: 'dom',
      capturedAt: Date.now(),
      page,
      project: extractProject(document, location, page),
      conversation: page === 'conversation' ? extractConversation(document, location) : null,
    },
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;
  try {
    if (message.type === 'cpb:ping') {
      sendResponse({ ok: true, ...observer.getSnapshot() });
    } else if (message.type === 'cpb:extract') {
      sendResponse(buildCapture());
    }
  } catch (err) {
    sendResponse({ ok: false, code: 'EXTRACT_FAILED', message: String(err?.message || err) });
  }
  return false; // all responses are synchronous
});
