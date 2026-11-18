import { useRef, useState } from 'react';
import { Archive, Copy, Download, History, PackagePlus, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import SampleBadge from '../components/ui/SampleBadge';
import { useToast } from '../context/ToastContext';
import { copyText } from '../../utils/clipboard';
import { formatBytes, timeAgo } from '../../utils/time';
import { SAMPLE_RESUME_PROMPT } from '../data/sample';

function ActionRow({ icon: Icon, title, description, children }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[12px] text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function BackupCenter({ project, history }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(null);

  // Placeholder wiring for Phases 5 and 6: shows the loading state, then explains.
  const stub = (key, message) => {
    setBusy(key);
    setTimeout(() => {
      setBusy(null);
      toast.info(message);
    }, 600);
  };

  const copyPrompt = async () => {
    if (project && !project.isSample) {
      toast.info('Resume prompts for your own projects are generated in Phase 7.');
      return;
    }
    const ok = await copyText(SAMPLE_RESUME_PROMPT);
    ok ? toast.success('Sample resume prompt copied') : toast.error('Could not access the clipboard');
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Choose a .zip file exported by Claude Project Bridge.');
      return;
    }
    toast.info(`Selected ${file.name}. ZIP import is added in Phase 6.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold tracking-tight">Backup center</h2>
        {project && <Badge>{project.name}</Badge>}
      </div>

      <ActionRow icon={PackagePlus} title="Create backup" description="Save a snapshot on this device.">
        <Button
          variant="primary"
          loading={busy === 'create'}
          disabled={!project}
          onClick={() => stub('create', 'Backups are saved to local storage in Phase 5.')}
        >
          Create
        </Button>
      </ActionRow>

      <ActionRow icon={Download} title="Export ZIP" description="Markdown files plus collected attachments.">
        <Button loading={busy === 'export'} disabled={!project} onClick={() => stub('export', 'ZIP export is added in Phase 6.')}>
          Export
        </Button>
      </ActionRow>

      <ActionRow icon={Copy} title="Resume prompt" description="Paste into the new account's first message.">
        <Button disabled={!project} onClick={copyPrompt}>
          Copy
        </Button>
      </ActionRow>

      <ActionRow icon={Upload} title="Import backup" description="Inspect a previously exported ZIP.">
        <Button onClick={() => fileInput.current?.click()}>Choose file</Button>
        <input ref={fileInput} type="file" accept=".zip,application/zip" className="hidden" onChange={onFile} />
      </ActionRow>

      <div className="pt-1">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium">
          <History size={13} className="text-muted" /> Backup history
        </p>
        {history.length === 0 ? (
          <EmptyState icon={Archive} title="No backups yet" description="Backups you create appear here with their size and date." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                <span className="flex-1">{timeAgo(h.at)}</span>
                <span className="text-muted">{formatBytes(h.size)}</span>
                <Badge>{h.trigger}</Badge>
                {h.isSample && <SampleBadge />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
