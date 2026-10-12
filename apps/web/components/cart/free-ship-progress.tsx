import { FREE_SHIPPING_MIN } from '@foodhub/shared';
import { formatVnd } from '@/lib/utils';

export function FreeShipProgress({ subtotal }: { subtotal: number }) {
  const left = FREE_SHIPPING_MIN - subtotal;
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100);
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs">
      <p className="text-muted-foreground">
        {left > 0 ? (
          <>
            Thêm <strong className="font-medium text-foreground">{formatVnd(left)}</strong> để được miễn phí giao hàng
          </>
        ) : (
          <strong className="font-medium text-secondary">Đơn của bạn được miễn phí giao hàng</strong>
        )}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-secondary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
