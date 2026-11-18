import { useState } from 'react';
import { ChevronLeft, FileCode2, FileText, Plus, MessageSquare, Bot, User } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import ProgressBar from '../components/ui/ProgressBar';
import Collapsible from '../components/ui/Collapsible';
import EmptyState from '../components/ui/EmptyState';
import SampleBadge from '../components/ui/SampleBadge';
import { BackupBadge, EVIDENCE_LABEL, FILE_VIEW, TASK_VIEW } from '../components/StatusPieces';
import { TASK_STATUSES, TASK_STATUS_LABEL, summarizeTasks } from '../../core/progressAnalyzer';
import { cn } from '../../utils/cn';
import { timeAgo } from '../../utils/time';
import { useToast } from '../context/ToastContext';

/* ---------- Overview ---------- */
function OverviewTab({ project }) {
  const s = summarizeTasks(project.tasks);
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">{project.description || 'No description captured.'}</p>

      <div className="card space-y-2 p-3">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-muted">Progress</span>
          <span className="tabular-nums">{s.percent}%</span>
        </div>
        <ProgressBar value={s.percent} label="Project progress" />
        <p className="pt-1 text-[12px] text-muted">
          Last working point: <span className="text-fg">{project.lastWorkingPoint || 'Not set yet'}</span>
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-medium">Technology stack</p>
        <div className="flex flex-wrap gap-1.5">
          {project.stack.length ? project.stack.map((t) => <Badge key={t}>{t}</Badge>) : <span className="text-[12px] text-muted">Not detected</span>}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-medium">Project instructions</p>
        {project.instructions ? (
          <p className="rounded-lg border border-line bg-surface p-2.5 text-[12px] text-muted">{project.instructions}</p>
        ) : (
          <p className="text-[12px] text-muted">None found. You can add them manually before exporting.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Conversations ---------- */
const PREVIEW_CHARS = 600;
const MESSAGE_PAGE = 40;

function Block({ block }) {
  const [open, setOpen] = useState(false);
  const long = block.content.length > PREVIEW_CHARS;
  const shown = open || !long ? block.content : `${block.content.slice(0, PREVIEW_CHARS)}…`;
  return (
    <div className="space-y-1">
      {block.type === 'code' ? (
        <pre className="scroll-thin overflow-x-auto rounded-lg border border-line bg-bg p-2 font-mono text-[11px] leading-relaxed text-muted">
          {block.lang && <span className="mb-1 block text-[10px] text-accent-text">{block.lang}</span>}
          {shown}
        </pre>
      ) : (
        <p className="whitespace-pre-wrap break-words text-[12px] text-fg">{shown}</p>
      )}
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-accent-text hover:underline">
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

const ROLE_VIEW = {
  user: { label: 'You', icon: User, box: 'bg-surface2 text-muted' },
  assistant: { label: 'Claude', icon: Bot, box: 'bg-accent/15 text-accent-text' },
  note: { label: 'Note', icon: FileText, box: 'bg-surface2 text-muted' },
};

function Message({ m }) {
  const v = ROLE_VIEW[m.role] || ROLE_VIEW.note;
  const Icon = v.icon;
  // Sample data uses text/code; captured data uses blocks.
  const blocks = m.blocks || [{ type: 'text', content: m.text }, ...(m.code ? [{ type: 'code', content: m.code }] : [])];
  return (
    <div className="flex gap-2">
      <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md', v.box)}>
        <Icon size={11} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-medium text-muted">{v.label}</p>
        {blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

function ConversationBody({ messages }) {
  const [limit, setLimit] = useState(MESSAGE_PAGE);
  return (
    <div className="space-y-3 pt-0.5">
      {messages.slice(0, limit).map((m) => (
        <Message key={m.id} m={m} />
      ))}
      {messages.length > limit && (
        <Button size="sm" className="w-full" onClick={() => setLimit((l) => l + MESSAGE_PAGE)}>
          Show {Math.min(MESSAGE_PAGE, messages.length - limit)} more of {messages.length - limit} remaining
        </Button>
      )}
    </div>
  );
}

function ConversationsTab({ project }) {
  if (!project.conversations.length) {
    return <EmptyState icon={MessageSquare} title="No conversations captured" description="Open a conversation on claude.ai and capture it, or paste one in manually." />;
  }
  return (
    <div className="space-y-2">
      {project.conversations.map((c, i) => (
        <Collapsible
          key={c.id}
          title={c.title}
          defaultOpen={i === 0}
          meta={
            <span className="shrink-0 text-[11px] text-muted">
              {c.messages.length} msgs · {c.source === 'manual' ? 'pasted' : timeAgo(c.updatedAt)}
            </span>
          }
        >
          <ConversationBody messages={c.messages} />
        </Collapsible>
      ))}
    </div>
  );
}

/* ---------- Files ---------- */
const FILTERS = ['all', 'created', 'modified', 'deleted', 'pending', 'unavailable'];

function FilesTab({ project }) {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const files = filter === 'all' ? project.files : project.files.filter((f) => f.status === filter);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="scroll-thin flex flex-1 gap-1 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                filter === f ? 'border-accent/40 bg-accent/10 text-accent-text' : 'border-line text-muted hover:text-fg',
              )}
            >
              {f === 'all' ? 'All' : f === 'unavailable' ? 'Unavailable' : FILE_VIEW[f].label}
            </button>
          ))}
        </div>
        <Button size="sm" icon={Plus} onClick={() => toast.info('Manual file upload is added in Phase 4.')}>
          Add
        </Button>
      </div>

      {files.length === 0 ? (
        <EmptyState icon={FileCode2} title="No files in this view" description="Try another filter or add a file manually." />
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="card flex items-center gap-2.5 px-3 py-2">
              <FileCode2 size={15} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12px]">{f.path}</p>
                <p className="text-[11px] text-muted">{EVIDENCE_LABEL[f.evidence]}</p>
              </div>
              <Badge tone={FILE_VIEW[f.status].tone}>{FILE_VIEW[f.status].label}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Tasks ---------- */
function TasksTab({ project, onTaskStatus }) {
  if (!project.tasks.length) {
    return <EmptyState icon={FileText} title="No tasks tracked yet" description="Tasks are derived from your captured conversations in Phase 4." />;
  }
  return (
    <ul className="space-y-1.5">
      {project.tasks.map((t) => {
        const v = TASK_VIEW[t.status];
        const Icon = v.icon;
        return (
          <li key={t.id} className="card flex items-center gap-2.5 px-3 py-2">
            <Icon size={15} className={cn('shrink-0', v.color)} />
            <span className={cn('min-w-0 flex-1 text-[12px]', t.status === 'completed' && 'text-muted line-through decoration-muted/50')}>
              {t.title}
            </span>
            <select
              aria-label={`Status of ${t.title}`}
              className="field h-6 w-[104px] shrink-0 px-1.5 text-[11px]"
              value={t.status}
              onChange={(e) => onTaskStatus(project.id, t.id, e.target.value)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Context ---------- */
function ContextTab({ project }) {
  if (!project.context.length) {
    return <EmptyState icon={FileCode2} title="No context generated yet" description="Context is built from captured conversations in Phase 4." />;
  }
  return (
    <div className="space-y-1.5">
      {project.context.map((c) => (
        <Collapsible key={c.title} title={c.title}>
          {Array.isArray(c.body) ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {c.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>{c.body}</p>
          )}
        </Collapsible>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */
export default function ProjectDetails({ project, initialTab = 'overview', onBack, onTaskStatus }) {
  const [tab, setTab] = useState(initialTab);

  if (!project) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack}>
          Projects
        </Button>
        <EmptyState title="Project not found" description="It may have been deleted." />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversations', label: 'Chats', count: project.conversations.length },
    { id: 'files', label: 'Files', count: project.files.length },
    { id: 'tasks', label: 'Tasks', count: project.tasks.length },
    { id: 'context', label: 'Context' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack} aria-label="Back to projects" className="-ml-2 !px-1.5" />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{project.name}</h2>
        {project.isSample && <SampleBadge />}
        <BackupBadge status={project.backupStatus} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab project={project} />}
        {tab === 'conversations' && <ConversationsTab project={project} />}
        {tab === 'files' && <FilesTab project={project} />}
        {tab === 'tasks' && <TasksTab project={project} onTaskStatus={onTaskStatus} />}
        {tab === 'context' && <ContextTab project={project} />}
      </div>
    </div>
  );
}
