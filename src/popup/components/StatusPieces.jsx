import { CheckCircle2, Circle, CircleDot, AlertTriangle } from 'lucide-react';
import Badge from './ui/Badge';

export const TASK_VIEW = {
  completed: { tone: 'ok', icon: CheckCircle2, color: 'text-ok' },
  working: { tone: 'accent', icon: CircleDot, color: 'text-accent-text' },
  pending: { tone: 'neutral', icon: Circle, color: 'text-muted' },
  issue: { tone: 'bad', icon: AlertTriangle, color: 'text-bad' },
};

export const FILE_VIEW = {
  created: { tone: 'ok', label: 'Created' },
  modified: { tone: 'info', label: 'Modified' },
  deleted: { tone: 'bad', label: 'Deleted' },
  pending: { tone: 'warn', label: 'Pending' },
  unavailable: { tone: 'neutral', label: 'Referenced, unavailable' },
};

export const EVIDENCE_LABEL = {
  codeblock: 'Code in conversation',
  attachment: 'Attachment captured',
  mentioned: 'Mentioned only',
  manual: 'Added manually',
};

const BACKUP_VIEW = {
  current: { tone: 'ok', label: 'Backed up' },
  stale: { tone: 'warn', label: 'Backup outdated' },
  none: { tone: 'neutral', label: 'Not backed up' },
};

export function BackupBadge({ status }) {
  const v = BACKUP_VIEW[status] || BACKUP_VIEW.none;
  return <Badge tone={v.tone}>{v.label}</Badge>;
}
