// Derives a file list from captured conversations.
//
// Principle: a file being DISCUSSED is not evidence that it EXISTS. Each file gets
//   status   what the conversation indicates: created | modified | deleted | pending | unavailable
//   evidence how strong that is: codeblock | mentioned  (attachment / manual come from the user)
//   confirmed true only when the user confirmed it, uploaded it, or an attachment was captured
// "unavailable" means "referenced but no content was ever provided".

const EXT =
  'js|jsx|mjs|cjs|ts|tsx|json|md|mdx|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|html|css|scss|sass|less|vue|svelte|sql|prisma|yml|yaml|toml|ini|env|sh|bash|zsh|ps1|bat|xml|txt|csv|lock|gradle|dart|lua|ex|exs|astro|graphql|gql|proto|tf';

const PATH_SRC = String.raw`(?:\.{0,2}/)?(?:[\w.-]+/)*(?:[\w-]+(?:\.[\w-]+)*\.(?:${EXT})|Dockerfile|Makefile|Procfile|\.env(?:\.[\w-]+)?|\.gitignore)`;
const FIND_RE = () => new RegExp(String.raw`(?<![\w@/.:-])(${PATH_SRC})(?![\w(/])`, 'g');
const FULL_RE = new RegExp(`^${PATH_SRC}$`);

// Technology names that look like filenames.
const NOT_FILES = /^(node|next|vue|express|react|nuxt|d3|three|chart|socket|alpine|ember|backbone|angular|p5|anime|mocha|chai|knockout|require|ajax|moment|lodash|underscore|meteor|nest|deno|bun)\.(js|io)$/i;

const SHELLISH = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'terminal', 'powershell', 'cmd', 'text', 'txt', 'plaintext', 'output', 'log']);

