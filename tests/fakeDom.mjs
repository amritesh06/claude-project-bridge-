// Minimal DOM stand-in so htmlToBlocks can be tested in Node without a browser.
export function text(value) {
  return { nodeType: 3, nodeValue: value, parentElement: null };
}
export function h(tag, attrs = {}, ...kids) {
  const el = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    parentElement: null,
    childNodes: [],
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    get children() {
      return this.childNodes.filter((n) => n.nodeType === 1);
    },
    get textContent() {
      return this.childNodes.map((n) => (n.nodeType === 3 ? n.nodeValue : n.textContent)).join('');
    },
    querySelector(sel) {
      for (const c of this.children) {
        if (c.tagName === sel.toUpperCase()) return c;
        const deep = c.querySelector(sel);
        if (deep) return deep;
      }
      return null;
    },
  };
  for (const k of kids) {
    const node = typeof k === 'string' ? text(k) : k;
    node.parentElement = el;
    el.childNodes.push(node);
  }
  return el;
}
