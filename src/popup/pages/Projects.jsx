import { useMemo, useState } from 'react';
import { ChevronRight, FolderOpen, Plus, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import SampleBadge from '../components/ui/SampleBadge';
import { BackupBadge } from '../components/StatusPieces';
import { summarizeTasks } from '../../core/progressAnalyzer';
import { timeAgo } from '../../utils/time';

export default function Projects({ projects, navigate }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  }, [projects, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field w-full pl-8"
            placeholder="Search projects"
            aria-label="Search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate({ page: 'capture' })}>
          New
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No saved projects"
          description="Capture a conversation from claude.ai, or import a backup, and it shows up here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description={`Nothing named “${query}”.`} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const s = summarizeTasks(p.tasks);
            return (
              <li key={p.id}>
                <button
                  onClick={() => navigate({ page: 'project', id: p.id })}
                  className="card group w-full space-y-2.5 p-3 text-left transition-colors hover:border-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                    {p.isSample && <SampleBadge />}
                    <ChevronRight size={14} className="text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <ProgressBar value={s.percent} label={`${p.name} progress`} />
                  <div className="flex items-center justify-between text-[12px] text-muted">
                    <span>Updated {timeAgo(p.updatedAt)}</span>
                    <BackupBadge status={p.backupStatus} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
