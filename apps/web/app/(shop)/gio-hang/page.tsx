'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CartLine } from '@/components/cart/cart-line';
import { FreeShipProgress } from '@/components/cart/cart-drawer';
import { CouponInput } from '@/components/cart/coupon-input';
import { SummaryRows } from '@/components/cart/order-summary';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { useCart, useTotals } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cart-store';

export default function CartPage() {
  const { hydrated, items, count } = useCart();
  const totals = useTotals('DELIVERY');
  const clear = useCartStore((s) => s.clear);

  if (!hydrated) {
    return (
      <div className="space-y-4 pt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pt-10">
        <EmptyState
          emoji="🛒"
          title="Giỏ hàng đang trống"
          description="Thêm món từ thực đơn — giỏ hàng được lưu lại kể cả khi bạn chưa đăng nhập."
          action={
            <Button asChild>
              <Link href="/thuc-don">Xem thực đơn</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="pt-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Giỏ hàng ({count})</h1>
        <button type="button" onClick={clear} className="text-sm text-muted-foreground hover:text-danger">
          Xóa tất cả
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-border bg-surface px-5 shadow-sm">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <CartLine key={item.key} item={item} />
            ))}
          </ul>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <FreeShipProgress subtotal={totals.subtotal} />
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <CouponInput discount={totals.coupon.discount} error={totals.coupon.error} checking={totals.coupon.checking} />
            <SummaryRows {...totals} shippingLabel="Phí giao hàng (dự kiến)" />
            <Button asChild size="lg" className="w-full">
              <Link href="/thanh-toan">
                Tiến hành thanh toán <ArrowRight />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
