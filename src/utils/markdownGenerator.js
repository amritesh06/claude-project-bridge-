import { getSections } from '../core/projectView.js';
import { summarizeTasks } from '../core/progressAnalyzer.js';
import { effectiveLastWorkingPoint, effectiveStack, isConfirmed } from '../core/projectView.js';
import { buildResumePrompt } from '../core/resumePrompt.js';

const FILE_STATUS = { created: 'Created', modified: 'Modified', deleted: 'Deleted', pending: 'Pending', unavailable: 'Referenced but unavailable' };
const EVIDENCE = { codeblock: 'Code in conversation', mentioned: 'Mentioned only', attachment: 'Attachment', manual: 'Uploaded by user' };
const date = (ts) => (ts ? new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'unknown');
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** A code fence long enough that backticks inside the code can't close it. */
export function fenceFor(code) {
  const longest = Math.max(0, ...(code.match(/`+/g) || []).map((r) => r.length));
  return '`'.repeat(Math.max(3, longest + 1));
}

function blocksToMarkdown(blocks = []) {
  return blocks
    .map((b) => {
      if (b.type === 'code') {
        const f = fenceFor(b.content);
        return `${f}${b.lang || ''}\n${b.content}\n${f}`;
      }
      return b.content;
    })
    .join('\n\n');
}

function sectionToMarkdown(sec) {
  if (sec.empty) return '_Not captured._';
  if (sec.mono) return `\`\`\`\n${sec.text}\n\`\`\``;
  if (sec.text) return sec.text;
  return (sec.groups || [])
    .map((g) => `${g.label ? `**${g.label}**\n\n` : ''}${g.items.map((i) => `- ${i}`).join('\n')}`)
    .join('\n\n');
}

const sectionById = (project, id) => getSections(project).find((s) => s.id === id);

function header(project, exportedAt, title) {
  return `# ${title}\n\n> Project: **${project.name}** · Exported ${date(exportedAt)} by Claude Project Bridge\n`;
}

export function projectOverview(project, exportedAt) {
  const s = summarizeTasks(project.tasks);
  const stack = effectiveStack(project);
  return `${header(project, exportedAt, 'Project overview')}
## Description

${project.description || '_No description captured._'}

## Project instructions

${project.instructions ? project.instructions : '_No project instructions were captured._'}

## Technology stack

${stack.length ? stack.map((t) => `- ${t}`).join('\n') : '_None recorded._'}

## Progress

${s.total ? `${s.completed} of ${s.total} tracked tasks completed (${s.percent}%): ${s.working} in progress, ${s.pending} pending, ${s.issue} known issues.` : '_No tasks were tracked._'}

## Where it stopped

${effectiveLastWorkingPoint(project) || '_Not recorded._'}
`;
}

export function projectContext(project, exportedAt) {
  const body = getSections(project)
    .map((s, i) => `## ${i + 1}. ${s.title}\n\n${sectionToMarkdown(s)}${s.note && s.source === 'derived' ? `\n\n_${s.note}_` : ''}`)
    .join('\n\n');
  return `${header(project, exportedAt, 'Project context')}
Sections marked "Not captured" had nothing to derive from the conversations. Items labelled "not confirmed" come from code or text in a chat, not from verified files.

${body}
`;
}

export function technicalArchitecture(project, exportedAt) {
  const parts = ['stack', 'architecture', 'decisions'].map((id) => {
    const s = sectionById(project, id);
    return `## ${s.title}\n\n${sectionToMarkdown(s)}${s.note && s.source === 'derived' ? `\n\n_${s.note}_` : ''}`;
  });
  return `${header(project, exportedAt, 'Technical architecture')}\n${parts.join('\n\n')}\n`;
}

export function conversationHistory(project, exportedAt) {
  if (!project.conversations.length) return `${header(project, exportedAt, 'Conversation history')}\n_No conversations were captured._\n`;
  const convs = [...project.conversations].sort((a, b) => (a.capturedAt || a.updatedAt || 0) - (b.capturedAt || b.updatedAt || 0));
  const body = convs
    .map((c, ci) => {
      const msgs = c.messages
        .map((m, i) => `### ${i + 1}. ${m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Claude' : 'Note'}\n\n${blocksToMarkdown(m.blocks)}`)
        .join('\n\n');
      return `## Conversation ${ci + 1}: ${c.title}\n\n_Captured ${date(c.capturedAt || c.updatedAt)}${c.url ? ` from ${c.url}` : ''}${c.source === 'manual' ? ' (pasted manually)' : ''} · ${c.messages.length} messages_\n\n${msgs}`;
    })
    .join('\n\n---\n\n');
  return `${header(project, exportedAt, 'Conversation history')}\nOldest conversation first. Messages are in the original order.\n\n${body}\n`;
}

export function fileTracker(project, exportedAt) {
  const files = project.files;
  if (!files.length) return `${header(project, exportedAt, 'File tracker')}\n_No files were tracked._\n`;
  const row = (f) => `| \`${cell(f.path)}\` | ${FILE_STATUS[f.status] || f.status} | ${EVIDENCE[f.evidence] || f.evidence} | ${isConfirmed(f) ? 'Yes' : 'No'} | ${cell(f.note || '')} |`;
  const table = (list) => `| Path | Status | Source | Confirmed | Notes |\n|---|---|---|---|---|\n${list.map(row).join('\n')}`;
  const groups = [
    ['Confirmed files', files.filter((f) => isConfirmed(f) && f.status !== 'deleted' && f.status !== 'pending')],
    ['Not confirmed (provided as code in a chat, may differ from the real file)', files.filter((f) => !isConfirmed(f) && (f.status === 'created' || f.status === 'modified'))],
    ['Pending (planned, not created)', files.filter((f) => f.status === 'pending')],
    ['Referenced but unavailable (never shared)', files.filter((f) => f.status === 'unavailable')],
    ['Deleted', files.filter((f) => f.status === 'deleted')],
  ].filter(([, list]) => list.length);
  return `${header(project, exportedAt, 'File tracker')}
"Created" only means the conversation indicated the file was created. Only rows marked Confirmed were verified by the user or uploaded.

${groups.map(([t, list]) => `## ${t}\n\n${table(list)}`).join('\n\n')}
`;
}

export function currentProgress(project, exportedAt) {
  const s = summarizeTasks(project.tasks);
  const mark = { completed: 'x', working: '~', pending: ' ', issue: '!' };
  const line = (t) => `- [${mark[t.status]}] ${t.title}${t.origin !== 'manual' && !t.userEdited ? ' _(suggested from the conversation)_' : ''}`;
  const group = (title, status) => {
    const list = project.tasks.filter((t) => t.status === status);
    return list.length ? `## ${title}\n\n${list.map(line).join('\n')}` : '';
  };
  return `${header(project, exportedAt, 'Current progress')}
${s.total ? `**${s.completed} of ${s.total}** tasks completed (${s.percent}%).` : '_No tasks were tracked._'}
Legend: [x] completed · [~] in progress · [ ] pending · [!] known issue

## Last working point

${effectiveLastWorkingPoint(project) || '_Not recorded._'}

${[group('In progress', 'working'), group('Known issues', 'issue'), group('Pending', 'pending'), group('Completed', 'completed')].filter(Boolean).join('\n\n')}
`;
}

export function nextSteps(project, exportedAt) {
  const t = (st) => project.tasks.filter((x) => x.status === st).map((x) => `- ${x.title}`);
  const f = (st) => project.files.filter((x) => x.status === st).map((x) => `- \`${x.path}\``);
  const block = (title, lines) => (lines.length ? `## ${title}\n\n${lines.join('\n')}` : '');
  const body = [
    block('Continue with', t('working')),
    block('Up next', t('pending')),
    block('Files to create', f('pending')),
    block('Issues to check', t('issue')),
    block('Files to provide to Claude', f('unavailable')),
  ].filter(Boolean);
  return `${header(project, exportedAt, 'Next steps')}\n${body.length ? body.join('\n\n') : '_Nothing is queued. Decide the next step with Claude after it reads the documents._'}\n`;
}

export function resumePromptDoc(project, exportedAt) {
  return `${header(project, exportedAt, 'Resume project prompt')}
Paste the text below into the first message of a new Claude conversation, and attach the other documents from this backup.

---

${buildResumePrompt(project)}`;
}

export function readme(project, exportedAt) {
  return `# Claude Project Backup: ${project.name}

Exported ${date(exportedAt)} by Claude Project Bridge.

## Continue in another Claude account

1. Open the Claude Project Bridge extension and choose **Import project**, then select this ZIP.
2. Copy the resume prompt and paste it into a new conversation.
3. Attach the .md documents from this ZIP to that conversation.

Without the extension: open RESUME_PROJECT_PROMPT.md, paste its text into Claude, and attach the other files.

\`backup.json\` is what the extension reads when importing. Do not edit it by hand.
`;
}

/** All Markdown documents, keyed by file name. */
export function buildDocs(project, exportedAt = Date.now()) {
  return {
    'README.md': readme(project, exportedAt),
    'PROJECT_OVERVIEW.md': projectOverview(project, exportedAt),
    'PROJECT_CONTEXT.md': projectContext(project, exportedAt),
    'CONVERSATION_HISTORY.md': conversationHistory(project, exportedAt),
    'TECHNICAL_ARCHITECTURE.md': technicalArchitecture(project, exportedAt),
    'FILE_TRACKER.md': fileTracker(project, exportedAt),
    'CURRENT_PROGRESS.md': currentProgress(project, exportedAt),
    'NEXT_STEPS.md': nextSteps(project, exportedAt),
    'RESUME_PROJECT_PROMPT.md': resumePromptDoc(project, exportedAt),
  };
}

/** Everything in one Markdown file, for attaching a single document or pasting. */
export function buildContextBundle(project, exportedAt = Date.now()) {
  const docs = buildDocs(project, exportedAt);
  const order = ['RESUME_PROJECT_PROMPT.md', 'PROJECT_OVERVIEW.md', 'PROJECT_CONTEXT.md', 'TECHNICAL_ARCHITECTURE.md', 'FILE_TRACKER.md', 'CURRENT_PROGRESS.md', 'NEXT_STEPS.md', 'CONVERSATION_HISTORY.md'];
  return order.map((n) => `<!-- ===== ${n} ===== -->\n\n${docs[n]}`).join('\n\n\n');
}
