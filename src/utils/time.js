const UNITS = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
];

/** "just now", "12m ago", "3h ago", "2d ago". Returns "Never" for empty values. */
export function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  for (const [label, ms] of UNITS) {
    if (diff >= ms) return `${Math.floor(diff / ms)}${label} ago`;
  }
  return 'Just now';
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
