export const TASK_STATUSES = ['completed', 'working', 'pending', 'issue'];

export const TASK_STATUS_LABEL = {
  completed: 'Completed',
  working: 'In progress',
  pending: 'Pending',
  issue: 'Known issue',
};

/** Counts tasks per status and computes a completion percentage. */
export function summarizeTasks(tasks = []) {
  const counts = { completed: 0, working: 0, pending: 0, issue: 0 };
  for (const t of tasks) if (counts[t.status] !== undefined) counts[t.status] += 1;
  const total = tasks.length;
  const percent = total ? Math.round((counts.completed / total) * 100) : 0;
  return { ...counts, total, percent };
}
