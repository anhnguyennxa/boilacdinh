import { cn, formatVnd } from '@/lib/utils';

export function SummaryRows({
  subtotal,
  discount,
  shippingFee,
  total,
  shippingLabel = 'Phí giao hàng',
  className,
}: {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shippingLabel?: string;
  className?: string;
}) {
  return (
    <dl className={cn('space-y-2 text-sm', className)}>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Tạm tính</dt>
        <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-secondary">
          <dt>Giảm giá</dt>
          <dd className="tabular-nums">−{formatVnd(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{shippingLabel}</dt>
        <dd className="tabular-nums">{shippingFee ? formatVnd(shippingFee) : 'Miễn phí'}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
        <dt>Tổng cộng</dt>
        <dd className="tabular-nums text-foreground">{formatVnd(total)}</dd>
      </div>
    </dl>
  );
}
