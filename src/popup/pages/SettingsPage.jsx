import { useState } from 'react';
import { Lock, Monitor, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import Switch from '../components/ui/Switch';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

function Row({ title, description, children }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        {description && <p className="text-[12px] text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section>
      <h3 className="mb-1 text-[12px] font-medium text-muted">{title}</h3>
      <div className="card divide-y divide-line px-3">{children}</div>
    </section>
  );
}

const THEMES = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export default function SettingsPage({ onClearAll }) {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const clear = () => {
    onClearAll();
    setConfirming(false);
    toast.success('All local backups deleted');
  };

  return (
    <div className="space-y-3">
      <h2 className="text-[15px] font-semibold tracking-tight">Settings</h2>

      <Group title="Appearance">
        <Row title="Theme">
          <Segmented label="Theme" options={THEMES} value={settings.theme} onChange={(theme) => update({ theme })} />
        </Row>
      </Group>

      <Group title="Automatic backup">
        <Row title="Back up automatically" description="Saves while a claude.ai project is open.">
          <Switch label="Back up automatically" checked={settings.autoBackup} onChange={(autoBackup) => update({ autoBackup })} />
        </Row>
        <Row title="Frequency">
          <select
            aria-label="Backup frequency"
            className="field w-[130px]"
            disabled={!settings.autoBackup}
            value={settings.backupFrequency}
            onChange={(e) => update({ backupFrequency: e.target.value })}
          >
            <option value="session">After each session</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
          </select>
        </Row>
      </Group>

      <Group title="Data">
        <Row title="Show sample data" description="Placeholder projects for exploring the interface. Hidden automatically once you save a real project.">
          <Switch label="Show sample data" checked={settings.showSamples} onChange={(showSamples) => update({ showSamples })} />
        </Row>
      </Group>

      <Group title="Local storage">
        <Row title="Storage used" description="Measured once backups are stored (Phase 5).">
          <span className="text-[12px] text-muted">Not measured</span>
        </Row>
        <div className="py-2.5">
          {confirming ? (
            <div className="space-y-2">
              <p className="text-[12px]">Delete every saved project and backup on this device? This can't be undone.</p>
              <div className="flex gap-2">
                <Button variant="danger" icon={Trash2} onClick={clear}>
                  Delete everything
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" icon={Trash2} onClick={() => setConfirming(true)}>
              Delete all local backups
            </Button>
          )}
        </div>
      </Group>

      <Group title="Privacy">
        <div className="space-y-2.5 py-2.5 text-[12px]">
          <p className="flex gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-ok" />
            <span>
              <span className="font-medium">Collected, locally:</span>{' '}
              <span className="text-muted">
                project names and instructions, conversation text, and attachments from claude.ai pages you open and choose to capture.
              </span>
            </span>
          </p>
          <p className="flex gap-2">
            <Lock size={14} className="mt-0.5 shrink-0 text-ok" />
            <span>
              <span className="font-medium">Never collected:</span>{' '}
              <span className="text-muted">passwords, session cookies, auth tokens, or account credentials. Nothing is sent to any server.</span>
            </span>
          </p>
        </div>
      </Group>
    </div>
  );
}
