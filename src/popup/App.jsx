import { useState } from 'react';
import Shell from './components/layout/Shell';
import Home from './pages/Home';
import ImportPage from './pages/ImportPage';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import CapturePage from './pages/CapturePage';
import SettingsPage from './pages/SettingsPage';
import useClaudeStatus from './hooks/useClaudeStatus';
import useProjectStore from './hooks/useProjectStore';
import { useSettings } from './context/SettingsContext';

export default function App() {
  const [route, setRoute] = useState({ page: 'home' });
  const [selectedId, setSelectedId] = useState(null);
  const claude = useClaudeStatus();
  const { settings, update } = useSettings();
  const { projects, addCapture, addImported, clearAll, actions } = useProjectStore({ showSamples: settings.showSamples });

  // The project to export: the one chosen by the user, else the one that owns the open claude.ai tab,
  // else the most recently updated one.
  const fromTab =
    (claude.conversationId && projects.find((p) => p.conversations.some((c) => c.id === claude.conversationId))) ||
    (claude.projectId && projects.find((p) => p.claudeProjectId === claude.projectId)) ||
    null;
  const current = projects.find((p) => p.id === selectedId) || fromTab || [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  const activeNav = ['project', 'capture'].includes(route.page) ? 'projects' : route.page === 'import' ? 'home' : route.page;

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
          actions={actions}
        />
      );
      break;
    case 'capture':
      view = <CapturePage claude={claude} projects={projects} onSave={addCapture} navigate={setRoute} />;
      break;
    case 'import':
      view = (
        <ImportPage
          data={route.data}
          onSave={(project) => {
            const id = addImported(project);
            setSelectedId(id);
            return id;
          }}
          navigate={setRoute}
        />
      );
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
      view = <Home projects={projects} project={current} onSelect={setSelectedId} claude={claude} navigate={setRoute} actions={actions} />;
  }

  return (
    <Shell claude={claude} active={activeNav} onNavigate={setRoute}>
      {view}
    </Shell>
  );
}
