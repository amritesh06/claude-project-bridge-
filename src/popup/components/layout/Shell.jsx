import { Archive, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';
import Logo from '../ui/Logo';
import Badge from '../ui/Badge';
import { cn } from '../../../utils/cn';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'backup', label: 'Backup', icon: Archive },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_LABEL = { conversation: 'Conversation open', project: 'Project open', other: 'claude.ai open' };

export function claudeStatusView({ status, page }) {
  switch (status) {
    case 'tab-open':
      return { tone: 'ok', text: page ? PAGE_LABEL[page] : 'claude.ai open', hint: page ? null : 'Reload the claude.ai tab to connect.' };
    case 'no-tab':
      return { tone: 'neutral', text: 'No claude.ai tab', hint: 'Open claude.ai to capture a project.' };
    case 'preview':
      return { tone: 'info', text: 'Browser preview', hint: 'Tab detection works once loaded as an extension.' };
    default:
      return { tone: 'neutral', text: 'Checking…', hint: null };
  }
}

export default function Shell({ claude, active, onNavigate, children }) {
  const view = claudeStatusView(claude);
  return (
    <div className="relative flex h-full flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
        <Logo />
        <span className="flex-1 text-[13px] font-semibold tracking-tight">Project Bridge</span>
        <Badge tone={view.tone}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {view.text}
        </Badge>
      </header>

      <main className="scroll-thin flex-1 overflow-y-auto px-4 pb-4 pt-3">{children}</main>

      <nav className="grid h-14 shrink-0 grid-cols-4 border-t border-line bg-bg" aria-label="Primary">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onNavigate({ page: id })}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-accent-text' : 'text-muted hover:text-fg',
              )}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
