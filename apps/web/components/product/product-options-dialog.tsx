'use client';

import type { ProductDetailDto, ProductSummaryDto } from '@foodhub/shared';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api-client';
import { ProductImage } from './product-image';
import { ProductOptionsForm } from './product-options-form';
import { PriceTag } from './price-tag';

export function ProductOptionsDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductSummaryDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useQuery({
    queryKey: ['product', product.slug],
    queryFn: () => api<ProductDetailDto>(`/products/${product.slug}`),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ProductImage
          name={product.name}
          imageUrl={product.imageUrl}
          categorySlug={product.category.slug}
          className="h-40 shrink-0 border-b border-border"
          emojiClassName="text-7xl"
        />
        <div className="px-5 pt-4 pb-4">
          <DialogTitle className="pr-8 text-base font-semibold">{product.name}</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
            Giá từ <PriceTag amount={product.basePrice} />
          </DialogDescription>
        </div>
        {data ? (
          <ProductOptionsForm product={data} variant="dialog" onAdded={() => onOpenChange(false)} />
        ) : (
          <div className="space-y-3 px-5 pb-6">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
            </div>
            <Skeleton className="mt-6 h-12 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
