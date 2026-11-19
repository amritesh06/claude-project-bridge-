const MAX_BYTES = 2 * 1024 * 1024; // per file, stored text only

/** Reads a user-selected file for manual upload. Binary or oversized files keep metadata only. */
export async function readProjectFile(file) {
  const base = { path: file.name, size: file.size, content: null, note: '' };
  if (file.size > MAX_BYTES) return { ...base, note: 'Too large to store (over 2 MB). Only the name was recorded.' };
  const text = await file.text();
  if (text.includes('\u0000')) return { ...base, note: 'Binary file. Only the name was recorded.' };
  return { ...base, content: text };
}
