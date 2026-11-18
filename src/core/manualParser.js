// Turns pasted text into messages. Used when claude.ai's page can't be read.
// Recognises lines that start with "You:", "User:", "Human:" (your messages) and
// "Claude:", "Assistant:" (replies). Text without any marker becomes a single note.
// Fenced ``` blocks become code blocks.

const MARKER = /^\s*(?:\*\*)?(human|user|you|claude|assistant)(?:\*\*)?\s*:\s*/i;

export function splitFences(text) {
  const blocks = [];
  const re = /```([\w+#.-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(last, m.index).trim();
    if (before) blocks.push({ type: 'text', content: before });
    blocks.push({ type: 'code', lang: m[1] || '', content: m[2].replace(/\n+$/, '') });
    last = m.index + m[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) blocks.push({ type: 'text', content: rest });
  return blocks;
}

export function parseManualTranscript(raw, idPrefix = 'manual') {
  const text = (raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const chunks = [];
  let current = null;
  let inFence = false;
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('```')) inFence = !inFence;
    const m = !inFence && line.match(MARKER);
    if (m) {
      const who = m[1].toLowerCase();
      current = { role: ['claude', 'assistant'].includes(who) ? 'assistant' : 'user', lines: [line.slice(m[0].length)] };
      chunks.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      current = { role: 'note', lines: [line] };
      chunks.push(current);
    }
  }

  return chunks
    .map((c) => ({ role: c.role, blocks: splitFences(c.lines.join('\n').trim()) }))
    .filter((c) => c.blocks.length)
    .map((c, i) => ({ id: `${idPrefix}-m${i + 1}`, ...c }));
}
