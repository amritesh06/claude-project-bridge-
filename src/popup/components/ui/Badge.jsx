import { cn } from '../../../utils/cn';

export default function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cn('badge', `badge-${tone}`, className)}>
      {Icon ? <Icon size={10} strokeWidth={2.4} /> : null}
      {children}
    </span>
  );
}
