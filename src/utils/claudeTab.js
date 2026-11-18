// Talks to the content script running in a claude.ai tab.
// Uses only chrome.tabs + runtime messaging between this extension's own pieces.

export class BridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const ERROR_TEXT = {
  NO_CHROME: 'Reading a tab only works when the extension is loaded in Chrome. You can still paste a conversation manually.',
  NO_TAB: 'No claude.ai tab is open. Open your conversation in claude.ai, then try again.',
  NOT_CONNECTED: 'This tab was opened before the extension loaded. Reload the claude.ai tab, then try again.',
  UNSUPPORTED_PAGE: 'Open a conversation or a project page in claude.ai, then try again.',
  EXTRACT_FAILED: 'Something went wrong while reading the page.',
};

const hasTabs = () => typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query;

export async function findClaudeTab() {
  if (!hasTabs()) throw new BridgeError('NO_CHROME', ERROR_TEXT.NO_CHROME);
  // Prefer the tab the user is looking at, then the most recently used claude.ai tab.
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (current?.url?.startsWith('https://claude.ai/')) return current;
  const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });
  if (!tabs.length) throw new BridgeError('NO_TAB', ERROR_TEXT.NO_TAB);
  return [...tabs].sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
}

async function send(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    throw new BridgeError('NOT_CONNECTED', ERROR_TEXT.NOT_CONNECTED);
  }
}

/** Lightweight status: which kind of page is open and how many messages are visible. */
export async function pingClaudeTab() {
  try {
    const tab = await findClaudeTab();
    try {
      const res = await send(tab.id, { type: 'cpb:ping' });
      return { status: 'tab-open', ...res };
    } catch {
      return { status: 'tab-open', page: null }; // open, but content script not attached yet
    }
  } catch (err) {
    return { status: err.code === 'NO_CHROME' ? 'preview' : 'no-tab', page: null };
  }
}

/** Reads the conversation/project from the claude.ai tab. Throws BridgeError on failure. */
export async function requestCapture() {
  const tab = await findClaudeTab();
  const res = await send(tab.id, { type: 'cpb:extract' });
  if (!res || !res.ok) {
    const code = res?.code || 'EXTRACT_FAILED';
    throw new BridgeError(code, ERROR_TEXT[code] || res?.message || ERROR_TEXT.EXTRACT_FAILED);
  }
  return res.capture;
}
