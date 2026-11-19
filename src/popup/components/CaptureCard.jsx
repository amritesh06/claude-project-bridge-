import { Camera } from 'lucide-react';
import Button from './ui/Button';

// Shown only while a claude.ai conversation or project page is open.
export default function CaptureCard({ claude, navigate }) {
  const supported = claude.status === 'tab-open' && (claude.page === 'conversation' || claude.page === 'project');
  if (!supported) return null;
  const detail =
    claude.page === 'conversation'
      ? claude.messageCount
        ? `${claude.messageCount} messages visible in this conversation`
        : 'Conversation open'
      : 'Project page open';
  return (
    <section className="card flex items-center gap-3 border-accent/30 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Capture this {claude.page}</p>
        <p className="truncate text-[12px] text-muted">{detail}</p>
        {claude.streaming && <p className="text-[12px] text-warn">Claude is still replying. Wait for it to finish.</p>}
      </div>
      <Button variant="primary" icon={Camera} onClick={() => navigate({ page: 'capture' })}>
        Capture
      </Button>
    </section>
  );
}
