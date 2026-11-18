// Pure function: merges a capture (from claude.ai or a manual paste) into the list of
// saved projects. No DOM, no storage, so it is easy to test.

const newId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * @param {object[]} projects  existing REAL projects (never samples)
 * @param {object}   capture   { project?, conversation? }
 * @param {object}   target    { mode: 'new', name } | { mode: 'existing', id }
 * @returns {{ projects: object[], projectId: string, replacedConversation: boolean }}
 */
export function mergeCapture(projects, capture, target) {
  const now = Date.now();
  const detected = capture.project || {};
  let project = null;

  if (target.mode === 'existing') {
    project = projects.find((p) => p.id === target.id) || null;
    if (!project) throw new Error('The selected project no longer exists.');
  } else {
    const name = (target.name || '').trim();
    if (!name) throw new Error('Enter a project name.');
    project =
      (detected.projectId && projects.find((p) => p.claudeProjectId === detected.projectId)) ||
      projects.find((p) => p.name.toLowerCase() === name.toLowerCase()) ||
      null;
    if (!project) {
      project = {
        id: newId('proj'),
        isSample: false,
        name,
        description: '',
        instructions: '',
        stack: [],
        claudeProjectId: null,
        createdAt: now,
        updatedAt: now,
        lastBackupAt: null,
        backupStatus: 'none',
        lastWorkingPoint: '',
        tasks: [],
        files: [],
        conversations: [],
        context: [],
      };
    }
  }

  let replacedConversation = false;
  const next = { ...project, updatedAt: now };

  // Fill details only when empty: never overwrite what the user typed or captured earlier.
  if (!next.description && detected.description) next.description = detected.description;
  if (!next.instructions && detected.instructions) next.instructions = detected.instructions;
  if (!next.claudeProjectId && detected.projectId) next.claudeProjectId = detected.projectId;

  const conv = capture.conversation;
  if (conv && conv.messages && conv.messages.length) {
    const id = conv.conversationId || newId('manual');
    const record = {
      id,
      title: conv.title || 'Untitled conversation',
      url: conv.url || null,
      source: capture.source === 'dom' ? 'claude.ai' : 'manual',
      capturedAt: capture.capturedAt || now,
      updatedAt: now,
      messages: conv.messages,
    };
    const existing = next.conversations.findIndex((c) => c.id === id);
    if (existing >= 0) {
      replacedConversation = true; // a fresh capture supersedes the earlier one
      next.conversations = next.conversations.map((c, i) => (i === existing ? record : c));
    } else {
      next.conversations = [record, ...next.conversations];
    }
  }

  if (next.lastBackupAt) next.backupStatus = 'stale';

  const exists = projects.some((p) => p.id === next.id);
  return {
    projects: exists ? projects.map((p) => (p.id === next.id ? next : p)) : [next, ...projects],
    projectId: next.id,
    replacedConversation,
  };
}