const MODIFY_CUE = /\b(updat|modif|chang|edit|replac|refactor|fix|patch|revis|rewrit|adjust|tweak)\w*/i;
const CREATE_CUE = /\b(creat|new file|add(?:ed|ing)? a new|add (?:this|the following|a)\b|here(?:'s| is) (?:the )?(?:new )?(?:file|code))/i;
const PENDING_LINE = /\b(will (?:need|create|add)|need(?:s)? to|still need|we'?ll (?:need|create|add)|should (?:create|add)|to-?do|next step|later|not yet|haven'?t (?:created|written)|upcoming|pending)\b/i;
const PENDING_HEAD = /(next steps?|to-?do|remaining|still (?:to do|needed)|pending|upcoming|left to do)/i;
const MAX_CODE = 100_000;

export const normalizePath = (p) => p.replace(/^\.\//, '').replace(/\/+/g, '/');

export function findPaths(line) {
  const out = [];
  for (const m of line.matchAll(FIND_RE())) {
    const p = normalizePath(m[1]);
    if (!NOT_FILES.test(p.split('/').pop())) out.push({ path: p, index: m.index, end: m.index + m[0].length });
  }
  return out;
}

const isPath = (s) => FULL_RE.test(s) && !NOT_FILES.test(s.split('/').pop());

function pathForCodeBlock(block, prevBlock) {
  // 1. A leading comment such as "// src/app.js" or "# file: app.py"
  const first = (block.content.split('\n', 1)[0] || '').trim();
  const m = first.match(/^(?:\/\/|#|--|\/\*+|<!--|;)\s*(?:file(?:name)?\s*:\s*|path\s*:\s*)?(\S+?)\s*(?:\*\/|-->)?$/i);
  if (m && isPath(m[1])) return { path: normalizePath(m[1]), cueText: '' };

  // 2. The line of prose right before the block, e.g. "Create `src/app.js`:"
  if (SHELLISH.has((block.lang || '').toLowerCase())) return null;
  if (!prevBlock || prevBlock.type !== 'text') return null;
  const line = prevBlock.content.trim().split('\n').pop().trim();
  if (!line || line.length > 200) return null;
  const found = findPaths(line);
  if (!found.length) return null;
  const last = found[found.length - 1];
  const tail = line.slice(last.end).replace(/[`*_)\s]/g, '');
  if (tail && !/^[:.]$/.test(tail)) return null; // path must be what the line is about
  return { path: last.path, cueText: line };
}

const cueOf = (text) => (MODIFY_CUE.test(text) ? 'modify' : CREATE_CUE.test(text) ? 'create' : null);

function classifyMention(line, f, inPendingSection) {
  const before = line.slice(Math.max(0, f.index - 40), f.index);
  const after = line.slice(f.end, f.end + 30);
  if (/\b(delete|remove|rm|drop)\s+(?:the\s+|old\s+|unused\s+|obsolete\s+)?(?:file\s+)?[`*]*$/i.test(before)) return 'delete';
  if (/^[`*]*\s*(?:has been|was|is|can be|should be)\s+(?:deleted|removed)/i.test(after)) return 'delete';
  if (inPendingSection || PENDING_LINE.test(line)) return 'pending';
  return 'mention';
}

function collectEvents(conversations) {
  const map = new Map();
  let seq = 0; // global order, so events stay chronological after bare names are merged
  const push = (path, ev) => {
    if (!map.has(path)) map.set(path, []);
    map.get(path).push({ ...ev, seq: seq++ });
  };

  for (const conv of conversations) {
    for (const msg of conv.messages || []) {
      const blocks = msg.blocks || [];
      const where = { conversationId: conv.id, messageId: msg.id };
      let pendingSection = false;

      blocks.forEach((b, i) => {
        if (b.type === 'code') {
          const hit = pathForCodeBlock(b, blocks[i - 1]);
          if (hit) {
            push(hit.path, { kind: 'code', cue: cueOf(hit.cueText), block: { lang: b.lang || '', content: b.content.slice(0, MAX_CODE) }, ...where });
          }
          return;
        }
        for (const line of b.content.split('\n')) {
          const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/) || line.match(/^\s*\*\*(.+?)\*\*:?\s*$/);
          if (heading) pendingSection = PENDING_HEAD.test(heading[1]);
          for (const f of findPaths(line)) push(f.path, { kind: classifyMention(line, f, pendingSection), ...where });
        }
      });
    }
  }
  return map;
}

// Merge a bare filename ("app.js") into the single full path that ends with it ("src/app.js").
function mergeBareNames(map) {
  for (const key of [...map.keys()]) {
    if (key.includes('/')) continue;
    const targets = [...map.keys()].filter((k) => k !== key && k.endsWith(`/${key}`));
    if (targets.length === 1) {
      map.set(targets[0], [...map.get(targets[0]), ...map.get(key)].sort((a, b) => a.seq - b.seq));
      map.delete(key);
    }
  }
}

function resolve(events) {
  let status = null;
  let everCode = false;
  let latest = null;
  for (const e of events) {
    if (e.kind === 'code') {
      if (!everCode || status === 'deleted') status = e.cue === 'modify' && status !== 'deleted' ? 'modified' : 'created';
      else status = 'modified';
      everCode = true;
      latest = e;
    } else if (e.kind === 'delete') {
      status = 'deleted';
    } else if (e.kind === 'pending') {
      if (status === null || status === 'unavailable') status = 'pending';
    } else if (e.kind === 'mention') {
      if (status === null) status = 'unavailable';
    }
  }
  return { status, evidence: everCode ? 'codeblock' : 'mentioned', latest };
}

/** @param conversations oldest first */
export function trackFiles(conversations) {
  const map = collectEvents(conversations);
  mergeBareNames(map);
  return [...map.entries()]
    .map(([path, events]) => {
      const { status, evidence, latest } = resolve(events);
      const sources = [];
      for (const e of events) {
        if (sources.length < 3 && !sources.some((s) => s.conversationId === e.conversationId && s.messageId === e.messageId)) {
          sources.push({ conversationId: e.conversationId, messageId: e.messageId });
        }
      }
      return { path, status, evidence, mentions: events.length, sources, latestCode: latest ? latest.block : null };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

const idFor = (path) => `file-${[...path].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 5381).toString(36)}`;
export const fileId = idFor;

/**
 * Merges freshly derived files into the saved list without losing user decisions.
 * Manual or user-edited files keep their status and confirmation. Derived files that
 * disappear from the conversations are dropped.
 */
export function mergeFiles(existing = [], derived = [], dismissedPaths = []) {
  const dismissed = new Set(dismissedPaths);
  const byPath = new Map(existing.map((f) => [f.path, f]));
  const out = [];
  for (const d of derived) {
    if (dismissed.has(d.path)) continue;
    const ex = byPath.get(d.path);
    byPath.delete(d.path);
    if (!ex) {
      out.push({ id: idFor(d.path), origin: 'derived', userEdited: false, confirmed: false, ...d });
    } else if (ex.origin === 'manual' || ex.userEdited) {
      out.push({ ...ex, mentions: d.mentions, sources: d.sources, latestCode: d.latestCode || ex.latestCode || null });
    } else {
      out.push({ ...ex, ...d, id: ex.id });
    }
  }
  for (const ex of byPath.values()) if (ex.origin === 'manual' || ex.userEdited) out.push(ex);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
