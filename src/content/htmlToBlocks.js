// Converts a rendered message element into ordered blocks:
//   { type: 'text', content: '<markdown-ish prose>' }
//   { type: 'code', lang: 'js', content: '<verbatim code>' }
// Uses only basic DOM members (nodeType, tagName, childNodes, children, parentElement,
// getAttribute, querySelector, textContent) so it can be tested without a browser.

const SKIP = new Set(['BUTTON', 'SVG', 'STYLE', 'SCRIPT', 'NOSCRIPT', 'TEMPLATE']);
const BLOCKISH = new Set(['DIV', 'SECTION', 'ARTICLE', 'UL', 'OL', 'TABLE', 'THEAD', 'TBODY']);

const tagOf = (n) => (n.tagName || '').toUpperCase();

function tidy(s) {
  return s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^(\s*(?:-|\d+\.)) *\n+/gm, '$1 ') // "- \n\ntext" -> "- text"
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function codeBlock(pre) {
  const code = pre.querySelector('code');
  const cls = (code && code.getAttribute('class')) || pre.getAttribute('class') || '';
  const m = cls.match(/language-([\w+#.-]+)/);
  return {
    type: 'code',
    lang: m ? m[1] : '',
    content: (code || pre).textContent.replace(/\n+$/, ''),
  };
}

export function htmlToBlocks(root) {
  const blocks = [];
  let buf = '';
  const add = (s) => {
    buf += s;
  };
  const atLineStart = () => buf === '' || buf.endsWith('\n');
  const flush = () => {
    const t = tidy(buf);
    if (t) blocks.push({ type: 'text', content: t });
    buf = '';
  };
  const kids = (n) => Array.from(n.childNodes).forEach(walk);
  const listDepth = (el) => {
    let d = 0;
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      if (tagOf(p) === 'UL' || tagOf(p) === 'OL') d += 1;
    }
    return d;
  };

  function walk(node) {
    if (node.nodeType === 3) {
      let t = (node.nodeValue || '').replace(/\s+/g, ' ');
      if (atLineStart()) t = t.replace(/^ /, '');
      add(t);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = tagOf(node);
    if (SKIP.has(tag) || node.getAttribute('aria-hidden') === 'true') return;

    switch (tag) {
      case 'PRE':
        flush();
        blocks.push(codeBlock(node));
        return;
      case 'BR':
        add('\n');
        return;
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        add(`\n\n${'#'.repeat(Number(tag[1]))} `);
        kids(node);
        add('\n\n');
        return;
      case 'P':
        add('\n\n');
        kids(node);
        add('\n\n');
        return;
      case 'BLOCKQUOTE':
        add('\n\n> ');
        kids(node);
        add('\n\n');
        return;
      case 'LI': {
        const parent = node.parentElement;
        const ordered = parent && tagOf(parent) === 'OL';
        const index = ordered ? Array.from(parent.children).indexOf(node) + 1 : 0;
        const indent = ' '.repeat(Math.max(0, listDepth(node) - 1) * 2);
        if (!atLineStart()) add('\n');
        add(`${indent}${ordered ? `${index}. ` : '- '}`);
        kids(node);
        add('\n');
        return;
      }
      case 'CODE':
        add(`\`${node.textContent}\``);
        return;
      case 'STRONG':
      case 'B':
        add('**');
        kids(node);
        add('**');
        return;
      case 'EM':
      case 'I':
        add('*');
        kids(node);
        add('*');
        return;
      case 'A': {
        const href = node.getAttribute('href') || '';
        if (/^https?:\/\//.test(href)) {
          add('[');
          kids(node);
          add(`](${href})`);
        } else {
          kids(node);
        }
        return;
      }
      case 'TR':
        add('\n| ');
        kids(node);
        add('\n');
        return;
      case 'TD':
      case 'TH':
        kids(node);
        add(' | ');
        return;
      default:
        if (BLOCKISH.has(tag)) {
          add('\n');
          kids(node);
          add('\n');
        } else {
          kids(node);
        }
    }
  }

  kids(root);
  flush();
  return blocks;
}
