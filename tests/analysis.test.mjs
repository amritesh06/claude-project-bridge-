import test from 'node:test';
import assert from 'node:assert/strict';
import { findPaths, trackFiles, mergeFiles } from '../src/core/fileTracker.js';
import { extractTasks, mergeTasks, summarizeTasks } from '../src/core/progressAnalyzer.js';
import { detectStack } from '../src/core/contextBuilder.js';
import { analyzeProject } from '../src/core/projectAnalyzer.js';
import { getSections } from '../src/core/projectView.js';

let n = 0;
const T = (content) => ({ type: 'text', content });
const C = (content, lang = 'js') => ({ type: 'code', lang, content });
const msg = (role, ...blocks) => ({ id: `m${++n}`, role, blocks });
const conv = (id, ...messages) => ({ id, title: id, capturedAt: n, updatedAt: n, messages });
const byPath = (files, p) => files.find((f) => f.path === p);

/* ---------- path detection ---------- */

test('finds real paths and ignores URLs, method calls and tech names', () => {
  const paths = (s) => findPaths(s).map((f) => f.path);
  assert.deepEqual(paths('Edit `src/app.js` and ./config/db.json now'), ['src/app.js', 'config/db.json']);
  assert.deepEqual(paths('See https://example.com/docs/guide.md for details'), []);
  assert.deepEqual(paths('Call res.json(data) and use Node.js with Next.js'), []);
  assert.deepEqual(paths('Open package.json, Dockerfile and .env.local'), ['package.json', 'Dockerfile', '.env.local']);
});

/* ---------- file status: never assume a discussed file exists ---------- */

test('code under a "Create <path>" line is created but NOT confirmed', () => {
  const files = trackFiles([conv('c1', msg('assistant', T('Create `src/utils/cursor.js`:'), C('export const a = 1;')))]);
  const f = byPath(files, 'src/utils/cursor.js');
  assert.equal(f.status, 'created');
  assert.equal(f.evidence, 'codeblock');
  assert.equal(f.latestCode.content, 'export const a = 1;');
});

test('a later code block for the same file means modified', () => {
  const files = trackFiles([
    conv('c1', msg('assistant', T('Create `src/app.js`:'), C('v1')), msg('user', T('thanks')), msg('assistant', T('Update `src/app.js`:'), C('v2'))),
  ]);
  const f = byPath(files, 'src/app.js');
  assert.equal(f.status, 'modified');
  assert.equal(f.latestCode.content, 'v2');
});

test('a file that is only mentioned is "unavailable", never created', () => {
  const files = trackFiles([conv('c1', msg('user', T('It calls `src/services/stockService.js` which I have locally.')))]);
  const f = byPath(files, 'src/services/stockService.js');
  assert.equal(f.status, 'unavailable');
  assert.equal(f.evidence, 'mentioned');
});

test('paths under a "Next steps" heading or with future wording are pending', () => {
  const files = trackFiles([
    conv('c1', msg('assistant', T('## Next steps\n- Write `tests/items.test.js`'), T('Later we will need `src/jobs/cleanup.js` too.'))),
  ]);
  assert.equal(byPath(files, 'tests/items.test.js').status, 'pending');
  assert.equal(byPath(files, 'src/jobs/cleanup.js').status, 'pending');
});

test('pending becomes created once code is provided; delete then code recreates', () => {
  const a = trackFiles([conv('c1', msg('assistant', T('Next steps: we still need `a.js`.')), msg('assistant', T('Create `a.js`:'), C('x')))]);
  assert.equal(byPath(a, 'a.js').status, 'created');
  const b = trackFiles([conv('c2', msg('assistant', T('Create `b.js`:'), C('x')), msg('assistant', T('You can delete `b.js` now.')))]);
  assert.equal(byPath(b, 'b.js').status, 'deleted');
  const c = trackFiles([conv('c3', msg('assistant', T('Create `d.js`:'), C('x')), msg('assistant', T('Remove `d.js`.')), msg('assistant', T('Create `d.js`:'), C('y')))]);
  assert.equal(byPath(c, 'd.js').status, 'created');
});

test('a path comment on the first line labels a code block', () => {
  const files = trackFiles([conv('c1', msg('assistant', T('Here you go:'), C('// src/db.js\nexport {}')))]);
  assert.equal(byPath(files, 'src/db.js').status, 'created');
});

test('shell blocks are not labelled from the prose before them', () => {
  const files = trackFiles([conv('c1', msg('assistant', T('Run this from `scripts/deploy.sh`:'), C('npm run build', 'bash')))]);
  assert.equal(byPath(files, 'scripts/deploy.sh').evidence, 'mentioned');
});

test('a bare filename merges into the single matching full path', () => {
  const files = trackFiles([conv('c1', msg('assistant', T('Create `src/app.js`:'), C('x')), msg('assistant', T('In app.js add the route.')))]);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, 'src/app.js');
});

/* ---------- tasks ---------- */

test('tasks come only from structured lists, not from ordinary bullets', () => {
  const tasks = extractTasks([
    conv('c1', msg('assistant', T('Some options:\n- Use a hash map for lookups\n- Use a tree\n\n## Next steps\n- Add role-based permissions\n- Build bulk CSV import\n\n## Completed\n- ✅ JWT auth middleware'))),
  ]);
  const titles = Object.fromEntries(tasks.map((t) => [t.title, t.status]));
  assert.equal(titles['Add role-based permissions'], 'pending');
  assert.equal(titles['Build bulk CSV import'], 'pending');
  assert.equal(titles['JWT auth middleware'], 'completed');
  assert.equal(titles['Use a hash map for lookups'], undefined);
});

