import { useState } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { TASK_VIEW } from '../../components/StatusPieces';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '../../../core/progressAnalyzer';
import { cn } from '../../../utils/cn';

const ORDER = { working: 0, issue: 1, pending: 2, completed: 3 };

export default function TasksTab({ project, actions }) {
  const readOnly = project.isSample;
  const [title, setTitle] = useState('');
  const sorted = [...project.tasks].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const add = () => {
    if (!title.trim()) return;
    actions.addTask(project.id, title);
    setTitle('');
  };

  return (
    <div className="space-y-2.5">
      {!readOnly && (
        <div className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="Add a task"
            aria-label="New task"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button icon={Plus} disabled={!title.trim()} onClick={add}>Add</Button>
        </div>
      )}

      {!sorted.length ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Tasks are suggested from lists like “Next steps” and ✅ items in your conversations. You can also add your own."
        />
      ) : (
        <>
          {!readOnly && <p className="text-[12px] text-muted">Suggested tasks come from structure in the conversation. Change any status; your changes are kept.</p>}
          <ul className="space-y-1.5">
            {sorted.map((t) => {
              const v = TASK_VIEW[t.status];
              const Icon = v.icon;
              return (
                <li key={t.id} className="card space-y-1 px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={cn('shrink-0', v.color)} />
                    <span className={cn('min-w-0 flex-1 text-[12px]', t.status === 'completed' && 'text-muted line-through decoration-muted/50')}>{t.title}</span>
                    {!readOnly && t.origin !== 'manual' && !t.userEdited && <Badge tone="info">Suggested</Badge>}
                    <select
                      aria-label={`Status of ${t.title}`}
                      className="field h-6 w-[104px] shrink-0 px-1.5 text-[11px]"
                      value={t.status}
                      onChange={(e) => actions.updateTaskStatus(project.id, t.id, e.target.value)}
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    {!readOnly && (
                      <button aria-label={`Delete ${t.title}`} onClick={() => actions.deleteTask(project.id, t.id)} className="text-muted transition-colors hover:text-bad">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {t.note && t.status === 'issue' && !t.userEdited && <p className="pl-[26px] text-[11px] text-muted">{t.note}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
