import { backupFileName, createBackup } from '../core/backupManager.js';
import { buildZipBytes } from './zipExporter.js';

/** Builds the backup ZIP for a real project. Throws a readable error on failure. */
export async function exportProject(project, { appVersion } = {}) {
  if (!project || project.isSample) throw new Error('Sample data cannot be exported. Capture a real conversation first.');
  const { entries, summary } = createBackup(project, { appVersion });
  const bytes = await buildZipBytes(entries);
  return { bytes, filename: backupFileName(project), summary, size: bytes.byteLength };
}
