'use client';

import type { OptionGroupDto, ProductDetailDto } from '@foodhub/shared';
import { Check, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { QuantityStepper } from '@/components/cart/quantity-stepper';
import { Button } from '@/components/ui/button';
import { cn, formatVnd } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';

/** Nhóm bắt buộc chọn 1 → chọn sẵn lựa chọn đầu tiên (Size M, 100% đường, đá bình thường). */
function defaults(groups: OptionGroupDto[]) {
  const sel: Record<string, string[]> = {};
  for (const g of groups) sel[g.id] = g.isRequired && g.maxSelect === 1 && g.options[0] ? [g.options[0].id] : [];
  return sel;
}

export function ProductOptionsForm({
  product,
  onAdded,
  variant = 'page',
}: {
  product: ProductDetailDto;
  onAdded?: () => void;
  /** dialog: thanh thêm dính đáy hộp thoại; page: cố định đáy màn hình trên mobile */
  variant?: 'dialog' | 'page';
}) {
  const sticky = variant === 'dialog';
  const [selected, setSelected] = useState(() => defaults(product.optionGroups));
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.setDrawerOpen);

  const chosen = useMemo(
    () =>
      product.optionGroups.flatMap((g) =>
        g.options.filter((o) => selected[g.id]?.includes(o.id)).map((o) => ({ ...o, group: g.name })),
      ),
    [product.optionGroups, selected],
  );
  const unit = product.basePrice + chosen.reduce((s, o) => s + o.extraPrice, 0);
  const missing = product.optionGroups.filter((g) => g.isRequired && !selected[g.id]?.length);

  function toggle(group: OptionGroupDto, optionId: string) {
    setSelected((prev) => {
      const cur = prev[group.id] ?? [];
      if (group.maxSelect === 1) {
        return { ...prev, [group.id]: cur[0] === optionId && !group.isRequired ? [] : [optionId] };
      }
      if (cur.includes(optionId)) return { ...prev, [group.id]: cur.filter((id) => id !== optionId) };
      if (cur.length >= group.maxSelect) {
        toast.info(`${group.name}: chọn tối đa ${group.maxSelect}`);
        return prev;
      }
      return { ...prev, [group.id]: [...cur, optionId] };
    });
  }

  function submit() {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      categorySlug: product.category.slug,
      basePrice: product.basePrice,
      quantity,
      options: chosen.map((o) => ({ id: o.id, group: o.group, name: o.name, extraPrice: o.extraPrice })),
    });
    toast.success(`Đã thêm ${quantity} × ${product.name}`, {
      action: { label: 'Xem giỏ', onClick: () => openDrawer(true) },
    });
    onAdded?.();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn('space-y-5', sticky && 'flex-1 overflow-y-auto px-5 pb-4')}>
        {product.optionGroups.map((g) => {
          const error = showErrors && missing.includes(g);
          return (
            <fieldset key={g.id}>
              <legend className="mb-2 flex w-full items-center justify-between">
                <span className="text-sm font-medium">{g.name}</span>
                <span className={cn('text-xs', error ? 'font-medium text-danger' : 'text-muted-foreground')}>
                  {g.isRequired ? 'Bắt buộc' : 'Tùy chọn'}
                  {g.maxSelect > 1 && ` · tối đa ${g.maxSelect}`}
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const active = selected[g.id]?.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(g, o.id)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-sm transition-colors duration-150',
                        active
                          ? 'border-primary bg-primary-soft text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground',
                        error && !active && 'border-danger/50',
                      )}
                    >
                      {active && <Check className="size-3 text-primary" />}
                      {o.name}
                      {o.extraPrice > 0 && <span className="text-xs text-muted-foreground">+{formatVnd(o.extraPrice)}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div
        className={cn(
          'flex items-center gap-3',
          sticky
            ? 'border-t border-border bg-surface px-5 pt-3 pb-safe'
            : 'fixed inset-x-0 bottom-0 z-[2] border-t border-border bg-surface px-4 pt-3 pb-safe md:static md:mt-6 md:border-0 md:bg-transparent md:p-0',
        )}
      >
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <Button size="lg" className="flex-1" onClick={submit} disabled={!product.isAvailable}>
          <ShoppingBag />
          {product.isAvailable ? `Thêm · ${formatVnd(unit * quantity)}` : 'Hết món'}
        </Button>
      </div>
    </div>
  );
}
