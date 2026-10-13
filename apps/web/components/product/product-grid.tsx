import type { ProductSummaryDto } from '@foodhub/shared';
import { Skeleton } from '@/components/ui/misc';
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
