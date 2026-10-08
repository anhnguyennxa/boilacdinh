import { ORDER_STATUS_LABEL, statusFlow, type DeliveryType, type OrderStatus } from '@foodhub/shared';
import { Bike, Check, ChefHat, ClipboardCheck, PackageCheck, Receipt, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  PENDING: Receipt,
  CONFIRMED: ClipboardCheck,
  PREPARING: ChefHat,
  DELIVERING: Bike,
  COMPLETED: PackageCheck,
  CANCELLED: XCircle,
};

const HINT: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Cửa hàng sẽ xác nhận trong ít phút',
  CONFIRMED: 'Đơn đã được tiếp nhận',
  PREPARING: 'Bếp đang làm món cho bạn',
  DELIVERING: 'Tài xế đang trên đường giao',
  COMPLETED: 'Chúc bạn ngon miệng!',
};

export function OrderStatusTimeline({
  status,
  deliveryType,
  awaitingPayment = false,
}: {
  status: OrderStatus;
  deliveryType: DeliveryType;
  /** Đơn VNPay/MoMo chưa trả: bước đầu chờ thanh toán thay vì chờ cửa hàng */
  awaitingPayment?: boolean;
}) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-danger/10 p-4 text-danger">
        <XCircle className="size-6" />
        <p className="font-semibold">Đơn hàng đã bị hủy</p>
      </div>
    );
  }

  const steps = statusFlow(deliveryType);
  const current = steps.indexOf(status);
  const last = deliveryType === 'PICKUP' ? { COMPLETED: 'Đã nhận món' } : {};

  return (
    <ol className="relative grid gap-0" aria-label="Tiến trình đơn hàng">
      {steps.map((s, i) => {
        const Icon = ICONS[s];
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn('absolute left-4 top-8 h-[calc(100%-2rem)] w-px -translate-x-1/2 transition-colors duration-500', done ? 'bg-secondary' : 'bg-border')}
              />
            )}
            <span
              className={cn(
                'relative z-[1] grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ease-out',
                done && 'border-secondary bg-secondary text-secondary-foreground',
                active && 'border-primary bg-primary text-primary-foreground shadow-ring',
                !done && !active && 'border-border bg-surface text-muted-foreground',
              )}
            >
              {done ? <Check className="size-5" /> : <Icon className="size-5" />}
              {active && s !== 'COMPLETED' && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" aria-hidden />
              )}
            </span>
            <div className="pt-1.5">
              <p className={cn('font-semibold', !done && !active && 'text-muted-foreground')}>
                {(last as Record<string, string>)[s] ?? ORDER_STATUS_LABEL[s]}
              </p>
              {active && (s === 'PENDING' && awaitingPayment ? (
                <p className="text-sm text-muted-foreground">Đang chờ bạn thanh toán</p>
              ) : (
                HINT[s] && <p className="text-sm text-muted-foreground">{HINT[s]}</p>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