test('a later "completed" list closes an earlier pending task with different wording', () => {
  const tasks = extractTasks([
    conv('c1', msg('assistant', T('## Next steps\n- Add role permissions')), msg('assistant', T('## Summary of changes\n- Added role permissions'))),
  ]);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].status, 'completed');
});

test('error reports in the user\'s messages become known issues', () => {
  const tasks = extractTasks([conv('c1', msg('user', T("TypeError: Cannot read properties of undefined (reading 'id')\n    at items.js:10")), msg('user', T('Thanks, looks great')))]);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].status, 'issue');
});

test('summarizeTasks handles empty lists', () => {
  assert.deepEqual(summarizeTasks([]), { completed: 0, working: 0, pending: 0, issue: 0, total: 0, percent: 0 });
});

/* ---------- stack ---------- */

test('stack needs repeated mentions, files or imports; one passing mention is not enough', () => {
  const conversations = [
    conv('c1', msg('assistant', T('We use Express and Express again. Maybe React someday.'), C("import express from 'express';\nimport { PrismaClient } from '@prisma/client';"))),
  ];
  const names = detectStack(conversations, []).map((t) => t.name);
  assert.ok(names.includes('Express'));
  assert.ok(names.includes('Prisma')); // via imports
  assert.ok(!names.includes('React')); // a single passing mention
});

/* ---------- user decisions survive re-analysis ---------- */

const baseProject = (conversations) => ({
  id: 'p', isSample: false, name: 'P', description: '', instructions: '', stack: [],
  files: [], tasks: [], conversations, context: [], overrides: {}, dismissedTaskIds: [], dismissedFilePaths: [],
});

test('analyzeProject preserves edited statuses, confirmations, manual items and dismissals', () => {
  const convs = [conv('c1', msg('user', T('Build an API')), msg('assistant', T('Create `src/app.js`:'), C('x'), T('## Next steps\n- Add role permissions\n- Build bulk CSV import')))];
  let p = analyzeProject(baseProject(convs));
  assert.equal(byPath(p.files, 'src/app.js').confirmed, false);

  // The user confirms the file, completes a task, dismisses one suggestion, adds their own.
  p = {
    ...p,
    files: p.files.map((f) => (f.path === 'src/app.js' ? { ...f, confirmed: true, userEdited: true } : f)),
    tasks: [
      ...p.tasks.filter((t) => !t.title.includes('CSV')).map((t) => ({ ...t, status: 'completed', userEdited: true })),
      { id: 'mine', title: 'My own task', status: 'working', origin: 'manual', userEdited: true },
    ],
    dismissedTaskIds: p.tasks.filter((t) => t.title.includes('CSV')).map((t) => t.id),
  };
  const again = analyzeProject(p);
  assert.equal(byPath(again.files, 'src/app.js').confirmed, true);
  assert.equal(again.tasks.find((t) => t.title.includes('role')).status, 'completed');
  assert.ok(again.tasks.some((t) => t.id === 'mine'));
  assert.ok(!again.tasks.some((t) => t.title.includes('CSV')));
});

test('derived items that disappear are dropped, user-edited ones are kept', () => {
  const stale = [
    { id: 'a', path: 'gone.js', status: 'created', origin: 'derived', userEdited: false },
    { id: 'b', path: 'kept.js', status: 'created', origin: 'derived', userEdited: true },
    { id: 'c', path: 'manual.js', status: 'created', origin: 'manual', userEdited: false },
  ];
  assert.deepEqual(mergeFiles(stale, []).map((f) => f.path), ['kept.js', 'manual.js']);
  assert.deepEqual(mergeTasks([{ id: 'x', title: 'old', status: 'pending', origin: 'derived', userEdited: false }], []), []);
});

/* ---------- sections ---------- */

test('sections separate confirmed files from unconfirmed ones and leave empty sections empty', () => {
  const convs = [conv('c1', msg('assistant', T('Create `src/a.js`:'), C('x'), T('Create `src/b.js`:'), C('y')))];
  let p = analyzeProject(baseProject(convs));
  p = { ...p, files: p.files.map((f) => (f.path === 'src/a.js' ? { ...f, confirmed: true } : f)) };
  const sections = getSections(p);
  assert.equal(sections.length, 12);
  const created = sections.find((s) => s.id === 'files-created');
  assert.deepEqual(created.groups.map((g) => [g.label, g.items]), [
    ['Confirmed', ['src/a.js']],
    ['Indicated by the conversation, not confirmed', ['src/b.js']],
  ]);
  assert.equal(sections.find((s) => s.id === 'bugs').empty, true);
});

test('a manual note replaces the derived text for that section', () => {
  const p = { ...analyzeProject(baseProject([])), overrides: { contextNotes: { architecture: 'Layered: routes → services → db' } } };
  const arch = getSections(p).find((s) => s.id === 'architecture');
  assert.equal(arch.source, 'manual');
  assert.equal(arch.text, 'Layered: routes → services → db');
});

test('decisions are single sentences, not merged headings or bullets', () => {
  const p = analyzeProject(baseProject([conv('c1', msg('assistant', T("## Project structure\n- Express app in `src/app.js`\n\nI'd recommend Prisma instead of raw SQL because migrations are easier. Next we add routes.")))]));
  assert.deepEqual(p.analysis.decisions.map((d) => d.text), ["I'd recommend Prisma instead of raw SQL because migrations are easier."]);
});

test('status text pluralises issues correctly', () => {
  const p = { ...baseProject([]), tasks: [{ id: 'i', title: 'x', status: 'issue' }] };
  const status = getSections(p).find((s) => s.id === 'status');
  assert.match(status.text, /1 known issue\./);
});
