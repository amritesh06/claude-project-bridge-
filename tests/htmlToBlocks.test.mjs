import test from 'node:test';
import assert from 'node:assert/strict';
import { h } from './fakeDom.mjs';
import { htmlToBlocks } from '../src/content/htmlToBlocks.js';

test('paragraphs, emphasis and inline code become markdown text', () => {
  const root = h('div', {}, h('p', {}, 'Use ', h('strong', {}, 'cursors'), ' with ', h('code', {}, 'Prisma'), '.'), h('p', {}, 'Second paragraph.'));
  assert.deepEqual(htmlToBlocks(root), [{ type: 'text', content: 'Use **cursors** with `Prisma`.\n\nSecond paragraph.' }]);
});

test('code fences are preserved verbatim, with language, and split the prose', () => {
  const root = h(
    'div',
    {},
    h('p', {}, 'Here it is:'),
    h('pre', {}, h('code', { class: 'language-js' }, 'const a = 1;\n  if (a) {}\n')),
    h('p', {}, 'Done.'),
  );
  assert.deepEqual(htmlToBlocks(root), [
    { type: 'text', content: 'Here it is:' },
    { type: 'code', lang: 'js', content: 'const a = 1;\n  if (a) {}' },
    { type: 'text', content: 'Done.' },
  ]);
});

test('ordered and nested unordered lists', () => {
  const root = h(
    'div',
    {},
    h('ol', {}, h('li', {}, 'First'), h('li', {}, 'Second', h('ul', {}, h('li', {}, 'Nested')))),
  );
  assert.equal(htmlToBlocks(root)[0].content, '1. First\n2. Second\n  - Nested');
});

test('buttons, svgs and aria-hidden content are dropped', () => {
  const root = h('div', {}, h('button', {}, 'Copy'), h('p', {}, 'Real text'), h('span', { 'aria-hidden': 'true' }, 'hidden'));
  assert.deepEqual(htmlToBlocks(root), [{ type: 'text', content: 'Real text' }]);
});

test('headings and external links', () => {
  const root = h('div', {}, h('h2', {}, 'Plan'), h('p', {}, 'See ', h('a', { href: 'https://example.com' }, 'docs')));
  assert.equal(htmlToBlocks(root)[0].content, '## Plan\n\nSee [docs](https://example.com)');
});

test('empty elements yield no blocks', () => {
  assert.deepEqual(htmlToBlocks(h('div', {}, h('div', {}, '  '))), []);
});
