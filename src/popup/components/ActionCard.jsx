import { cn } from '../../utils/cn';

export default function ActionCard({ icon: Icon, title, description, highlight = false, children, ...rest }) {
  return (
    <section
      className={cn('card flex items-center gap-3 p-3.5 transition-colors', highlight && 'border-accent/60 bg-accent/5')}
      {...rest}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[12px] leading-snug text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
