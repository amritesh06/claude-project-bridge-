import { useState } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import { summarizeTasks } from '../../../core/progressAnalyzer';
import { effectiveLastWorkingPoint, effectiveStack } from '../../../core/projectView';
import { timeAgo } from '../../../utils/time';
import { useToast } from '../../context/ToastContext';

const parseList = (s) => [...new Set(s.split(',').map((x) => x.trim()).filter(Boolean))];

function EditForm({ project, actions, onClose }) {
  const toast = useToast();
  const derivedStack = (project.analysis?.stack || []).map((t) => t.name);
  const derivedPoint = project.analysis?.lastWorkingPoint || '';
  const [f, setF] = useState({
    name: project.name,
    description: project.description || '',
    instructions: project.instructions || '',
    stack: effectiveStack(project).join(', '),
    point: effectiveLastWorkingPoint(project),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = () => {
    if (!f.name.trim()) return toast.error('A project needs a name.');
    const list = parseList(f.stack);
    actions.updateProject(project.id, {
      name: f.name.trim(),
      description: f.description.trim(),
      instructions: f.instructions.trim(),
      overrides: {
        stack: list.filter((n) => !derivedStack.includes(n)),
        removedStack: derivedStack.filter((n) => !list.includes(n)),
        lastWorkingPoint: f.point.trim() === derivedPoint.trim() ? '' : f.point.trim(),
      },
    });
    toast.success('Project details saved');
    onClose();
  };

  const label = 'mb-1 block text-[12px] font-medium';
  const area = 'field scroll-thin w-full resize-none py-2';
  return (
    <div className="card space-y-3 p-3">
      <div>
        <label className={label} htmlFor="pd-name">Project name</label>
        <input id="pd-name" className="field w-full" value={f.name} onChange={set('name')} />
      </div>
      <div>
        <label className={label} htmlFor="pd-desc">Description</label>
        <textarea id="pd-desc" className={`${area} h-16`} value={f.description} onChange={set('description')} />
      </div>
      <div>
        <label className={label} htmlFor="pd-stack">Technology stack</label>
        <input id="pd-stack" className="field w-full" placeholder="Comma-separated" value={f.stack} onChange={set('stack')} />
        <p className="mt-1 text-[11px] text-muted">Remove a detected technology by deleting it from this list.</p>
      </div>
      <div>
        <label className={label} htmlFor="pd-point">Where you stopped</label>
        <textarea id="pd-point" className={`${area} h-16`} value={f.point} onChange={set('point')} />
      </div>
      <div>
        <label className={label} htmlFor="pd-inst">Project instructions</label>
        <textarea id="pd-inst" className={`${area} h-20`} placeholder="Paste the instructions from your Claude project" value={f.instructions} onChange={set('instructions')} />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={save}>Save</Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function OverviewTab({ project, actions }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const readOnly = project.isSample;
  const s = summarizeTasks(project.tasks);
  const stack = effectiveStack(project);
  const point = effectiveLastWorkingPoint(project);

  if (editing) return <EditForm project={project} actions={actions} onClose={() => setEditing(false)} />;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[13px] text-muted">{project.description || 'No description yet.'}</p>
        {!readOnly && (
          <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      <div className="card space-y-2 p-3">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-muted">Progress</span>
          <span className="tabular-nums">{s.total ? `${s.completed} of ${s.total} · ${s.percent}%` : 'No tasks yet'}</span>
        </div>
        <ProgressBar value={s.percent} label="Project progress" />
        <p className="pt-1 text-[12px] text-muted">
          Where you stopped: <span className="text-fg">{point || 'Not set yet'}</span>
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-medium">Technology stack</p>
        <div className="flex flex-wrap gap-1.5">
          {stack.length ? stack.map((t) => <Badge key={t}>{t}</Badge>) : <span className="text-[12px] text-muted">None detected yet</span>}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-medium">Project instructions</p>
        {project.instructions ? (
          <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-2.5 text-[12px] text-muted">{project.instructions}</p>
        ) : (
          <p className="text-[12px] text-muted">None captured. Paste them in with Edit.</p>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 border-t border-line pt-3 text-[12px] text-muted">
          <span className="flex-1">
            {project.analysis ? `Analysed ${timeAgo(project.analysis.generatedAt)} · ${project.files.length} files · ${project.tasks.length} tasks` : 'Not analysed yet'}
          </span>
          <Button
            size="sm"
            icon={RefreshCw}
            onClick={() => actions.reanalyze(project.id) && toast.success('Analysis refreshed. Your edits were kept.')}
          >
            Re-analyze
          </Button>
        </div>
      )}
    </div>
  );
}
