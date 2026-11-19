// Builds the project context from what was captured. Everything here is derived from
// conversation text with fixed rules (no AI, no guessing). Fields that can't be derived
// are left empty so the user can fill them in; they are never invented.

import { summarizeTasks } from './progressAnalyzer.js';

/* ---------- technology detection ---------- */

const T = (name, re, extra = {}) => ({ name, re, ...extra });
const TECH = [
  T('JavaScript', /\bJavaScript\b/g, { exts: ['js', 'jsx', 'mjs', 'cjs'] }),
  T('TypeScript', /\bTypeScript\b/g, { exts: ['ts', 'tsx'] }),
  T('Python', /\bPython\b/g, { exts: ['py'] }),
  T('Go', /\bgolang\b|\bGo (?:modules?|routines?|1\.\d+)\b/g, { exts: ['go'] }),
  T('Rust', /\bRust\b/g, { exts: ['rs'] }),
  T('Java', /\bJava\b(?!Script)/g, { exts: ['java'] }),
  T('Kotlin', /\bKotlin\b/g, { exts: ['kt'] }),
  T('Swift', /\bSwift(?:UI)?\b/g, { exts: ['swift'] }),
  T('C#', /\bC#|\.NET\b/g, { exts: ['cs'] }),
  T('PHP', /\bPHP\b/g, { exts: ['php'] }),
  T('Ruby', /\bRuby\b/g, { exts: ['rb'] }),
  T('Node.js', /\bNode\.js\b/g, { files: ['package.json'] }),
  T('React', /\bReact(?:\.js)?\b/g, { pkgs: ['react'] }),
  T('Next.js', /\bNext\.js\b/g, { pkgs: ['next'] }),
  T('Vue', /\bVue(?:\.js)?\b/g, { exts: ['vue'], pkgs: ['vue'] }),
  T('Svelte', /\bSvelte(?:Kit)?\b/g, { exts: ['svelte'], pkgs: ['svelte'] }),
  T('Angular', /\bAngular\b/g, { pkgs: ['@angular/core'] }),
  T('Express', /\bExpress(?:\.js)?\b/g, { pkgs: ['express'] }),
  T('Fastify', /\bFastify\b/g, { pkgs: ['fastify'] }),
  T('NestJS', /\bNest(?:JS|\.js)\b/g, { pkgs: ['@nestjs/core'] }),
  T('Django', /\bDjango\b/g, { pkgs: ['django'] }),
  T('Flask', /\bFlask\b/g, { pkgs: ['flask'] }),
  T('FastAPI', /\bFastAPI\b/g, { pkgs: ['fastapi'] }),
  T('Ruby on Rails', /\bRails\b/g),
  T('Laravel', /\bLaravel\b/g),
  T('Spring Boot', /\bSpring Boot\b/g),
  T('PostgreSQL', /\bPostgres(?:QL)?\b/g),
  T('MySQL', /\bMySQL\b/g),
  T('SQLite', /\bSQLite\b/g),
  T('MongoDB', /\bMongo(?:DB)?\b/g, { pkgs: ['mongodb', 'mongoose'] }),
  T('Redis', /\bRedis\b/g, { pkgs: ['redis', 'ioredis'] }),
  T('Prisma', /\bPrisma\b/g, { exts: ['prisma'], pkgs: ['@prisma/client'] }),
  T('Drizzle', /\bDrizzle\b/g, { pkgs: ['drizzle-orm'] }),
  T('Supabase', /\bSupabase\b/g, { pkgs: ['@supabase/supabase-js'] }),
  T('Firebase', /\bFirebase\b/g, { pkgs: ['firebase'] }),
  T('Tailwind CSS', /\bTailwind(?: CSS)?\b/g, { pkgs: ['tailwindcss'] }),
  T('Vite', /\bVite\b/g, { pkgs: ['vite'] }),
  T('Webpack', /\bWebpack\b/gi, { pkgs: ['webpack'] }),
  T('Docker', /\bDocker(?:file)?\b/g, { files: ['Dockerfile'] }),
  T('Vitest', /\bVitest\b/g, { pkgs: ['vitest'] }),
  T('Jest', /\bJest\b/g, { pkgs: ['jest'] }),
  T('Playwright', /\bPlaywright\b/g, { pkgs: ['@playwright/test', 'playwright'] }),
  T('Pytest', /\bpytest\b/gi, { pkgs: ['pytest'] }),
  T('ESLint', /\bESLint\b/g, { pkgs: ['eslint'] }),
  T('GraphQL', /\bGraphQL\b/g, { exts: ['graphql', 'gql'] }),
  T('tRPC', /\btRPC\b/g, { pkgs: ['@trpc/server'] }),
  T('Chrome Extension (MV3)', /\bManifest V3\b|\bchrome\.(?:storage|runtime|tabs)\b/g),
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const pkgRegex = (pkg) => new RegExp(String.raw`(?:from\s+|require\(\s*|import\s+)['"]${esc(pkg)}(?:/[^'"]*)?['"]|["']${esc(pkg)}["']\s*:|^\s*(?:from|import)\s+${esc(pkg)}\b`, 'm');

function corpus(conversations) {
  const text = [];
  const code = [];
  for (const c of conversations) {
    for (const m of c.messages || []) {
      for (const b of m.blocks || []) (b.type === 'code' ? code : text).push(b.content);
    }
  }
  return { text: text.join('\n'), code: code.join('\n') };
}

export function detectStack(conversations, files = []) {
  const { text, code } = corpus(conversations);
  const present = files.filter((f) => f.evidence !== 'mentioned' && f.status !== 'deleted');
  const exts = new Set(present.map((f) => f.path.split('.').pop()));
  const names = new Set(present.map((f) => f.path.split('/').pop()));

  const found = [];
  for (const t of TECH) {
    const mentions = (text.match(t.re) || []).length + (code.match(t.re) || []).length;
    const via = [];
    if (mentions >= 2) via.push('mentions');
    if (t.exts && t.exts.some((e) => exts.has(e))) via.push('files');
    if (t.files && t.files.some((f) => names.has(f))) via.push('files');
    if (t.pkgs && t.pkgs.some((p) => pkgRegex(p).test(code))) via.push('imports');
    if (via.length) found.push({ name: t.name, mentions, via });
  }
  return found.sort((a, b) => b.via.length - a.via.length || b.mentions - a.mentions).slice(0, 15);
}

/* ---------- snippets from conversations ---------- */

const textOf = (msg) => (msg.blocks || []).filter((b) => b.type === 'text').map((b) => b.content).join('\n\n');
const clip = (s, n) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t;
};
const chronological = (project) =>
  [...project.conversations].sort((a, b) => (a.capturedAt || a.updatedAt || 0) - (b.capturedAt || b.updatedAt || 0));

export function openingRequests(project) {
  return chronological(project)
    .map((c) => {
      const first = (c.messages || []).find((m) => m.role === 'user');
      return first ? { conversationId: c.id, title: c.title, text: clip(textOf(first), 240) } : null;
    })
    .filter((r) => r && r.text);
}

const DECISION_RE = /\b(?:we (?:decided|chose|went with|settled on)|i(?:'d| would) recommend|recommended approach|instead of|rather than|trade-?off|the reason (?:we|for))\b/i;

export function findDecisions(project, max = 10) {
  const out = [];
  for (const c of chronological(project)) {
    for (const m of c.messages || []) {
      if (m.role !== 'assistant') continue;
      for (const b of m.blocks || []) {
        if (b.type !== 'text') continue;
        for (const raw of b.content.split('\n')) {
          if (/^\s*#{1,6}\s/.test(raw)) continue; // headings are labels, not decisions
          const line = raw.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '');
          for (const sentence of line.split(/(?<=[.!?])\s+/)) {
            if (sentence.length > 25 && sentence.length < 280 && DECISION_RE.test(sentence)) {
              out.push({ text: clip(sentence.replace(/[`*]/g, ''), 220), conversationId: c.id });
            }
          }
        }
      }
    }
  }
  return out.slice(-max);
}

export function deriveLastWorkingPoint(project) {
  const latest = [...project.conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!latest || !latest.messages?.length) return '';
  const msgs = latest.messages;
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
  const lastAsst = [...msgs].reverse().find((m) => m.role === 'assistant');
  const parts = [];
  if (lastUser) parts.push(`Your last message: “${clip(textOf(lastUser), 180)}”`);
  if (lastAsst) {
    const blocks = lastAsst.blocks || [];
    const tail = blocks[blocks.length - 1];
    if (tail && tail.type === 'code') {
      // The reply ends with code: quoting the label line before it would be misleading.
      const intro = [...blocks].reverse().find((b) => b.type === 'text');
      const label = intro ? intro.content.trim().split('\n').pop() : '';
      parts.push(`Claude's last reply ended with a ${tail.lang || 'code'} code block${label ? ` (introduced by “${clip(label, 120)}”)` : ''}.`);
    } else {
      const paras = textOf(lastAsst).split(/\n{2,}/).filter(Boolean);
      if (paras.length) parts.push(`Claude's last reply ended with: “${clip(paras[paras.length - 1], 200)}”`);
    }
  }
  if (msgs[msgs.length - 1].role === 'user') parts.push('Claude had not replied to that message yet.');
  return parts.join(' ');
}

/** Everything expensive, computed once per analysis run and stored on the project. */
export function buildAnalysis(project) {
  return {
    version: 1,
    generatedAt: Date.now(),
    stack: detectStack(project.conversations, project.files),
    lastWorkingPoint: deriveLastWorkingPoint(project),
    openingRequests: openingRequests(project),
    decisions: findDecisions(project),
  };
}

/* ---------- user-adjusted views ---------- */

/** Detected + user-added technologies, minus any the user removed. */
export function effectiveStack(project) {
  const removed = new Set(project.overrides?.removedStack || []);
  const derived = (project.analysis?.stack || []).map((t) => t.name);
  return [...new Set([...(project.overrides?.stack || []), ...derived, ...(project.stack || [])])].filter((n) => !removed.has(n));
}

/* ---------- sections ---------- */

export const SECTION_IDS = [
  'overview', 'objectives', 'stack', 'architecture', 'features', 'files-created',
  'files-modified', 'pending', 'bugs', 'decisions', 'status', 'next-steps',
];

const isConfirmed = (f) => !!f.confirmed || f.evidence === 'attachment' || f.evidence === 'manual';

function fileTree(files) {
  const shown = files.filter((f) => f.status !== 'deleted');
  const root = {};
  for (const f of shown) {
    const parts = f.path.split('/');
    let node = root;
    parts.forEach((part, i) => {
      node[part] = node[part] || { children: {}, file: null };
      if (i === parts.length - 1) node[part].file = f;
      node = node[part].children;
    });
  }
  const lines = [];
  const walk = (node, depth) => {
    for (const name of Object.keys(node).sort((a, b) => Object.keys(node[b].children).length - Object.keys(node[a].children).length || a.localeCompare(b))) {
      const entry = node[name];
      const isDir = Object.keys(entry.children).length > 0;
      const tag = entry.file ? (isConfirmed(entry.file) ? '' : entry.file.status === 'pending' ? '  (pending)' : entry.file.evidence === 'mentioned' ? '  (mentioned only)' : '  (unconfirmed)') : '';
      lines.push(`${'  '.repeat(depth)}${name}${isDir ? '/' : ''}${tag}`);
      walk(entry.children, depth + 1);
    }
  };
  walk(root, 0);
  return lines.slice(0, 60).concat(lines.length > 60 ? [`… ${lines.length - 60} more`] : []);
}

const empty = (id, title, note) => ({ id, title, empty: true, text: note || 'Nothing detected yet.', source: 'empty' });
const section = (id, title, body, extra = {}) => ({ id, title, source: 'derived', ...body, ...extra });
const list = (arr) => (arr.length ? { groups: [{ items: arr }] } : null);

/** Derived sections, computed on the fly from the saved project so task/file edits show immediately. */
export function buildSections(project) {
  const a = project.analysis || {};
  const files = project.files || [];
  const tasks = project.tasks || [];
  const by = (s) => tasks.filter((t) => t.status === s).map((t) => t.title);
  const s = summarizeTasks(tasks);

  const created = files.filter((f) => f.status === 'created');
  const modified = files.filter((f) => f.status === 'modified');
  const group = (arr) => {
    const groups = [];
    const yes = arr.filter(isConfirmed).map((f) => f.path);
    const maybe = arr.filter((f) => !isConfirmed(f)).map((f) => f.path);
    if (yes.length) groups.push({ label: 'Confirmed', items: yes });
    if (maybe.length) groups.push({ label: 'Indicated by the conversation, not confirmed', items: maybe });
    return groups;
  };

  const out = [];

  const desc = project.description || (a.openingRequests?.[0] ? `Opening request: “${a.openingRequests[0].text}”` : '');
  out.push(desc ? section('overview', 'Project overview', { text: desc }) : empty('overview', 'Project overview'));

  out.push(
    a.openingRequests?.length
      ? section('objectives', 'Project objectives', { groups: [{ label: 'First request in each conversation', items: a.openingRequests.map((r) => `${r.text}`) }] }, { note: 'These are your own opening requests. Edit to state the objectives in your words.' })
      : empty('objectives', 'Project objectives'),
  );

  const stack = effectiveStack(project);
  out.push(stack.length ? section('stack', 'Technology stack', { groups: [{ items: stack }] }, { note: 'Detected from repeated mentions, file types and imports.' }) : empty('stack', 'Technology stack'));

  const tree = fileTree(files);
  out.push(
    tree.length
      ? section('architecture', 'Project architecture', { text: tree.join('\n'), mono: true }, { note: 'File layout reconstructed from paths in the conversations. Edit to describe the architecture itself.' })
      : empty('architecture', 'Project architecture'),
  );

  const done = by('completed');
  out.push(done.length ? section('features', 'Features implemented', list(done)) : empty('features', 'Features implemented', 'None identified. Mark tasks as completed in the Tasks tab.'));

  const cg = group(created);
  out.push(cg.length ? section('files-created', 'Files created', { groups: cg }) : empty('files-created', 'Files created'));
  const mg = group(modified);
  out.push(mg.length ? section('files-modified', 'Files modified', { groups: mg }) : empty('files-modified', 'Files modified'));

  const pendingItems = [...by('pending'), ...files.filter((f) => f.status === 'pending').map((f) => `File to create: ${f.path}`)];
  out.push(pendingItems.length ? section('pending', 'Pending features', list(pendingItems)) : empty('pending', 'Pending features'));

  const bugs = by('issue');
  out.push(bugs.length ? section('bugs', 'Known bugs and errors', list(bugs), { note: 'Reported in your messages. Mark them resolved in the Tasks tab.' }) : empty('bugs', 'Known bugs and errors'));

  out.push(
    a.decisions?.length
      ? section('decisions', 'Important technical decisions', list(a.decisions.map((d) => d.text)), { note: 'Sentences where Claude compared or recommended options. Review before relying on them.' })
      : empty('decisions', 'Important technical decisions'),
  );

  const lwp = project.overrides?.lastWorkingPoint || a.lastWorkingPoint || project.lastWorkingPoint || '';
  const statusText = [s.total ? `${s.completed} of ${s.total} tasks completed (${s.percent}%), ${s.working} in progress, ${s.pending} pending, ${s.issue} known ${s.issue === 1 ? 'issue' : 'issues'}.` : '', lwp].filter(Boolean).join('\n\n');
  out.push(statusText ? section('status', 'Current development status', { text: statusText }) : empty('status', 'Current development status'));

  const next = [...by('working'), ...by('pending')].slice(0, 10);
  out.push(next.length ? section('next-steps', 'Next steps', list(next)) : empty('next-steps', 'Next steps'));

  return out;
}
