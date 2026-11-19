import { useState } from 'react';
import { Bot, FileText, MessageSquare, User } from 'lucide-react';
import Button from '../../components/ui/Button';
import Collapsible from '../../components/ui/Collapsible';
import EmptyState from '../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';
import { timeAgo } from '../../../utils/time';

const PREVIEW_CHARS = 600;
const MESSAGE_PAGE = 40;

function Block({ block }) {
  const [open, setOpen] = useState(false);
  const long = block.content.length > PREVIEW_CHARS;
  const shown = open || !long ? block.content : `${block.content.slice(0, PREVIEW_CHARS)}…`;
  return (
    <div className="space-y-1">
      {block.type === 'code' ? (
        <pre className="scroll-thin overflow-x-auto rounded-lg border border-line bg-bg p-2 font-mono text-[11px] leading-relaxed text-muted">
          {block.lang && <span className="mb-1 block text-[10px] text-accent-text">{block.lang}</span>}
          {shown}
        </pre>
      ) : (
        <p className="whitespace-pre-wrap break-words text-[12px] text-fg">{shown}</p>
      )}
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-accent-text hover:underline">
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

const ROLE_VIEW = {
  user: { label: 'You', icon: User, box: 'bg-surface2 text-muted' },
  assistant: { label: 'Claude', icon: Bot, box: 'bg-accent/15 text-accent-text' },
  note: { label: 'Note', icon: FileText, box: 'bg-surface2 text-muted' },
};

function Message({ m }) {
  const v = ROLE_VIEW[m.role] || ROLE_VIEW.note;
  const Icon = v.icon;
  // Sample data uses text/code; captured data uses blocks.
  const blocks = m.blocks || [{ type: 'text', content: m.text }, ...(m.code ? [{ type: 'code', content: m.code }] : [])];
  return (
    <div className="flex gap-2">
      <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md', v.box)}>
        <Icon size={11} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-medium text-muted">{v.label}</p>
        {blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

function ConversationBody({ messages }) {
  const [limit, setLimit] = useState(MESSAGE_PAGE);
  return (
    <div className="space-y-3 pt-0.5">
      {messages.slice(0, limit).map((m) => (
        <Message key={m.id} m={m} />
      ))}
      {messages.length > limit && (
        <Button size="sm" className="w-full" onClick={() => setLimit((l) => l + MESSAGE_PAGE)}>
          Show {Math.min(MESSAGE_PAGE, messages.length - limit)} more ({messages.length - limit} remaining)
        </Button>
      )}
    </div>
  );
}

export default function ConversationsTab({ project }) {
  if (!project.conversations.length) {
    return <EmptyState icon={MessageSquare} title="No conversations captured" description="Open a conversation on claude.ai and capture it, or paste one in manually." />;
  }
  return (
    <div className="space-y-2">
      {project.conversations.map((c, i) => (
        <Collapsible
          key={c.id}
          title={c.title}
          defaultOpen={i === 0}
          meta={
            <span className="shrink-0 text-[11px] text-muted">
              {c.messages.length} msgs · {c.source === 'manual' ? 'pasted' : timeAgo(c.updatedAt)}
            </span>
          }
        >
          <ConversationBody messages={c.messages} />
        </Collapsible>
      ))}
    </div>
  );
}
