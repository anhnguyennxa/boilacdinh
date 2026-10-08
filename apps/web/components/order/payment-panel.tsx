'use client';

import { PAYMENT_METHOD_LABEL, type OrderDto } from '@foodhub/shared';
import { AlertTriangle, CreditCard, TimerReset } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { redirectToPayment, useCountdown, usePaymentMethods } from '@/hooks/usePayment';
import { formatVnd } from '@/lib/utils';

/** Hiện khi đơn VNPay/MoMo còn chờ thanh toán: đếm ngược hạn và nút thanh toán (lại). */
export function PaymentPanel({ order }: { order: OrderDto }) {
  const methods = usePaymentMethods().data;
  const [loading, setLoading] = useState(false);
  const online = order.paymentMethod !== 'COD';
  const waiting = online && order.status === 'PENDING' && order.paymentStatus !== 'PAID';
  const deadline = waiting && methods ? new Date(order.createdAt).getTime() + methods.ttlMinutes * 60_000 : null;
  const left = useCountdown(deadline);

  if (!waiting || order.paymentMethod === 'COD') return null;
  const expired = left !== null && left <= 60;
  const failed = order.paymentStatus === 'FAILED';
  const mm = left !== null ? String(Math.floor(left / 60)).padStart(2, '0') : '--';
  const ss = left !== null ? String(left % 60).padStart(2, '0') : '--';

  async function pay() {
    setLoading(true);
    try {
      await redirectToPayment(order.id, order.paymentMethod as 'VNPAY' | 'MOMO');
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <section
      className={
        failed
          ? 'animate-rise-in space-y-3 rounded-2xl border border-danger/40 bg-danger/10 p-4'
          : 'animate-rise-in space-y-3 rounded-2xl border border-primary/40 bg-primary-soft p-4'
      }
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {failed ? <AlertTriangle className="mt-0.5 size-5 text-danger" /> : <CreditCard className="mt-0.5 size-5 text-primary" />}
        <div className="flex-1">
          <p className="font-semibold">
            {failed ? 'Thanh toán chưa thành công' : `Chờ thanh toán qua ${PAYMENT_METHOD_LABEL[order.paymentMethod]}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {expired
              ? 'Đơn sắp hết hạn thanh toán và sẽ tự hủy.'
              : `Cửa hàng bắt đầu làm món sau khi nhận được ${formatVnd(order.total)}.`}
          </p>
        </div>
        {!expired && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-xs tabular-nums text-foreground" title="Thời gian còn lại">
            <TimerReset className="size-3.5" /> {mm}:{ss}
          </span>
        )}
      </div>
      {!expired && (
        <Button className="w-full" size="lg" onClick={pay} loading={loading}>
          {failed ? 'Thử thanh toán lại' : 'Thanh toán ngay'} · {formatVnd(order.total)}
        </Button>
      )}
    </section>
  );
}
