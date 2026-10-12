'use client';

import type { ProductSummaryDto } from '@foodhub/shared';
import { Plus, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PriceTag } from './price-tag';
import { ProductImage } from './product-image';

// Hộp chọn tùy chọn không nằm trong JS ban đầu: tải trước khi khách rê chuột/chạm vào nút thêm
const loadDialog = () => import('./product-options-dialog');
const ProductOptionsDialog = dynamic(() => loadDialog().then((m) => m.ProductOptionsDialog), { ssr: false });

export function ProductCard({ product, priority }: { product: ProductSummaryDto; priority?: boolean }) {
  const [open, setOpen] = useState(false);
  const soldOut = !product.isAvailable;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[border-color,transform,box-shadow] duration-200 ease-out',
        soldOut ? 'bg-subtle' : 'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md',
      )}
    >
      <Link href={`/mon/${product.slug}`} className="flex flex-1 flex-col" aria-label={product.name}>
        <ProductImage
          name={product.name}
          imageUrl={product.imageUrl}
          categorySlug={product.category.slug}
          priority={priority}
          emojiClassName={cn('text-6xl transition-transform duration-300 ease-out group-hover:scale-110', soldOut && 'grayscale')}
          className="aspect-[4/3] border-b border-border"
          imageClassName="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          {soldOut ? (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Hết món
            </span>
          ) : (
            product.soldCount >= 400 && (
              <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-highlight-foreground">
                Bán chạy
              </span>
            )
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3 pb-12">
          <h3 className={cn('line-clamp-2 text-sm font-medium', soldOut ? 'text-muted-foreground' : 'text-foreground')}>
            {product.name}
          </h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-current" />
            {product.ratingAvg.toFixed(1)} · Đã bán {product.soldCount}
          </p>
        </div>
      </Link>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
        <PriceTag amount={product.basePrice} className={soldOut ? 'text-muted-foreground' : undefined} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          onPointerEnter={loadDialog}
          onFocus={loadDialog}
          onTouchStart={loadDialog}
          disabled={soldOut}
          className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
          aria-label={`Thêm ${product.name} vào giỏ`}
        >
          <Plus className="size-4" />
        </button>
      </div>
      {open && <ProductOptionsDialog product={product} open={open} onOpenChange={setOpen} />}
    </article>
  );
}
