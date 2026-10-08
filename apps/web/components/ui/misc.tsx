import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'secondary' | 'danger';
  className?: string;
}) {
  // Linear chip: pill, 12px, weight 500, nền surface + viền mảnh
  const tones = {
    neutral: 'border-border bg-surface text-muted-foreground',
    primary: 'border-primary/30 bg-primary-soft text-primary',
    secondary: 'border-secondary/30 bg-secondary-soft text-secondary',
    danger: 'border-danger/30 bg-danger/10 text-danger',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-xl border border-border bg-surface text-2xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** Thẻ chuẩn của Linear: surface, viền 1px, radius 12px, bóng medium */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface p-4 shadow-md', className)} {...props}>
      {children}
    </section>
  );
}
