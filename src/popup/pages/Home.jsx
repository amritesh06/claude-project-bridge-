import { useRef, useState } from 'react';
import { Camera, Copy, Download, FolderOpen, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import SampleBadge from '../components/ui/SampleBadge';
import ActionCard from '../components/ActionCard';
import CaptureCard from '../components/CaptureCard';
import { BackupBadge } from '../components/StatusPieces';
import { buildResumePrompt } from '../../core/resumePrompt';
import { exportProject } from '../../utils/exporter';
import { readImportFile } from '../../utils/importer';
import { downloadBlob } from '../../utils/download';
import { copyText } from '../../utils/clipboard';
import { formatBytes, timeAgo } from '../../utils/time';
import { useToast } from '../context/ToastContext';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function appVersion() {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return undefined;
  }
}

export default function Home({ projects, project, onSelect, claude, navigate, actions }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(null);
  const [dragging, setDragging] = useState(false);
  const real = project && !project.isSample;

  const doExport = async () => {
    setBusy('export');
    try {
      const { bytes, filename, summary, size } = await exportProject(project, { appVersion: appVersion() });
      downloadBlob(new Blob([bytes], { type: 'application/zip' }), filename);
      actions.markExported(project.id, size);
      toast.success(`Exported ${plural(summary.conversations, 'chat')} and ${plural(summary.files, 'file')} (${formatBytes(size)})`);
    } catch (err) {
      toast.error(err.message || 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (file) => {
    setBusy('import');
    const result = await readImportFile(file);
    setBusy(null);
    if (!result.ok) return toast.error(result.error);
    navigate({ page: 'import', data: result });
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) doImport(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doImport(file);
  };

  const inPopup = typeof chrome !== 'undefined' && chrome.tabs && document.documentElement.dataset.mode !== 'tab';
  const openInTab = () => chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });

  const copyPrompt = async () => {
    const ok = await copyText(buildResumePrompt(project));
    ok ? toast.success('Resume prompt copied') : toast.error('Could not access the clipboard');
  };

  return (
    <div className="space-y-3">
      <CaptureCard claude={claude} navigate={navigate} />

      {project ? (
        <section className="card space-y-2 p-3.5">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[11px] text-muted">Ongoing project</p>
            {project.isSample && <SampleBadge />}
            <BackupBadge status={project.backupStatus} />
          </div>
          {projects.length > 1 ? (
            <select className="field w-full font-medium" aria-label="Choose project" value={project.id} onChange={(e) => onSelect(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="truncate text-[15px] font-semibold tracking-tight">{project.name}</h2>
          )}
          <p className="text-[12px] text-muted">
            {plural(project.conversations.length, 'chat')} · {plural(project.files.length, 'file')} · {plural(project.tasks.length, 'task')}
            {' · '}Last export: {timeAgo(project.lastBackupAt)}
          </p>
        </section>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="No project on this device yet"
          description="Import a ZIP from another account below, or capture a conversation from claude.ai."
          action={
            <Button icon={Camera} onClick={() => navigate({ page: 'capture' })}>
              Capture or paste
            </Button>
          }
        />
      )}

      <ActionCard
        icon={Download}
        title="Export project"
        description={
          !project ? 'Nothing to export yet.' : project.isSample ? 'Sample data can’t be exported. Capture a real chat first.' : 'Save everything as a ZIP to use in another account.'
        }
      >
        <Button variant="primary" loading={busy === 'export'} disabled={!real} onClick={doExport}>
          Export ZIP
        </Button>
      </ActionCard>

      <ActionCard
        icon={Upload}
        title="Import project"
        description={dragging ? 'Drop the ZIP to open it.' : 'Open a ZIP exported from another account.'}
        highlight={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Button loading={busy === 'import'} onClick={() => fileInput.current?.click()}>
          Choose ZIP
        </Button>
        <input ref={fileInput} type="file" accept=".zip,application/zip" className="hidden" onChange={onPick} />
      </ActionCard>
      {inPopup && (
        <p className="-mt-1 text-center text-[11px] text-muted">
          Popup closes when you pick a file?{' '}
          <button className="text-accent-text hover:underline" onClick={openInTab}>
            Open in a tab
          </button>{' '}
          or drag the ZIP onto the card.
        </p>
      )}

      {real && (
        <Button variant="ghost" size="sm" icon={Copy} className="w-full" onClick={copyPrompt}>
          Copy resume prompt
        </Button>
      )}
    </div>
  );
}
