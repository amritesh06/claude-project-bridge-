import { useRef, useState } from 'react';
import { Check, ChevronRight, FileCode2, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Switch from '../../components/ui/Switch';
import EmptyState from '../../components/ui/EmptyState';
import { EVIDENCE_LABEL, FILE_VIEW } from '../../components/StatusPieces';
import { isConfirmed } from '../../../core/projectView';
import { cn } from '../../../utils/cn';
import { formatBytes } from '../../../utils/time';
import { readProjectFile } from '../../../utils/readFile';
import { useToast } from '../../context/ToastContext';

const FILTERS = ['all', 'created', 'modified', 'deleted', 'pending', 'unavailable'];
const SNIPPET = 700;

function FileRow({ file, project, actions }) {
  const [open, setOpen] = useState(false);
  const readOnly = project.isSample;
  const confirmed = isConfirmed(file);
  const view = FILE_VIEW[file.status] || FILE_VIEW.unavailable;
  const titles = Object.fromEntries(project.conversations.map((c) => [c.id, c.title]));
  const seenIn = [...new Set((file.sources || []).map((s) => titles[s.conversationId]).filter(Boolean))];
  const code = file.latestCode;

  return (
    <li className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <ChevronRight size={13} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-90')} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12px]">{file.path}</p>
          <p className="text-[11px] text-muted">{EVIDENCE_LABEL[file.evidence] || 'Unknown source'}</p>
        </div>
        {confirmed ? (
          <Badge tone="ok" icon={Check}>Confirmed</Badge>
        ) : file.evidence === 'codeblock' ? (
          <Badge>Unconfirmed</Badge>
        ) : null}
        <Badge tone={view.tone}>{view.label}</Badge>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-line px-3 py-2.5">
          {!readOnly && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor={`st-${file.id}`} className="w-16 text-[12px] text-muted">Status</label>
                <select id={`st-${file.id}`} className="field h-7 flex-1 text-[12px]" value={file.status} onChange={(e) => actions.updateFile(project.id, file.id, { status: e.target.value })}>
                  {Object.entries(FILE_VIEW).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`pa-${file.id}`} className="w-16 text-[12px] text-muted">Path</label>
                <input
                  id={`pa-${file.id}`}
                  className="field h-7 flex-1 font-mono text-[12px]"
                  defaultValue={file.path}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== file.path) actions.updateFile(project.id, file.id, { path: v });
                    else e.target.value = file.path;
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[12px] text-muted">I have confirmed this file exists</span>
                <Switch label="Confirmed" checked={confirmed} onChange={(v) => actions.updateFile(project.id, file.id, { confirmed: v })} />
              </div>
            </div>
          )}

          {seenIn.length > 0 && <p className="text-[12px] text-muted">Seen in: {seenIn.join(', ')}</p>}
          {file.content != null && <p className="text-[12px] text-muted">Uploaded content stored ({formatBytes(file.size)}).</p>}
          {file.note && <p className="text-[12px] text-warn">{file.note}</p>}

          {code && (
            <div className="space-y-1">
              <p className="text-[11px] text-muted">Latest code shown in the conversation. It may be a partial snippet, not the whole file.</p>
              <pre className="scroll-thin max-h-40 overflow-auto rounded-lg border border-line bg-bg p-2 font-mono text-[11px] leading-relaxed text-muted">
                {code.content.length > SNIPPET ? `${code.content.slice(0, SNIPPET)}…` : code.content}
              </pre>
            </div>
          )}

          {!readOnly && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => actions.deleteFile(project.id, file.id)}>
              Remove from tracker
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export default function FilesTab({ project, actions }) {
  const toast = useToast();
  const input = useRef(null);
  const [filter, setFilter] = useState('all');
  const readOnly = project.isSample;
  const files = filter === 'all' ? project.files : project.files.filter((f) => f.status === filter);
  const confirmedCount = project.files.filter(isConfirmed).length;

  const onPick = async (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    let stored = 0;
    for (const f of picked) {
      try {
        const rec = await readProjectFile(f);
        actions.addFile(project.id, rec);
        stored += 1;
      } catch {
        toast.error(`Could not read ${f.name}.`);
      }
    }
    if (stored) toast.success(`${stored} file${stored > 1 ? 's' : ''} added and marked confirmed`);
  };

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
        {!readOnly && (
          <>
            <Button size="sm" icon={Plus} onClick={() => input.current?.click()}>Add</Button>
            <input ref={input} type="file" multiple className="hidden" onChange={onPick} />
          </>
        )}
      </div>

      {project.files.length > 0 && (
        <p className="text-[12px] text-muted">
          {confirmedCount} confirmed · {project.files.length - confirmedCount} not confirmed. “Created” on an unconfirmed file only means the conversation provided code for it.
        </p>
      )}

      {files.length === 0 ? (
        <EmptyState
          icon={FileCode2}
          title={project.files.length ? 'No files in this view' : 'No files tracked yet'}
          description={project.files.length ? 'Try another filter.' : 'Files are detected from your captured conversations. You can also add files you have.'}
        />
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <FileRow key={f.id} file={f} project={project} actions={actions} />
          ))}
        </ul>
      )}
    </div>
  );
}
