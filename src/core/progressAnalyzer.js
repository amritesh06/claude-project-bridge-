// Task tracking. Tasks are SUGGESTED from structure in the conversation (lists under
// headings like "Next steps" / "Completed", ✅ / ☐ markers, TODO lines, and error
// reports in your own messages). Nothing is inferred from prose alone. Users can edit
// every status, and edits are never overwritten by re-analysis.

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

/* ---------- similarity ---------- */

const STOP = new Set(
  'a an the to of and or for in on with from by is are be it this that we you i our your add added adding create created creating implement implemented implementing make made use using set up'.split(' '),
);
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);

export function tokens(title) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w))
      .map(stem),
  );
}

export function similar(a, b) {
  if (!a.size || !b.size) return false;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  if (Math.min(a.size, b.size) < 2) return inter === a.size && a.size === b.size;
  return inter / union >= 0.6;
}

export const taskId = (prefix, title) => {
  const key = [...tokens(title)].sort().join('-') || title.toLowerCase();
  return `${prefix}-${[...key].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 5381).toString(36)}`;
};

/* ---------- extraction ---------- */

const DONE_HEAD = /(completed|done|implemented|finished|what (?:we|i)(?:'ve| have)? (?:done|built|added)|summary of (?:changes|what)|changes made|accomplished)/i;
const TODO_HEAD = /(next steps?|to-?do|remaining|still (?:to do|needed|need)|pending|upcoming|left to do|future work|roadmap|not yet)/i;
const DOING_HEAD = /(in progress|currently|working on)/i;
const sectionFor = (t) => (DONE_HEAD.test(t) ? 'done' : TODO_HEAD.test(t) ? 'todo' : DOING_HEAD.test(t) ? 'doing' : null);

const DONE_MARK = /^(?:\[[xX]\]|✅|✔️?|☑️?)\s*/u;
const TODO_MARK = /^(?:\[ \]|⬜|☐|▢)\s*/u;
const DOING_MARK = /^(?:🚧|⏳|🔄|\[~\])\s*/u;
const ITEM = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;
const EMOJI_ITEM = /^\s*((?:✅|✔️?|☑️?|⬜|☐|▢|🚧|⏳|🔄).*)$/u;
const ERROR_RE = /\b(error|exception|traceback|failed|failing|doesn'?t work|not working|broken|crash(?:es|ed)?|bug|TypeError|ReferenceError|SyntaxError|cannot (?:find|read))\b/i;

function cleanTitle(s) {
  let t = s.replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim().replace(/[.:;,\s]+$/, '');
  if (t.length > 140) t = `${t.slice(0, 137).replace(/\s+\S*$/, '')}…`;
  return t;
}

function itemStatus(raw, section) {
  if (DONE_MARK.test(raw)) return 'completed';
  if (TODO_MARK.test(raw)) return 'pending';
  if (DOING_MARK.test(raw)) return 'working';
  if (/\((?:done|completed|finished)\)\s*$/i.test(raw)) return 'completed';
  if (/\((?:in progress|wip)\)\s*$/i.test(raw)) return 'working';
  return { done: 'completed', todo: 'pending', doing: 'working' }[section] || null;
}

function stripMark(raw) {
  return raw.replace(DONE_MARK, '').replace(TODO_MARK, '').replace(DOING_MARK, '');
}

/** @param conversations oldest first. Later messages override earlier ones for the same task. */
export function extractTasks(conversations, { maxTasks = 80 } = {}) {
  const tasks = []; // { id, title, status, tokens, source }
  const upsert = (prefix, title, status, source, note) => {
    const tk = tokens(title);
    if (!tk.size) return;
    const hit = tasks.find((t) => t.prefix === prefix && similar(t.tokens, tk));
    if (hit) {
      hit.status = status;
      hit.source = source;
    } else {
      tasks.push({ id: taskId(prefix, title), prefix, title, status, tokens: tk, source, note });
    }
  };

  for (const conv of conversations) {
    for (const msg of conv.messages || []) {
      const source = { conversationId: conv.id, messageId: msg.id };

      if (msg.role === 'user') {
        for (const b of msg.blocks || []) {
          if (b.type !== 'text' || !ERROR_RE.test(b.content.slice(0, 600))) continue;
          const line = b.content.split('\n').find((l) => l.trim());
          if (line) upsert('i', cleanTitle(line.slice(0, 160)), 'issue', source, 'Reported in your message. Check whether it has been resolved.');
        }
        continue;
      }
      if (msg.role !== 'assistant') continue;

      let section = null;
      let perMessage = 0;
      for (const b of msg.blocks || []) {
        if (b.type !== 'text') continue;
        for (const line of b.content.split('\n')) {
          const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/) || line.match(/^\s*\*\*(.+?)\*\*:?\s*$/) || line.match(/^\s*([A-Za-z][\w '’-]{2,40}):\s*$/);
          if (heading) {
            section = sectionFor(heading[1]);
            continue;
          }
          const todo = line.match(/^\s*(?:TODO|To-?do)\s*:\s*(.+)$/);
          if (todo) {
            upsert('t', cleanTitle(todo[1]), 'pending', source);
            continue;
          }
          const m = line.match(ITEM) || line.match(EMOJI_ITEM);
          if (!m || perMessage >= 12) continue;
          const raw = m[1];
          const status = itemStatus(raw, section);
          if (!status) continue;
          const title = cleanTitle(stripMark(raw));
          if (title.length < 6) continue;
          upsert('t', title, status, source);
          perMessage += 1;
        }
      }
    }
  }

  // Keep the most recent issues only; they pile up quickly.
  const issues = tasks.filter((t) => t.prefix === 'i').slice(-12);
  return [...tasks.filter((t) => t.prefix !== 'i'), ...issues]
    .slice(-maxTasks)
    .map(({ id, title, status, source, note }) => ({ id, title, status, source, ...(note ? { note } : {}) }));
}

/** Merge derived tasks into the saved list; user-edited and manual tasks always win. */
export function mergeTasks(existing = [], derived = [], dismissedIds = []) {
  const dismissed = new Set(dismissedIds);
  const byId = new Map(existing.map((t) => [t.id, t]));
  const out = [];
  for (const d of derived) {
    if (dismissed.has(d.id)) continue;
    const ex = byId.get(d.id);
    byId.delete(d.id);
    if (!ex) out.push({ origin: 'derived', userEdited: false, ...d });
    else if (ex.origin === 'manual' || ex.userEdited) out.push({ ...ex, source: d.source || ex.source });
    else out.push({ ...ex, ...d });
  }
  for (const ex of byId.values()) if (ex.origin === 'manual' || ex.userEdited) out.push(ex);
  return out;
}
