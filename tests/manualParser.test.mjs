import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManualTranscript } from '../src/core/manualParser.js';

test('splits on role markers and keeps order', () => {
  const msgs = parseManualTranscript('You: Hello\nthere\nClaude: Hi!\n\nYou: Thanks');
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.equal(msgs[0].blocks[0].content, 'Hello\nthere');
});

test('accepts Human/Assistant and bold markers', () => {
  const msgs = parseManualTranscript('**Human:** a\n**Assistant:** b');
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant']);
});

test('text without markers becomes one note', () => {
  const msgs = parseManualTranscript('Some notes\nacross lines');
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].role, 'note');
});

test('markers inside code fences are not treated as speakers', () => {
  const msgs = parseManualTranscript('Claude: Example:\n```\nUser: not a speaker\n```\nEnd');
  assert.equal(msgs.length, 1);
  assert.deepEqual(msgs[0].blocks.map((b) => b.type), ['text', 'code', 'text']);
  assert.equal(msgs[0].blocks[1].content, 'User: not a speaker');
});

test('empty input gives no messages', () => {
  assert.deepEqual(parseManualTranscript('   \n '), []);
});
