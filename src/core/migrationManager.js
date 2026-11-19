// Reads a backup produced by createBackup(). The ZIP is UNTRUSTED input: the JSON is parsed
// defensively and rebuilt field by field into a fresh object. Unknown fields are dropped,
// types and sizes are enforced, and nothing from the file is ever executed or evaluated.

import { BACKUP_FORMAT, BACKUP_VERSION, ROOT, safePath } from './backupManager.js';
import { TASK_STATUSES } from './progressAnalyzer.js';
import { fileId } from './fileTracker.js';
import { SECTION_IDS } from './contextBuilder.js';

const FILE_STATUSES = ['created', 'modified', 'deleted', 'pending', 'unavailable'];
const EVIDENCE = ['codeblock', 'mentioned', 'attachment', 'manual'];
const MAX = { conversations: 500, messages: 20000, blocks: 200, tasks: 500, files: 2000, text: 2_000_000 };

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max = 10000) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v) => (Number.isFinite(v) ? v : null);
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const strArr = (v, max, len) => arr(v, max).filter((x) => typeof x === 'string').map((x) => x.slice(0, len));
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

const newId = () => `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function normBlock(b) {
  if (!isObj(b) || typeof b.content !== 'string') return null;
  return b.type === 'code'
    ? { type: 'code', lang: str(b.lang, 30), content: b.content.slice(0, MAX.text) }
    : { type: 'text', content: b.content.slice(0, MAX.text) };
}

function normConversation(c) {
  if (!isObj(c)) return null;
  const messages = arr(c.messages, MAX.messages)
    .map((m, i) => {
      if (!isObj(m)) return null;
      const blocks = arr(m.blocks, MAX.blocks).map(normBlock).filter(Boolean);
      return blocks.length ? { id: str(m.id, 80) || `m${i + 1}`, role: oneOf(m.role, ['user', 'assistant', 'note'], 'note'), blocks } : null;
    })
    .filter(Boolean);
  const url = str(c.url, 500);
  return {
    id: str(c.id, 120) || newId(),
    title: str(c.title, 300) || 'Untitled conversation',
    url: /^https:\/\/claude\.ai\//.test(url) ? url : null, // never keep a link to anywhere else
    source: c.source === 'manual' ? 'manual' : 'claude.ai',
    capturedAt: num(c.capturedAt),
    updatedAt: num(c.updatedAt),
    messages,
  };
}

function normFile(f) {
  if (!isObj(f) || typeof f.path !== 'string') return null;
  const path = safePath(f.path);
  const code = isObj(f.latestCode) && typeof f.latestCode.content === 'string' ? { lang: str(f.latestCode.lang, 30), content: f.latestCode.content.slice(0, 100_000) } : null;
  return {
    id: str(f.id, 80) || fileId(path),
    path,
    status: oneOf(f.status, FILE_STATUSES, 'unavailable'),
    evidence: oneOf(f.evidence, EVIDENCE, 'mentioned'),
    confirmed: f.confirmed === true,
    origin: f.origin === 'manual' ? 'manual' : 'derived',
    userEdited: f.userEdited === true,
    mentions: num(f.mentions) ?? 0,
    sources: arr(f.sources, 3).filter(isObj).map((s) => ({ conversationId: str(s.conversationId, 120), messageId: str(s.messageId, 80) })),
    latestCode: code,
    content: typeof f.content === 'string' ? f.content.slice(0, MAX.text) : null,
    size: num(f.size),
    note: str(f.note, 300),
    addedAt: num(f.addedAt),
  };
}

function normTask(t) {
  if (!isObj(t) || !str(t.title, 300).trim()) return null;
  return {
    id: str(t.id, 80) || newId(),
    title: str(t.title, 300),
    status: oneOf(t.status, TASK_STATUSES, 'pending'),
    origin: t.origin === 'manual' ? 'manual' : 'derived',
    userEdited: t.userEdited === true,
    ...(str(t.note, 300) ? { note: str(t.note, 300) } : {}),
  };
}

function normAnalysis(a) {
  if (!isObj(a)) return null;
  return {
    version: 1,
    generatedAt: num(a.generatedAt),
    stack: arr(a.stack, 30).filter(isObj).map((t) => ({ name: str(t.name, 60), mentions: num(t.mentions) ?? 0, via: strArr(t.via, 3, 12) })).filter((t) => t.name),
    lastWorkingPoint: str(a.lastWorkingPoint, 2000),
    openingRequests: arr(a.openingRequests, 100).filter(isObj).map((r) => ({ conversationId: str(r.conversationId, 120), title: str(r.title, 300), text: str(r.text, 400) })),
    decisions: arr(a.decisions, 30).filter(isObj).map((d) => ({ text: str(d.text, 300), conversationId: str(d.conversationId, 120) })),
  };
}

function normOverrides(o) {
  const src = isObj(o) ? o : {};
  const notes = {};
  if (isObj(src.contextNotes)) {
    for (const id of SECTION_IDS) if (typeof src.contextNotes[id] === 'string') notes[id] = src.contextNotes[id].slice(0, 50000);
  }
  return { stack: strArr(src.stack, 50, 60), removedStack: strArr(src.removedStack, 50, 60), lastWorkingPoint: str(src.lastWorkingPoint, 2000), contextNotes: notes };
}

/** Rebuilds a project from untrusted data. Always returns a fresh, valid REAL project. */
export function normalizeProject(raw) {
  const p = isObj(raw) ? raw : {};
  const exportedAt = num(p.lastBackupAt);
  return {
    id: newId(),
    sourceId: str(p.id, 120),
    isSample: false,
    name: str(p.name, 200).trim() || 'Imported project',
    description: str(p.description, 20000),
    instructions: str(p.instructions, 50000),
    stack: strArr(p.stack, 50, 60),
    claudeProjectId: str(p.claudeProjectId, 120) || null,
    createdAt: num(p.createdAt) ?? Date.now(),
    updatedAt: Date.now(),
    lastBackupAt: exportedAt,
    backupStatus: exportedAt ? 'current' : 'none',
    lastWorkingPoint: str(p.lastWorkingPoint, 2000),
    tasks: arr(p.tasks, MAX.tasks).map(normTask).filter(Boolean),
    files: arr(p.files, MAX.files).map(normFile).filter(Boolean),
    conversations: arr(p.conversations, MAX.conversations).map(normConversation).filter(Boolean),
    context: [],
    overrides: normOverrides(p.overrides),
    dismissedTaskIds: strArr(p.dismissedTaskIds, 500, 80),
    dismissedFilePaths: strArr(p.dismissedFilePaths, 2000, 300),
    analysis: normAnalysis(p.analysis),
  };
}

/** Finds backup.json at the ZIP root or directly inside one top-level folder. */
export function findBackupEntry(names) {
  return names.find((n) => n === 'backup.json' || n === `${ROOT}/backup.json`) || names.find((n) => /^[^/]+\/backup\.json$/.test(n)) || null;
}

/**
 * @param {string} jsonText  contents of backup.json
 * @param {string[]} names   all entry names in the ZIP (for the inventory)
 */
export function parseBackup(jsonText, names = []) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'backup.json is not valid JSON. The file may be damaged.' };
  }
  if (!isObj(data) || data.format !== BACKUP_FORMAT) return { ok: false, error: 'This is not a Claude Project Bridge backup.' };
  if (!Number.isInteger(data.formatVersion) || data.formatVersion > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the extension. Update the extension and try again.' };
  }
  if (!isObj(data.project)) return { ok: false, error: 'The backup has no project data.' };

  const project = normalizeProject(data.project);
  const warnings = [];
  const rawConvs = arr(data.project.conversations, 1e6).length;
  if (rawConvs > project.conversations.length) warnings.push(`${rawConvs - project.conversations.length} conversation(s) were skipped because they were invalid or over the limit.`);
  const rawFiles = arr(data.project.files, 1e6).length;
  if (rawFiles > project.files.length) warnings.push(`${rawFiles - project.files.length} file record(s) were skipped because they were invalid or over the limit.`);
  const inZip = names.filter((n) => /\/files\/(?!README\.md$)(?!_from-conversation\/)/.test(`/${n}`) && !n.endsWith('/')).length;
  const withContent = project.files.filter((f) => f.content != null).length;
  if (withContent && inZip < withContent) warnings.push('Some uploaded files listed in the backup are missing from the ZIP folder. Their contents were restored from backup.json.');

  return {
    ok: true,
    project,
    warnings,
    meta: {
      exportedAt: num(data.exportedAt),
      appVersion: str(data.appVersion, 30),
      conversations: project.conversations.length,
      messages: project.conversations.reduce((n, c) => n + c.messages.length, 0),
      files: project.files.length,
      uploadedFiles: withContent,
    },
  };
}
