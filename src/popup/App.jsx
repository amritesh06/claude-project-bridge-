import { useState } from 'react';
import Shell from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import CapturePage from './pages/CapturePage';
import BackupCenter from './pages/BackupCenter';
import SettingsPage from './pages/SettingsPage';
import useClaudeStatus from './hooks/useClaudeStatus';
import useProjectStore from './hooks/useProjectStore';
import { useSettings } from './context/SettingsContext';

export default function App() {
  const [route, setRoute] = useState({ page: 'dashboard' });
  const claude = useClaudeStatus();
  const { settings, update } = useSettings();
  const { projects, history, addCapture, updateTaskStatus, clearAll } = useProjectStore({ showSamples: settings.showSamples });

  // "Current" = the project that owns the open tab, else the most recently updated one.
  const fromTab =
    (claude.conversationId && projects.find((p) => p.conversations.some((c) => c.id === claude.conversationId))) ||
    (claude.projectId && projects.find((p) => p.claudeProjectId === claude.projectId)) ||
    null;
  const current = fromTab || [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  const activeNav = route.page === 'project' || route.page === 'capture' ? 'projects' : route.page;

  let view;
  switch (route.page) {
    case 'projects':
      view = <Projects projects={projects} navigate={setRoute} />;
      break;
    case 'project':
      view = (
        <ProjectDetails
          key={route.id}
          project={projects.find((p) => p.id === route.id)}
          initialTab={route.tab}
          onBack={() => setRoute({ page: 'projects' })}
          onTaskStatus={updateTaskStatus}
        />
      );
      break;
    case 'capture':
      view = <CapturePage claude={claude} projects={projects} onSave={addCapture} navigate={setRoute} />;
      break;
    case 'backup':
      view = <BackupCenter project={current} history={history} />;
      break;
    case 'settings':
      view = (
        <SettingsPage
          onClearAll={() => {
            clearAll();
            update({ showSamples: false });
          }}
        />
      );
      break;
    default:
      view = <Dashboard project={current} claude={claude} navigate={setRoute} />;
  }

  return (
    <Shell claude={claude} active={activeNav} onNavigate={setRoute}>
      {view}
    </Shell>
  );
}
