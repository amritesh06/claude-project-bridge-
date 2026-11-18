import { cn } from '../../../utils/cn';

export default function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface2 p-0.5">
      {options.map(({ id, label: text, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              'flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors',
              active ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg',
            )}
          >
            {Icon && <Icon size={12} />}
            {text}
          </button>
        );
      })}
    </div>
  );
}
