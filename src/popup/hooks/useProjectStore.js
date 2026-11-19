import { useCallback, useEffect, useRef, useState } from 'react';
import { SAMPLE_PROJECTS } from '../data/sample';
import { loadProjects, saveProjects } from '../../storage/interim';
import { mergeCapture } from '../../core/captureMerge';
import { analyzeProject } from '../../core/projectAnalyzer';
import { fileId } from '../../core/fileTracker';
import { useToast } from '../context/ToastContext';

// Real projects persist via storage/interim.js (replaced by IndexedDB in Phase 5).
// Sample projects live in memory and are shown only while there are no real projects.

const rid = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export default function useProjectStore({ showSamples }) {
  const toast = useToast();
  const [real, setReal] = useState([]);
  const [samples, setSamples] = useState(SAMPLE_PROJECTS);
  const realRef = useRef([]);

  useEffect(() => {
    loadProjects().then((list) => {
      realRef.current = list;
      setReal(list);
    });
  }, []);

  const commit = useCallback(
    (next) => {
      realRef.current = next;
      setReal(next);
      saveProjects(next).then((ok) => {
        if (!ok) toast.error('Could not save to local storage. Your browser may be out of space.');
      });
    },
    [toast],
  );

  // Applies fn to one REAL project. Returns false for unknown ids (e.g. sample projects).
  // An edit after the last export makes that export outdated.
  const mutate = useCallback(
    (id, fn, { touch = true } = {}) => {
      const list = realRef.current;
      if (!list.some((p) => p.id === id)) return false;
      commit(
        list.map((p) => {
          if (p.id !== id) return p;
          const next = fn(p);
          return touch ? { ...next, updatedAt: Date.now(), backupStatus: next.lastBackupAt ? 'stale' : 'none' } : next;
        }),
      );
      return true;
    },
    [commit],
  );

  const markExported = useCallback(
    (id, size) =>
      mutate(
        id,
        (p) => ({ ...p, lastBackupAt: Date.now(), backupStatus: 'current', backupHistory: [{ at: Date.now(), size }, ...(p.backupHistory || [])].slice(0, 10) }),
        { touch: false },
      ),
    [mutate],
  );

  // Saves a project that came from an imported backup as a NEW project.
  const addImported = useCallback(
    (project) => {
      const taken = new Set(realRef.current.map((p) => p.name.toLowerCase()));
      const saved = taken.has(project.name.toLowerCase()) ? { ...project, name: `${project.name} (imported)` } : project;
      commit([saved, ...realRef.current]);
      return saved.id;
    },
    [commit],
  );

  const addCapture = useCallback(
    (capture, target) => {
      const merged = mergeCapture(realRef.current, capture, target);
      let projects = merged.projects;
      let summary = null;
      try {
        projects = projects.map((p) => (p.id === merged.projectId ? analyzeProject(p) : p));
        const done = projects.find((p) => p.id === merged.projectId);
        summary = { files: done.files.length, tasks: done.tasks.length };
      } catch (err) {
        console.error('[CPB] Analysis failed', err);
        toast.error('Saved, but analysing the conversation failed. Try Re-analyze.');
      }
      commit(projects);
      return { projectId: merged.projectId, replacedConversation: merged.replacedConversation, summary };
    },
    [commit, toast],
  );

  const reanalyze = useCallback(
    (id) => {
      try {
        mutate(id, analyzeProject);
        return true;
      } catch (err) {
        console.error('[CPB] Analysis failed', err);
        toast.error('Analysis failed. Your data was not changed.');
        return false;
      }
    },
    [mutate, toast],
  );

  const updateProject = useCallback(
    (id, patch) => mutate(id, (p) => ({ ...p, ...patch, overrides: { ...p.overrides, ...(patch.overrides || {}) } })),
    [mutate],
  );

  /* ----- tasks ----- */
  const updateTaskStatus = useCallback(
    (projectId, taskId, status) => {
      const patch = (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status, userEdited: true } : t)) });
      if (!mutate(projectId, patch)) {
        setSamples((all) => all.map((p) => (p.id === projectId ? { ...patch(p), updatedAt: Date.now() } : p)));
      }
    },
    [mutate],
  );

  const addTask = useCallback(
    (projectId, title) =>
      mutate(projectId, (p) => ({ ...p, tasks: [...p.tasks, { id: rid(), title: title.trim(), status: 'pending', origin: 'manual', userEdited: true }] })),
    [mutate],
  );

  const deleteTask = useCallback(
    (projectId, taskId) =>
      mutate(projectId, (p) => {
        const task = p.tasks.find((t) => t.id === taskId);
        const dismissed = task && task.origin !== 'manual' ? [...(p.dismissedTaskIds || []), taskId] : p.dismissedTaskIds || [];
        return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), dismissedTaskIds: dismissed };
      }),
    [mutate],
  );

  /* ----- files ----- */
  const updateFile = useCallback(
    (projectId, id, patch) =>
      mutate(projectId, (p) => ({ ...p, files: p.files.map((f) => (f.id === id ? { ...f, ...patch, userEdited: true } : f)) })),
    [mutate],
  );

  const addFile = useCallback(
    (projectId, { path, content, size, note }) =>
      mutate(projectId, (p) => {
        const record = {
          id: fileId(path),
          path,
          status: 'created',
          evidence: 'manual',
          confirmed: true,
          origin: 'manual',
          userEdited: true,
          mentions: 0,
          sources: [],
          latestCode: null,
          content,
          size,
          note: note || '',
          addedAt: Date.now(),
        };
        const prev = p.files.find((f) => f.path === path);
        return { ...p, files: [...p.files.filter((f) => f.path !== path), { ...record, latestCode: prev?.latestCode || null }] };
      }),
    [mutate],
  );

  const deleteFile = useCallback(
    (projectId, id) =>
      mutate(projectId, (p) => {
        const file = p.files.find((f) => f.id === id);
        const dismissed = file && file.origin !== 'manual' ? [...(p.dismissedFilePaths || []), file.path] : p.dismissedFilePaths || [];
        return { ...p, files: p.files.filter((f) => f.id !== id), dismissedFilePaths: dismissed };
      }),
    [mutate],
  );

  /* ----- context notes ----- */
  const setContextNote = useCallback(
    (projectId, sectionId, text) =>
      mutate(projectId, (p) => {
        const notes = { ...(p.overrides?.contextNotes || {}) };
        if (text && text.trim()) notes[sectionId] = text.trim();
        else delete notes[sectionId];
        return { ...p, overrides: { ...p.overrides, contextNotes: notes } };
      }),
    [mutate],
  );

  const clearAll = useCallback(() => {
    commit([]);
    setSamples([]);
  }, [commit]);

  const hasReal = real.length > 0;
  const projects = hasReal ? real : showSamples ? samples : [];

  const actions = {
    updateProject, updateTaskStatus, addTask, deleteTask, updateFile, addFile, deleteFile, setContextNote, reanalyze,
  };

  return { projects, hasReal, addCapture, addImported, clearAll, actions: { ...actions, markExported } };
}
