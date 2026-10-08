import { ProductGridSkeleton } from '@/components/product/product-grid';
import { Skeleton } from '@/components/ui/misc';

export default function Loading() {
  return (
    <div className="pt-6">
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
