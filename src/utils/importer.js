import { parseBackup } from '../core/migrationManager.js';
import { MAX_ZIP_BYTES, readBackupJson } from './zipExporter.js';

/** Reads a user-selected ZIP. Always resolves to { ok: true, project, meta, warnings } or { ok: false, error }. */
export async function readImportFile(file) {
  if (!file || !/\.zip$/i.test(file.name || '')) return { ok: false, error: 'Choose a .zip file exported by Claude Project Bridge.' };
  if (file.size > MAX_ZIP_BYTES) return { ok: false, error: 'That ZIP is larger than 100 MB, which is too big to import.' };
  try {
    const { json, names } = await readBackupJson(new Uint8Array(await file.arrayBuffer()));
    return parseBackup(json, names);
  } catch (err) {
    return { ok: false, error: err.message || 'Could not read that file.' };
  }
}
