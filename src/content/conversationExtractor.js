import { SELECTORS, SELECTORS_VERSION } from './selectors.js';
import { htmlToBlocks } from './htmlToBlocks.js';

export function queryAll(doc, selectors) {
  const seen = new Set();
  for (const sel of selectors) {
    try {
      doc.querySelectorAll(sel).forEach((el) => seen.add(el));
    } catch {
      /* invalid selector: ignore */
    }
  }
  return [...seen];
}

// Keep only outermost matches (a selector can match a wrapper and its child).
const outermost = (els) => els.filter((a) => !els.some((b) => b !== a && b.contains(a)));

export function getConversationId(loc = location) {
  const m = loc.pathname.match(/^\/chat\/([\w-]+)/);
  return m ? m[1] : null;
}

export function getConversationTitle(doc = document) {
  for (const sel of SELECTORS.conversationTitle) {
    const t = doc.querySelector(sel)?.textContent?.trim();
    if (t) return t;
  }
  const fromTab = (doc.title || '').replace(/\s*[-–|]\s*Claude\s*$/i, '').trim();
  return fromTab && fromTab.toLowerCase() !== 'claude' ? fromTab : 'Untitled conversation';
}

export function isStreaming(doc = document) {
  return queryAll(doc, SELECTORS.streaming).length > 0;
}

/** Cheap counts for the live status indicator (no text extraction). */
export function countMessages(doc = document) {
  return {
    userCount: outermost(queryAll(doc, SELECTORS.userMessage)).length,
    assistantCount: outermost(queryAll(doc, SELECTORS.assistantMessage)).length,
  };
}

function userBlocks(el) {
  if (el.querySelector('pre')) return htmlToBlocks(el);
  const text = (el.innerText || el.textContent || '').trim();
  return text ? [{ type: 'text', content: text }] : [];
}

export function extractConversation(doc = document, loc = location) {
  const warnings = [];
  const userEls = outermost(queryAll(doc, SELECTORS.userMessage));
  const asstEls = outermost(queryAll(doc, SELECTORS.assistantMessage));

  const items = [
    ...userEls.map((el) => ({ el, role: 'user' })),
    ...asstEls.map((el) => ({ el, role: 'assistant' })),
  ].sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const conversationId = getConversationId(loc);
  const messages = [];
  let skipped = 0;
  items.forEach(({ el, role }) => {
    const blocks = role === 'user' ? userBlocks(el) : htmlToBlocks(el);
    if (!blocks.length) {
      skipped += 1;
      return;
    }
    messages.push({ id: `${conversationId || 'conv'}-m${messages.length + 1}`, role, blocks });
  });

  const streaming = isStreaming(doc);
  if (!items.length) {
    warnings.push("No messages were recognised. Claude.ai's layout may have changed. You can paste the conversation manually instead.");
  } else if (!asstEls.length) {
    warnings.push("Your messages were found but Claude's replies were not recognised.");
  } else if (!userEls.length) {
    warnings.push("Claude's replies were found but your messages were not recognised.");
  } else if (Math.abs(userEls.length - asstEls.length) > 1) {
    warnings.push('The number of your messages and Claude\'s replies differs a lot. Some messages may be missing.');
  }
  if (skipped) warnings.push(`${skipped} empty message${skipped > 1 ? 's were' : ' was'} skipped.`);
  if (streaming) warnings.push('Claude is still replying, so the last message may be incomplete.');

  return {
    conversationId,
    title: getConversationTitle(doc),
    url: loc.origin + loc.pathname,
    messages,
    diagnostics: {
      selectorsVersion: SELECTORS_VERSION,
      userCount: userEls.length,
      assistantCount: asstEls.length,
      codeBlockCount: messages.reduce((n, m) => n + m.blocks.filter((b) => b.type === 'code').length, 0),
      streaming,
      warnings,
    },
  };
}
