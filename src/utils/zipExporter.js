import JSZip from 'jszip';
import { findBackupEntry } from '../core/migrationManager.js';

export const MAX_ZIP_BYTES = 100 * 1024 * 1024; // refuse to open anything bigger
const MAX_ENTRIES = 10000;
const MAX_JSON_BYTES = 100 * 1024 * 1024;

/** @param entries {path, data}[]  @returns Uint8Array */
export async function buildZipBytes(entries) {
  const zip = new JSZip();
  for (const e of entries) zip.file(e.path, e.data, { createFolders: false });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/**
 * Reads ONLY backup.json from a ZIP (the other files are documentation copies), after
 * checking entry count and declared size. Returns { json, names }.
 */
export async function readBackupJson(bytes) {
  if (bytes.byteLength > MAX_ZIP_BYTES) throw new Error('That ZIP is larger than 100 MB, which is too big to import.');
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error('That file is not a readable ZIP archive.');
  }
  const names = Object.keys(zip.files);
  if (names.length > MAX_ENTRIES) throw new Error('That ZIP has too many files to be a project backup.');
  const entryName = findBackupEntry(names);
  if (!entryName) throw new Error('This ZIP has no backup.json, so it was not made by Claude Project Bridge.');
  const entry = zip.files[entryName];
  const declared = entry._data && entry._data.uncompressedSize;
  if (declared && declared > MAX_JSON_BYTES) throw new Error('The backup data inside this ZIP is too large to import.');
  return { json: await entry.async('string'), names };
}
