'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}) {
  const btn = cn(
    'grid place-items-center rounded-lg border border-border bg-surface text-foreground transition-colors duration-150 hover:border-border-strong hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-surface',
    size === 'sm' ? 'size-7' : 'size-10',
  );
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Giảm số lượng">
        <Minus className="size-3.5" />
      </button>
      <span className={cn('min-w-6 text-center font-medium tabular-nums', size === 'sm' && 'text-sm')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Tăng số lượng">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
