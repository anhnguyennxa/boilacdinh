'use client';

import { ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatVnd } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';

const HIDDEN_ON = ['/gio-hang', '/thanh-toan', '/mon/'];

/** Thanh giỏ hàng nổi ở đáy màn hình trên mobile — luôn trong tầm ngón cái. */
export function MobileCartBar() {
  const { count, subtotal } = useCart();
  const openDrawer = useCartStore((s) => s.setDrawerOpen);
  const pathname = usePathname();
  if (count === 0 || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2] px-4 pb-safe md:hidden">
      <button
        type="button"
        onClick={() => openDrawer(true)}
        className="flex h-12 w-full items-center gap-3 rounded-xl bg-primary pl-2 pr-4 text-primary-foreground shadow-lg animate-slide-up transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        <span className="relative grid size-8 place-items-center rounded-lg bg-background/20">
          <ShoppingBag className="size-4" />
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
            {count}
          </span>
        </span>
        <span className="text-sm font-medium">Xem giỏ hàng</span>
        <span className="ml-auto text-sm font-semibold tabular-nums">{formatVnd(subtotal)}</span>
      </button>
    </div>
  );
}
