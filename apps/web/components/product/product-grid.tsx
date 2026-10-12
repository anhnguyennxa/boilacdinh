import type { ProductSummaryDto } from '@foodhub/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';

/** 1 cột (mobile) → 2 (sm) → 3 (md) → 4 (lg) */
export const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

/**
 * priorityCount: số ảnh đầu tải ưu tiên — chỉ đặt cho lưới nằm ngay màn hình đầu.
 * Lưới nằm dưới hero (trang chủ, món liên quan) để 0, không tranh băng thông với ảnh LCP.
 */
export function ProductGrid({ products, priorityCount = 0 }: { products: ProductSummaryDto[]; priorityCount?: number }) {
  return (
    <div className={GRID}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-3.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-4 h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  limit,
  total,
  hrefFor,
}: {
  page: number;
  limit: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const item = 'grid size-8 place-items-center rounded-lg border border-border bg-surface text-sm text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground';
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={item} aria-label="Trang trước">
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(item, p === page && 'border-primary text-primary')}
        >
          {p}
        </Link>
      ))}
      {page < pages && (
        <Link href={hrefFor(page + 1)} className={item} aria-label="Trang sau">
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}
