// Everything that depends on claude.ai's markup lives in this file.
//
// IMPORTANT: these selectors are best-effort, based on how claude.ai was structured
// when this was written, and have NOT been verified against the live site. Claude.ai
// changes its markup without notice. When extraction stops finding messages, update
// the lists below (each entry is tried, results are merged). The popup shows
// diagnostics so you can see what was and wasn't recognised.

export const SELECTORS_VERSION = '2026-11-15';

export const SELECTORS = {
  userMessage: ['[data-testid="user-message"]'],
  assistantMessage: ['.font-claude-response', '.font-claude-message', '[data-testid="assistant-message"]'],
  streaming: ['[data-is-streaming="true"]'],
  conversationTitle: ['[data-testid="chat-title-button"]', '[data-testid="chat-title"]'],
  projectName: ['[data-testid="project-name"]', 'main h1'],
  projectDescription: ['[data-testid="project-description"]'],
  // Breadcrumb link from a conversation back to its project (header only, never the sidebar).
  projectBreadcrumb: 'header a[href^="/project/"], header a[href^="/projects/"]',
};

// Text shown by claude.ai when a field is empty. Never treated as real content.
export const PLACEHOLDER_PATTERN = /^(add|set) (project )?(instructions|description)|tailor claude/i;
