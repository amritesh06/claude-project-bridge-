import { countMessages, getConversationId, isStreaming } from './conversationExtractor.js';
import { getProjectIdFromPath } from './projectExtractor.js';
import { SELECTORS } from './selectors.js';

export function detectPage(loc = location) {
  if (/^\/chat\/[\w-]+/.test(loc.pathname)) return 'conversation';
  if (/^\/projects?\/[\w-]+/.test(loc.pathname)) return 'project';
  return 'other';
}

/** Cheap, text-free summary of the current page for the popup's status indicator. */
export function snapshot() {
  const page = detectPage();
  const { userCount, assistantCount } = countMessages();
  let projectId = page === 'project' ? getProjectIdFromPath() : null;
  if (page === 'conversation') {
    const hrefs = [...document.querySelectorAll(SELECTORS.projectBreadcrumb)]
      .filter((a) => !a.closest('nav'))
      .map((a) => a.getAttribute('href'));
    const unique = [...new Set(hrefs)];
    if (unique.length === 1) projectId = unique[0].split('/').filter(Boolean)[1] || null;
  }
  return {
    page,
    conversationId: page === 'conversation' ? getConversationId() : null,
    projectId,
    messageCount: userCount + assistantCount,
    streaming: isStreaming(),
  };
}

/**
 * Keeps a fresh snapshot as the single-page app navigates and messages stream in.
 * Debounced, skips work while the tab is hidden, and never reads message text.
 */
export function startObserver() {
  let latest = snapshot();
  let timer = null;
  let lastHref = location.href;

  const refresh = () => {
    timer = null;
    if (document.hidden) return;
    latest = snapshot();
  };
  const schedule = () => {
    if (timer === null) timer = setTimeout(refresh, 600);
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  // SPA navigation without page loads: compare the URL on a slow interval.
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      refresh();
    }
  }, 1000);

  return { getSnapshot: () => (document.hidden ? latest : snapshot()) };
}
