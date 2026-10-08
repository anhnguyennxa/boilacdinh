'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';

const SORTS = [
  { value: 'popular', label: 'Bán chạy' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
];

const PRICES = [
  { value: '', label: 'Mọi mức giá' },
  { value: '0-30000', label: 'Dưới 30k' },
  { value: '30000-50000', label: '30k – 50k' },
  { value: '50000-', label: 'Trên 50k' },
];

export function MenuFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const price = `${params.get('minPrice') ?? ''}${params.has('minPrice') || params.has('maxPrice') ? '-' : ''}${params.get('maxPrice') ?? ''}`;

  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    next.delete('page');
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  }

  const select =
    'h-8 rounded-xl border border-border bg-surface pl-3 pr-8 text-sm text-foreground transition-colors duration-150 hover:border-border-strong focus:border-primary focus:shadow-ring focus:outline-none';

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', pending && '[&_select]:text-muted-foreground')}>
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">{total}</strong> món
      </p>
      <div className="flex gap-2">
        <select
          aria-label="Khoảng giá"
          className={select}
          value={price}
          onChange={(e) => {
            const [min, max] = e.target.value.split('-');
            update({ minPrice: min || undefined, maxPrice: max || undefined });
          }}
        >
          {PRICES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Sắp xếp"
          className={select}
          value={params.get('sort') ?? 'popular'}
          onChange={(e) => update({ sort: e.target.value === 'popular' ? undefined : e.target.value })}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
