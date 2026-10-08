import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'primary' | 'secondary';
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-md">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'primary' && 'text-foreground',
          tone === 'secondary' && 'text-secondary',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
