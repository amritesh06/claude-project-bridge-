import { useState } from 'react';
import { AlertTriangle, ChevronLeft, Copy, FileDown, FolderInput } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Stat from '../components/Stat';
import { FILE_VIEW } from '../components/StatusPieces';
import { summarizeTasks } from '../../core/progressAnalyzer';
import { effectiveLastWorkingPoint, effectiveStack, isConfirmed } from '../../core/projectView';
import { buildResumePrompt } from '../../core/resumePrompt';
import { buildContextBundle } from '../../utils/markdownGenerator';
import { downloadBlob } from '../../utils/download';
import { copyText } from '../../utils/clipboard';
import { timeAgo } from '../../utils/time';
import { useToast } from '../context/ToastContext';

const SHOWN_FILES = 6;

export default function ImportPage({ data, onSave, navigate }) {
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const { project, meta, warnings } = data;
  const s = summarizeTasks(project.tasks);
  const stack = effectiveStack(project);
  const point = effectiveLastWorkingPoint(project);
  const files = project.files.filter((f) => f.status !== 'deleted');

  const copyPrompt = async () => {
    // Regenerated from the imported data. Text stored inside the ZIP is never reused.
    const ok = await copyText(buildResumePrompt(project));
    ok ? toast.success('Resume prompt copied. Paste it into a new Claude chat.') : toast.error('Could not access the clipboard');
  };

  const downloadContext = () => {
    downloadBlob(new Blob([buildContextBundle(project)], { type: 'text/markdown' }), `Claude-Project-Context_${project.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.md`);
  };

  const save = () => {
    const id = onSave(project);
    setSaved(true);
    toast.success('Project saved to this device');
    navigate({ page: 'project', id, tab: 'overview' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={ChevronLeft} aria-label="Back" className="-ml-2 !px-1.5" onClick={() => navigate({ page: 'home' })} />
        <h2 className="text-[15px] font-semibold tracking-tight">Import preview</h2>
      </div>

      <section className="card space-y-3 p-3.5">
        <div>
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{project.name}</h3>
          <p className="text-[12px] text-muted">
            Exported {meta.exportedAt ? timeAgo(meta.exportedAt) : 'at an unknown time'} · {meta.conversations} chats · {meta.messages} messages
          </p>
        </div>

        {stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stack.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <Stat value={s.completed} label="Done" dot="bg-ok" />
          <Stat value={s.working} label="Active" dot="bg-accent" />
          <Stat value={s.pending} label="Pending" dot="bg-muted" />
          <Stat value={s.issue} label="Issues" dot="bg-bad" />
        </div>

        <div className="space-y-1.5 border-t border-line pt-3 text-[12px]">
          <p className="text-muted">
            Last saved progress: <span className="text-fg">{point || 'Not recorded'}</span>
          </p>
          <div className="text-muted">
            Files ({files.length}, {files.filter(isConfirmed).length} confirmed, {meta.uploadedFiles} with contents):
            {files.length > 0 && (
              <ul className="mt-1 space-y-1">
                {files.slice(0, SHOWN_FILES).map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{f.path}</span>
                    <Badge tone={(FILE_VIEW[f.status] || FILE_VIEW.unavailable).tone}>{(FILE_VIEW[f.status] || FILE_VIEW.unavailable).label}</Badge>
                  </li>
                ))}
                {files.length > SHOWN_FILES && <li>+ {files.length - SHOWN_FILES} more</li>}
              </ul>
            )}
          </div>
        </div>
      </section>

      {warnings.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-line bg-surface p-2.5">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 text-[12px] text-muted">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" />
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Button variant="primary" size="lg" icon={FolderInput} className="w-full" disabled={saved} onClick={save}>
          Save to this device
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={Copy} onClick={copyPrompt}>
            Copy prompt
          </Button>
          <Button icon={FileDown} onClick={downloadContext}>
            Context file
          </Button>
        </div>
        <p className="text-[11px] text-muted">
          Paste the prompt into a new Claude chat, then attach the context file (or the .md documents from the ZIP) so Claude can read the full history.
        </p>
      </div>
    </div>
  );
}
