import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCapture } from '../src/core/captureMerge.js';

const conv = (id, n = 2) => ({
  conversationId: id,
  title: 'Pagination',
  url: 'https://claude.ai/chat/' + id,
  messages: Array.from({ length: n }, (_, i) => ({ id: `${id}-m${i}`, role: i % 2 ? 'assistant' : 'user', blocks: [{ type: 'text', content: 'x' }] })),
});

test('creates a new project and stores the conversation', () => {
  const { projects, projectId } = mergeCapture([], { source: 'dom', project: { projectId: 'p1', description: 'd', instructions: 'i' }, conversation: conv('c1') }, { mode: 'new', name: 'API' });
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, projectId);
  assert.equal(projects[0].isSample, false);
  assert.equal(projects[0].claudeProjectId, 'p1');
  assert.equal(projects[0].instructions, 'i');
  assert.equal(projects[0].conversations[0].source, 'claude.ai');
});

test('re-capturing the same conversation replaces it instead of duplicating', () => {
  const first = mergeCapture([], { source: 'dom', conversation: conv('c1', 2) }, { mode: 'new', name: 'API' });
  const second = mergeCapture(first.projects, { source: 'dom', conversation: conv('c1', 4) }, { mode: 'existing', id: first.projectId });
  assert.equal(second.projects[0].conversations.length, 1);
  assert.equal(second.projects[0].conversations[0].messages.length, 4);
  assert.equal(second.replacedConversation, true);
});

test('a new capture with the same Claude project id reuses the project', () => {
  const a = mergeCapture([], { source: 'dom', project: { projectId: 'p1' }, conversation: conv('c1') }, { mode: 'new', name: 'API' });
  const b = mergeCapture(a.projects, { source: 'dom', project: { projectId: 'p1' }, conversation: conv('c2') }, { mode: 'new', name: 'Different name' });
  assert.equal(b.projects.length, 1);
  assert.equal(b.projects[0].conversations.length, 2);
});

test('never overwrites details that are already filled in', () => {
  const a = mergeCapture([], { source: 'dom', project: { instructions: 'mine' } }, { mode: 'new', name: 'API' });
  const b = mergeCapture(a.projects, { source: 'dom', project: { instructions: 'detected' } }, { mode: 'existing', id: a.projectId });
  assert.equal(b.projects[0].instructions, 'mine');
});

test('marks an already-backed-up project as outdated', () => {
  const a = mergeCapture([], { source: 'dom', conversation: conv('c1') }, { mode: 'new', name: 'API' });
  const backedUp = a.projects.map((p) => ({ ...p, lastBackupAt: 1, backupStatus: 'current' }));
  const b = mergeCapture(backedUp, { source: 'dom', conversation: conv('c2') }, { mode: 'existing', id: a.projectId });
  assert.equal(b.projects[0].backupStatus, 'stale');
});

test('rejects an empty name and a missing project', () => {
  assert.throws(() => mergeCapture([], {}, { mode: 'new', name: '  ' }), /project name/i);
  assert.throws(() => mergeCapture([], {}, { mode: 'existing', id: 'nope' }), /no longer exists/i);
});
