import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function Collapsible({ title, defaultOpen = false, meta, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight size={14} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-90')} />
        <span className="flex-1 text-[13px] font-medium">{title}</span>
        {meta}
      </button>
      {open && <div className="border-t border-line px-3 py-2.5 text-[12px] text-muted">{children}</div>}
    </div>
  );
}
