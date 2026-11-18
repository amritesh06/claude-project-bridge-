import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

const base =
  'inline-flex select-none items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

const variants = {
  primary: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95',
  secondary: 'border border-line bg-surface2 text-fg hover:border-muted/50',
  ghost: 'text-muted hover:bg-surface2 hover:text-fg',
  danger: 'border border-line text-bad hover:bg-bad/10',
};

const sizes = {
  sm: 'h-7 px-2.5 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
  lg: 'h-9 px-3.5 text-[13px]',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
      disabled={loading || disabled}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}
