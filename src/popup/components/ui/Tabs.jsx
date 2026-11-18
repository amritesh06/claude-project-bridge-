import { cn } from '../../../utils/cn';

export default function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="flex gap-0.5 border-b border-line">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px flex h-8 items-center gap-1 border-b-2 px-2.5 text-[12px] font-medium transition-colors',
              active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded bg-surface2 px-1 text-[10px] text-muted">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
