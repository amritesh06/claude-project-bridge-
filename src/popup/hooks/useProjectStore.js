import { useCallback, useEffect, useRef, useState } from 'react';
import { SAMPLE_PROJECTS, SAMPLE_HISTORY } from '../data/sample';
import { loadProjects, saveProjects } from '../../storage/interim';
import { mergeCapture } from '../../core/captureMerge';
import { useToast } from '../context/ToastContext';

// Real projects persist via storage/interim.js (replaced by IndexedDB in Phase 5).
// Sample projects live in memory and are shown only while there are no real projects.

export default function useProjectStore({ showSamples }) {
  const toast = useToast();
  const [real, setReal] = useState([]);
  const [samples, setSamples] = useState(SAMPLE_PROJECTS);
  const [loaded, setLoaded] = useState(false);
  const realRef = useRef([]);

  useEffect(() => {
    loadProjects().then((list) => {
      realRef.current = list;
      setReal(list);
      setLoaded(true);
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

  const addCapture = useCallback(
    (capture, target) => {
      const { projects, projectId, replacedConversation } = mergeCapture(realRef.current, capture, target);
      commit(projects);
      return { projectId, replacedConversation };
    },
    [commit],
  );

  const updateTaskStatus = useCallback(
    (projectId, taskId, status) => {
      const patch = (p) =>
        p.id !== projectId
          ? p
          : { ...p, updatedAt: Date.now(), tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) };
      if (realRef.current.some((p) => p.id === projectId)) commit(realRef.current.map(patch));
      else setSamples((all) => all.map(patch));
    },
    [commit],
  );

  const clearAll = useCallback(() => {
    commit([]);
    setSamples([]);
  }, [commit]);

  const hasReal = real.length > 0;
  const projects = hasReal ? real : showSamples ? samples : [];
  const history = hasReal || !showSamples ? [] : SAMPLE_HISTORY;

  return { projects, history, loaded, hasReal, addCapture, updateTaskStatus, clearAll };
}
