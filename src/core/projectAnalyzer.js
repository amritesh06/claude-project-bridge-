import { extractTasks, mergeTasks } from './progressAnalyzer.js';
import { mergeFiles, trackFiles } from './fileTracker.js';
import { buildAnalysis } from './contextBuilder.js';

/**
 * Re-derives files, tasks and analysis for a REAL project from its conversations.
 * User decisions (edited statuses, confirmed files, manual items, dismissed suggestions)
 * are preserved. Conversations are processed oldest first, by capture time.
 */
export function analyzeProject(project) {
  const convs = [...project.conversations].sort((a, b) => (a.capturedAt || a.updatedAt || 0) - (b.capturedAt || b.updatedAt || 0));
  const files = mergeFiles(project.files, trackFiles(convs), project.dismissedFilePaths);
  const tasks = mergeTasks(project.tasks, extractTasks(convs), project.dismissedTaskIds);
  const next = { ...project, files, tasks };
  return { ...next, analysis: buildAnalysis(next) };
}
