'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/product/product-image';
import { formatVnd } from '@/lib/utils';
import { unitPrice, useCartStore, type CartItem } from '@/stores/cart-store';
import { QuantityStepper } from './quantity-stepper';

export function CartLine({ item, onNavigate }: { item: CartItem; onNavigate?: () => void }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  return (
    <li className="flex gap-3 py-4">
      <Link href={`/mon/${item.slug}`} onClick={onNavigate} className="shrink-0">
        <ProductImage
          fit="cover"
          name={item.name}
          imageUrl={item.imageUrl}
          categorySlug={item.categorySlug}
          sizes="80px"
          className="size-16 rounded-xl border border-border"
          emojiClassName="text-4xl"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/mon/${item.slug}`} onClick={onNavigate} className="text-sm font-medium transition-colors duration-150 hover:text-primary">
            {item.name}
          </Link>
          <button
            type="button"
            onClick={() => remove(item.key)}
            className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-danger"
            aria-label={`Xóa ${item.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        {item.options.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.options.map((o) => o.name).join(' · ')}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <QuantityStepper size="sm" value={item.quantity} min={0} onChange={(q) => setQuantity(item.key, q)} />
          <span className="text-sm font-medium tabular-nums">{formatVnd(unitPrice(item) * item.quantity)}</span>
        </div>
      </div>
    </li>
  );
}
