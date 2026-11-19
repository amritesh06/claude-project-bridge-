import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import SampleBadge from '../components/ui/SampleBadge';
import { BackupBadge } from '../components/StatusPieces';
import OverviewTab from './project/OverviewTab';
import ConversationsTab from './project/ConversationsTab';
import FilesTab from './project/FilesTab';
import TasksTab from './project/TasksTab';
import ContextTab from './project/ContextTab';

export default function ProjectDetails({ project, initialTab = 'overview', onBack, actions }) {
  const [tab, setTab] = useState(initialTab);

  if (!project) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack}>Projects</Button>
        <EmptyState title="Project not found" description="It may have been deleted." />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversations', label: 'Chats', count: project.conversations.length },
    { id: 'files', label: 'Files', count: project.files.length },
    { id: 'tasks', label: 'Tasks', count: project.tasks.length },
    { id: 'context', label: 'Context' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack} aria-label="Back to projects" className="-ml-2 !px-1.5" />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{project.name}</h2>
        {project.isSample && <SampleBadge />}
        <BackupBadge status={project.backupStatus} />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab project={project} actions={actions} />}
        {tab === 'conversations' && <ConversationsTab project={project} />}
        {tab === 'files' && <FilesTab project={project} actions={actions} />}
        {tab === 'tasks' && <TasksTab project={project} actions={actions} />}
        {tab === 'context' && <ContextTab project={project} actions={actions} />}
      </div>
    </div>
  );
}
