import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type PageItem = number | 'gap';

/**
 * Dãy số trang gọn: luôn có trang đầu, trang cuối và các trang quanh trang hiện tại;
 * khoảng bị bỏ qua thành "…". Khoảng chỉ thiếu 1 trang thì hiện luôn số đó (không đáng một dấu "…").
 * Ví dụ trang 6/12 → 1 … 5 6 7 … 12
 */
export function pageItems(page: number, pages: number, siblings = 1): PageItem[] {
  if (pages <= 1) return [];
  const keep = new Set([1, pages]);
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= pages) keep.add(p);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: PageItem[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev === 2) out.push(prev + 1);
    else if (prev !== undefined && p - prev > 2) out.push('gap');
    out.push(p);
  });
  return out;
}

const item =
  'grid h-8 min-w-8 place-items-center rounded-lg border border-border bg-surface px-2 text-sm tabular-nums text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground';

/** Phân trang bằng link (?page=n) — dùng được cả ở Server Component lẫn trang client. */
export function Pagination({
  page,
  limit,
  total,
  hrefFor,
  className,
}: {
  page: number;
  limit: number;
  total: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <nav aria-label="Phân trang" className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={item} aria-label="Trang trước" scroll={false}>
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {pageItems(page, pages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            scroll={false}
            aria-label={`Trang ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(item, p === page && 'border-primary text-primary')}
          >
            {p}
          </Link>
        ),
      )}
      {page < pages && (
        <Link href={hrefFor(page + 1)} className={item} aria-label="Trang sau" scroll={false}>
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}

/** "21–40 / 57" — dòng tóm tắt cạnh bảng/lưới. */
export function rangeLabel(page: number, limit: number, total: number) {
  if (!total) return '0';
  const from = (page - 1) * limit + 1;
  return `${from}–${Math.min(page * limit, total)} / ${total}`;
}
