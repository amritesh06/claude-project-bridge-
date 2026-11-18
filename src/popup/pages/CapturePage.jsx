import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ClipboardPaste, Code2, MessageSquare, ScanText } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Segmented from '../components/ui/Segmented';
import { useToast } from '../context/ToastContext';
import { requestCapture } from '../../utils/claudeTab';
import { parseManualTranscript } from '../../core/manualParser';

const PAGE_LABEL = { conversation: 'a conversation', project: 'a project page' };

function Warnings({ items }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5 rounded-lg border border-line bg-surface p-2.5">
      {items.map((w) => (
        <li key={w} className="flex gap-2 text-[12px] text-muted">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" />
          {w}
        </li>
      ))}
    </ul>
  );
}

function Preview({ capture }) {
  const conv = capture.conversation;
  const proj = capture.project || {};
  const d = conv?.diagnostics;
  return (
    <div className="card space-y-2.5 p-3">
      <p className="text-[11px] text-muted">{conv ? 'Conversation found' : 'Project page found'}</p>
      <p className="truncate text-[14px] font-semibold tracking-tight">{conv ? conv.title : proj.name || 'Untitled project'}</p>
      {conv && (
        <div className="flex flex-wrap gap-1.5">
          <Badge icon={MessageSquare}>{conv.messages.length} messages</Badge>
          <Badge>{d.userCount} yours</Badge>
          <Badge>{d.assistantCount} Claude</Badge>
          <Badge icon={Code2}>{d.codeBlockCount} code blocks</Badge>
        </div>
      )}
      {!conv && (
        <p className="text-[12px] text-muted">
          {proj.instructions ? 'Project instructions captured.' : 'No instructions were visible on this page.'}{' '}
          Capture individual conversations from their own pages.
        </p>
      )}
    </div>
  );
}

function ManualImport({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseManualTranscript(text), [text]);
  const roles = parsed.filter((m) => m.role !== 'note').length;

  return (
    <div className="card space-y-2.5 p-3">
      <p className="text-[12px] text-muted">
        Copy the conversation from claude.ai and paste it here. Lines starting with <span className="font-mono">You:</span> and{' '}
        <span className="font-mono">Claude:</span> are split into messages. Anything else is kept as one note.
      </p>
      <input className="field w-full" placeholder="Conversation title" aria-label="Conversation title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        className="field scroll-thin h-28 w-full resize-none py-2 font-mono text-[11px]"
        placeholder="Paste conversation text"
        aria-label="Conversation text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">
          {parsed.length ? `${parsed.length} message${parsed.length > 1 ? 's' : ''} (${roles} with speakers)` : 'Nothing to import yet'}
        </span>
        <Button
          variant="primary"
          disabled={!parsed.length}
          onClick={() =>
            onSubmit({
              source: 'manual',
              capturedAt: Date.now(),
              page: 'conversation',
              project: null,
              conversation: {
                conversationId: null,
                title: title.trim() || 'Manual import',
                url: null,
                messages: parsed,
                diagnostics: { warnings: [] },
              },
            })
          }
        >
          Use this text
        </Button>
      </div>
    </div>
  );
}

export default function CapturePage({ claude, projects, onSave, navigate }) {
  const toast = useToast();
  const realProjects = projects.filter((p) => !p.isSample);
  const [phase, setPhase] = useState('idle'); // idle | reading | ready | error
  const [capture, setCapture] = useState(null);
  const [error, setError] = useState(null);
  const [manual, setManual] = useState(false);
  const [mode, setMode] = useState('new');
  const [name, setName] = useState('');
  const [existingId, setExistingId] = useState('');

  const prepare = (cap) => {
    const detectedId = cap.project?.projectId;
    const match = detectedId && realProjects.find((p) => p.claudeProjectId === detectedId);
    setCapture(cap);
    setName(cap.project?.name || cap.conversation?.title || '');
    setExistingId(match ? match.id : realProjects[0]?.id || '');
    setMode(match ? 'existing' : realProjects.length && !cap.project?.name ? 'existing' : 'new');
    setManual(false);
    setPhase('ready');
  };

  const read = async () => {
    setPhase('reading');
    setError(null);
    try {
      prepare(await requestCapture());
    } catch (err) {
      setError(err);
      setPhase('error');
    }
  };

  const save = () => {
    try {
      const target = mode === 'existing' && existingId ? { mode: 'existing', id: existingId } : { mode: 'new', name };
      const { projectId, replacedConversation } = onSave(capture, target);
      toast.success(replacedConversation ? 'Conversation updated' : 'Saved to project');
      navigate({ page: 'project', id: projectId, tab: capture.conversation ? 'conversations' : 'overview' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const canRead = claude.status === 'tab-open' || claude.status === 'checking';
  const warnings = [...(capture?.project?.warnings || []), ...(capture?.conversation?.diagnostics?.warnings || [])];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={ChevronLeft} aria-label="Back" className="-ml-2 !px-1.5" onClick={() => navigate({ page: 'dashboard' })} />
        <h2 className="text-[15px] font-semibold tracking-tight">Capture</h2>
      </div>

      {phase !== 'ready' && (
        <div className="card space-y-3 p-3.5">
          <div>
            <p className="text-[13px] font-medium">Read this claude.ai tab</p>
            <p className="text-[12px] text-muted">
              Reads the {claude.page ? PAGE_LABEL[claude.page] || 'page' : 'open conversation or project'} you can see right now. Nothing leaves your device.
            </p>
          </div>
          <Button variant="primary" size="lg" icon={ScanText} className="w-full" loading={phase === 'reading'} disabled={!canRead && phase !== 'error'} onClick={read}>
            Read this tab
          </Button>
          {claude.status === 'no-tab' && <p className="text-[12px] text-muted">Open claude.ai in a tab to enable this.</p>}
          {claude.status === 'preview' && <p className="text-[12px] text-muted">Tab reading is available once the extension is loaded in Chrome.</p>}
        </div>
      )}

      {phase === 'error' && error && (
        <div className="flex gap-2 rounded-xl border border-line bg-surface p-3 text-[12px]" role="alert">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-bad" />
          <div className="space-y-1">
            <p>{error.message}</p>
            <button className="text-accent-text underline-offset-2 hover:underline" onClick={() => setManual(true)}>
              Paste the conversation instead
            </button>
          </div>
        </div>
      )}

      {phase === 'ready' && capture && (
        <>
          <Preview capture={capture} />
          <Warnings items={warnings} />

          <div className="card space-y-2.5 p-3">
            <p className="text-[12px] font-medium">Save to</p>
            {realProjects.length > 0 && (
              <Segmented
                label="Save target"
                value={mode}
                onChange={setMode}
                options={[
                  { id: 'new', label: 'New project' },
                  { id: 'existing', label: 'Existing' },
                ]}
              />
            )}
            {mode === 'existing' && realProjects.length > 0 ? (
              <select className="field w-full" aria-label="Existing project" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
                {realProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className="field w-full" aria-label="Project name" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <div className="flex gap-2 pt-0.5">
              <Button variant="primary" className="flex-1" onClick={save}>
                Save capture
              </Button>
              <Button variant="ghost" onClick={() => setPhase('idle')}>
                Discard
              </Button>
            </div>
          </div>
        </>
      )}

      {phase !== 'ready' && (
        <div>
          <button
            onClick={() => setManual((m) => !m)}
            aria-expanded={manual}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-fg"
          >
            <ClipboardPaste size={13} /> Can't read the page? Paste it instead
          </button>
          {manual && <ManualImport onSubmit={prepare} />}
        </div>
      )}
    </div>
  );
}
