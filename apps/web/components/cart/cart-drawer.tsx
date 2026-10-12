'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/misc';
import { useCart } from '@/hooks/useCart';
import { formatVnd } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { CartLine } from './cart-line';
import { FreeShipProgress } from './free-ship-progress';

export function CartDrawer() {
  const open = useCartStore((s) => s.drawerOpen);
  const setOpen = useCartStore((s) => s.setDrawerOpen);
  const { items, count, subtotal } = useCart();
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SheetContent aria-describedby={undefined}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-semibold">Giỏ hàng {count > 0 && `(${count})`}</DialogTitle>
          <DialogClose className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground" aria-label="Đóng">
            <X className="size-4" />
          </DialogClose>
        </div>

        {items.length === 0 ? (
          <div className="p-4">
            <DialogDescription className="sr-only">Giỏ hàng trống</DialogDescription>
            <EmptyState
              emoji="🛒"
              title="Giỏ hàng đang trống"
              description="Chọn vài món ngon từ thực đơn nhé."
              action={
                <Button asChild onClick={close}>
                  <Link href="/thuc-don">Xem thực đơn</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              <div className="pt-4">
                <FreeShipProgress subtotal={subtotal} />
              </div>
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <CartLine key={item.key} item={item} onNavigate={close} />
                ))}
              </ul>
            </div>
            <div className="space-y-3 border-t border-border px-4 pt-4 pb-safe">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tạm tính</span>
                <span className="text-base font-semibold tabular-nums">{formatVnd(subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" asChild onClick={close}>
                  <Link href="/gio-hang">Xem giỏ</Link>
                </Button>
                <Button size="lg" asChild onClick={close}>
                  <Link href="/thanh-toan">Thanh toán</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
