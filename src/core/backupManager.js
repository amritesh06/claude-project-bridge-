import { buildDocs } from '../utils/markdownGenerator.js';

export const BACKUP_FORMAT = 'claude-project-bridge';
export const BACKUP_VERSION = 1;
export const ROOT = 'Claude-Project-Backup';

/** Makes a user-controlled path safe to use as a ZIP entry name. */
export function safePath(p) {
  const parts = String(p || '')
    .replace(/\\/g, '/')
    .replace(/^[a-zA-Z]:/, '')
    .split('/')
    .map((s) => s.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim().slice(0, 120))
    .filter((s) => s && s !== '.' && s !== '..');
  return parts.length ? parts.join('/') : 'unnamed';
}

export function backupFileName(project, now = Date.now()) {
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'project';
  return `Claude-Project-Backup_${slug}_${new Date(now).toISOString().slice(0, 10)}.zip`;
}

/**
 * Builds every file that goes into the ZIP.
 * @returns {{ entries: {path: string, data: string}[], summary: object }}
 */
export function createBackup(project, { now = Date.now(), appVersion = '0.1.0' } = {}) {
  const entries = [];
  const add = (path, data) => entries.push({ path: `${ROOT}/${path}`, data });

  for (const [name, text] of Object.entries(buildDocs(project, now))) add(name, text);

  const { isSample, ...exportable } = project; // eslint-disable-line no-unused-vars
  add('backup.json', JSON.stringify({ format: BACKUP_FORMAT, formatVersion: BACKUP_VERSION, appVersion, exportedAt: now, project: exportable }, null, 2));

  // files/: uploaded files (verified) and, separately, code shown in conversations (may be partial).
  const used = new Set();
  const unique = (p) => {
    let candidate = p;
    for (let i = 2; used.has(candidate.toLowerCase()); i += 1) candidate = p.replace(/(\.[^./]+)?$/, `-${i}$1`);
    used.add(candidate.toLowerCase());
    return candidate;
  };
  let uploaded = 0;
  let snippets = 0;
  for (const f of project.files) {
    if (f.content != null) {
      add(`files/${unique(safePath(f.path))}`, f.content);
      uploaded += 1;
    } else if (f.latestCode && f.status !== 'deleted') {
      add(`files/_from-conversation/${unique(safePath(f.path))}`, f.latestCode.content);
      snippets += 1;
    }
  }
  if (uploaded || snippets) {
    add(
      'files/README.md',
      `# files/\n\n- Files in this folder (outside \`_from-conversation\`) were uploaded by the user and are the real files.\n- \`_from-conversation/\` holds the latest code Claude showed for a file in a chat. It may be a partial snippet and may not match the real file.\n`,
    );
  }

  return {
    entries,
    summary: {
      conversations: project.conversations.length,
      messages: project.conversations.reduce((n, c) => n + c.messages.length, 0),
      files: project.files.length,
      uploadedFiles: uploaded,
      snippets,
    },
  };
}
