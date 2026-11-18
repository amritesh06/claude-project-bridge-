import { Camera, Clock, Copy, Download, Globe, MapPin, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import SampleBadge from '../components/ui/SampleBadge';
import EmptyState from '../components/ui/EmptyState';
import { BackupBadge } from '../components/StatusPieces';
import { claudeStatusView } from '../components/layout/Shell';
import { summarizeTasks } from '../../core/progressAnalyzer';
import { timeAgo } from '../../utils/time';
import { useToast } from '../context/ToastContext';
import { copyText } from '../../utils/clipboard';
import { SAMPLE_RESUME_PROMPT } from '../data/sample';

function Stat({ value, label, dot }) {
  return (
    <div className="rounded-lg bg-surface2 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="text-[15px] font-semibold leading-none tabular-nums">{value}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function CaptureCard({ claude, navigate }) {
  const onSupportedPage = claude.status === 'tab-open' && (claude.page === 'conversation' || claude.page === 'project');
  if (!onSupportedPage) return null;
  const detail =
    claude.page === 'conversation'
      ? claude.messageCount
        ? `${claude.messageCount} messages visible in this conversation`
        : 'Conversation open'
      : 'Project page open';
  return (
    <section className="card flex items-center gap-3 border-accent/30 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Capture this {claude.page}</p>
        <p className="truncate text-[12px] text-muted">{detail}</p>
        {claude.streaming && <p className="text-[12px] text-warn">Claude is still replying. Wait for it to finish.</p>}
      </div>
      <Button variant="primary" icon={Camera} onClick={() => navigate({ page: 'capture' })}>
        Capture
      </Button>
    </section>
  );
}

export default function Dashboard({ project, claude, navigate }) {
  const toast = useToast();
  const status = claudeStatusView(claude);

  if (!project) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Globe}
          title="No project saved yet"
          description="Open a conversation on claude.ai and capture it here to build your first backup."
          action={
            <Button variant="primary" icon={Camera} onClick={() => navigate({ page: 'capture' })}>
              Capture or paste
            </Button>
          }
        />
        <CaptureCard claude={claude} navigate={navigate} />
        <Button variant="secondary" icon={Upload} className="w-full" onClick={() => navigate({ page: 'backup' })}>
          Import a backup
        </Button>
      </div>
    );
  }

  const s = summarizeTasks(project.tasks);

  const copyPrompt = async () => {
    if (!project.isSample) {
      toast.info('Resume prompts for your own projects are generated in Phase 7.');
      return;
    }
    const ok = await copyText(SAMPLE_RESUME_PROMPT);
    ok ? toast.success('Sample resume prompt copied') : toast.error('Could not access the clipboard');
  };

  return (
    <div className="space-y-3">
      <CaptureCard claude={claude} navigate={navigate} />
      <section className="card flex items-center gap-3 px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface2 text-muted">
          <Globe size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Claude.ai</p>
          <p className="truncate text-[12px] text-muted">{status.hint || status.text}</p>
        </div>
      </section>

      <section className="card space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted">Current project</p>
            <h2 className="truncate text-[15px] font-semibold tracking-tight">{project.name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {project.isSample && <SampleBadge />}
            <BackupBadge status={project.backupStatus} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="text-muted">Progress</span>
            <span className="tabular-nums">
              {s.total ? `${s.completed} of ${s.total} tasks · ${s.percent}%` : 'No tasks tracked yet'}
            </span>
          </div>
          <ProgressBar value={s.percent} label="Project progress" />
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <Stat value={s.completed} label="Done" dot="bg-ok" />
          <Stat value={s.working} label="Active" dot="bg-accent" />
          <Stat value={s.pending} label="Pending" dot="bg-muted" />
          <Stat value={s.issue} label="Issues" dot="bg-bad" />
        </div>

        <div className="space-y-1.5 border-t border-line pt-3 text-[12px]">
          <p className="flex items-center gap-1.5 text-muted">
            <Clock size={12} /> Last backup: <span className="text-fg">{timeAgo(project.lastBackupAt)}</span>
          </p>
          <p className="flex items-start gap-1.5 text-muted">
            <MapPin size={12} className="mt-[3px] shrink-0" />
            <span>
              Stopped at: <span className="text-fg">{project.lastWorkingPoint || 'Not set yet'}</span>
            </span>
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" size="lg" icon={Download} onClick={() => navigate({ page: 'backup' })}>
          Quick export
        </Button>
        <Button size="lg" icon={Upload} onClick={() => navigate({ page: 'backup' })}>
          Import backup
        </Button>
      </div>
      <Button variant="ghost" size="sm" icon={Copy} className="w-full" onClick={copyPrompt}>
        Copy resume prompt
      </Button>
    </div>
  );
}
