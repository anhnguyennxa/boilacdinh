'use client';

import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, type OrderDto } from '@foodhub/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MapPin, Phone, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect } from 'react';
import { toast } from 'sonner';
import { SummaryRows } from '@/components/cart/order-summary';
import { OrderItems } from '@/components/order/order-items';
import { OrderStatusTimeline } from '@/components/order/order-status-timeline';
import { PaymentPanel } from '@/components/order/payment-panel';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { api, ApiError } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

export default function OrderTrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((s) => s.status);

  const { data: order, error, isLoading } = useQuery({
    queryKey: ['order', code],
    // Chờ khôi phục phiên xong để gửi kèm token (đơn của thành viên cần xác thực)
    enabled: authStatus !== 'loading',
    queryFn: () => api<OrderDto>(`/orders/${code}`),
    retry: false,
  });

  useOrderSocket(code, (updated) => {
    const prev = queryClient.getQueryData<OrderDto>(['order', code]);
    queryClient.setQueryData(['order', code], updated);
    if (prev && prev.paymentStatus !== updated.paymentStatus && updated.paymentStatus === 'PAID') {
      toast.success('Đã nhận thanh toán — cửa hàng sẽ xác nhận đơn ngay');
    } else if (!prev || prev.status !== updated.status) {
      toast.info(`Đơn ${updated.code}: ${ORDER_STATUS_LABEL[updated.status].toLowerCase()}`);
    }
  });

  // Kết quả khi quay về từ cổng thanh toán (?payment=success|failed): báo một lần rồi xóa khỏi URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentResult = searchParams.get('payment');
  useEffect(() => {
    if (!paymentResult) return;
    if (paymentResult === 'success') toast.success('Thanh toán thành công!');
    else toast.error('Thanh toán chưa thành công, bạn có thể thử lại.');
    router.replace(`/don-hang/${code}`, { scroll: false });
  }, [paymentResult, code, router]);

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <div className="pt-10">
        <EmptyState
          emoji={status === 403 ? '🔒' : '🧐'}
          title={status === 403 ? 'Đăng nhập để xem đơn này' : 'Không tìm thấy đơn hàng'}
          description={status === 403 ? 'Đơn hàng thuộc về một tài khoản thành viên.' : `Kiểm tra lại mã đơn ${code}.`}
          action={
            <Button asChild>
              <Link href={status === 403 ? `/dang-nhap?next=/don-hang/${code}` : '/thuc-don'}>
                {status === 403 ? 'Đăng nhập' : 'Về thực đơn'}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Đơn hàng</h1>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(order.code).then(() => toast.success('Đã sao chép mã đơn'))}
          className="inline-flex h-7 items-center gap-2 rounded-lg border border-border bg-surface px-2 font-mono text-xs text-foreground transition-colors duration-150 hover:border-border-strong"
          aria-label="Sao chép mã đơn"
        >
          {order.code} <Copy className="size-3.5" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Đặt lúc {formatDateTime(order.createdAt)} · Lưu lại đường dẫn này để theo dõi đơn.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <PaymentPanel order={order} />
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-live="polite">
            <OrderStatusTimeline
              status={order.status}
              deliveryType={order.deliveryType}
              awaitingPayment={order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID'}
            />
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{order.deliveryType === 'DELIVERY' ? 'Giao đến' : 'Nhận tại quầy'}</h2>
              <Badge tone={order.paymentStatus === 'PAID' ? 'secondary' : order.paymentStatus === 'FAILED' ? 'danger' : 'neutral'}>
                {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </Badge>
            </div>
            <p className="font-semibold">{order.customerName}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" /> {order.customerPhone}
            </p>
            {order.address ? (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {[order.address.street, order.address.ward, order.address.district, order.address.city].join(', ')}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Store className="size-4" /> Đọc mã đơn cho nhân viên khi đến nhận
              </p>
            )}
            {order.note && <p className="rounded-xl bg-muted px-3 py-2">📝 {order.note}</p>}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-semibold">Món đã đặt</h2>
            <OrderItems items={order.items} />
            <SummaryRows {...order} className="mt-2" />
          </section>
        </div>
      </div>
    </div>
  );
}
