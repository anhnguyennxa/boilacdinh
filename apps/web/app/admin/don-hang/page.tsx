'use client';

import {
  nextStatuses,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderDto,
  type OrderStatus,
  type Paginated,
} from '@foodhub/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, MapPin, Phone, RefreshCw, Search, Store } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { StatCard } from '@/components/admin/stat-card';
import { OrderStatusBadge } from '@/components/order/order-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, EmptyState, Skeleton } from '@/components/ui/misc';
import { useStaffSocket } from '@/hooks/useOrderSocket';
import { api, apiRaw } from '@/lib/api-client';
import { cn, formatDateTime, formatVnd } from '@/lib/utils';

const FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PREPARING', label: 'Đang làm' },
  { value: 'DELIVERING', label: 'Đang giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Xác nhận',
  PREPARING: 'Bắt đầu làm',
  DELIVERING: 'Giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Hủy',
};

function OrderCard({ order }: { order: OrderDto }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (status: OrderStatus) =>
      api<OrderDto>(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (o) => {
      toast.success(`${o.code} → ${ORDER_STATUS_LABEL[o.status]}`);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const actions = nextStatuses(order.status, order.deliveryType);
  const online = order.paymentMethod !== 'COD';
  const awaitingPayment = online && order.paymentStatus !== 'PAID';
  const needsRefund = online && order.status === 'CANCELLED' && order.paymentStatus === 'PAID';

  return (
    <article
      className={cn(
        'flex animate-rise-in flex-col rounded-2xl border bg-surface p-4 shadow-md',
        order.status === 'PENDING' ? 'border-primary/50 shadow-ring' : 'border-border',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/don-hang/${order.code}`} className="font-mono font-semibold hover:text-primary">
            {order.code}
          </Link>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <Badge tone={needsRefund ? 'danger' : order.paymentStatus === 'PAID' ? 'secondary' : order.paymentStatus === 'FAILED' ? 'danger' : 'neutral'}>
            {needsRefund
              ? 'Cần hoàn tiền'
              : `${PAYMENT_METHOD_LABEL[order.paymentMethod]}${online || order.paymentStatus === 'PAID' ? ` · ${PAYMENT_STATUS_LABEL[order.paymentStatus]}` : ''}`}
          </Badge>
        </div>
      </header>

      <div className="mt-3 space-y-1 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          {order.deliveryType === 'DELIVERY' ? <Bike className="size-4 text-muted-foreground" /> : <Store className="size-4 text-muted-foreground" />}
          {order.customerName}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Phone className="size-4" />
          <a href={`tel:${order.customerPhone}`} className="hover:underline">{order.customerPhone}</a>
        </p>
        {order.address && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {[order.address.street, order.address.ward, order.address.district].join(', ')}
          </p>
        )}
      </div>

      <ul className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            <span className="font-semibold">{i.quantity}×</span> {i.productName}
            {i.options.length > 0 && <span className="text-muted-foreground"> ({i.options.map((o) => o.name).join(', ')})</span>}
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2 rounded-lg bg-muted px-2 py-1 text-sm">📝 {order.note}</p>}

      <footer className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="font-semibold tabular-nums">{formatVnd(order.total)}</span>
        <div className="flex gap-1.5">
          {actions.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === 'CANCELLED' ? 'ghost' : 'primary'}
              className={s === 'CANCELLED' ? 'text-danger' : undefined}
              disabled={update.isPending || (s === 'CONFIRMED' && awaitingPayment)}
              title={s === 'CONFIRMED' && awaitingPayment ? 'Khách chưa thanh toán online' : undefined}
              onClick={() => {
                if (s === 'CANCELLED' && !window.confirm(`Hủy đơn ${order.code}?`)) return;
                update.mutate(s);
              }}
            >
              {ACTION_LABEL[s]}
            </Button>
          ))}
        </div>
      </footer>
    </article>
  );
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim());

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders', status, term],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '50', ...(status ? { status } : {}), ...(term ? { q: term } : {}) });
      return apiRaw<Paginated<OrderDto>>(`/admin/orders?${qs}`);
    },
    placeholderData: keepPreviousData,
  });
  const recent = useQuery({
    queryKey: ['admin-orders', 'stats'],
    queryFn: () => apiRaw<Paginated<OrderDto>>('/admin/orders?limit=100'),
  });

  useStaffSocket({
    onCreated: (o) => {
      toast.success(`🛎️ Đơn mới ${o.code} · ${formatVnd(o.total)}`, { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onUpdated: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const today = new Date().toDateString();
  const todays = (recent.data?.data ?? []).filter((o) => new Date(o.createdAt).toDateString() === today);
  const revenue = todays.filter((o) => o.status === 'COMPLETED').reduce((s, o) => s + o.total, 0);
  const active = (recent.data?.data ?? []).filter((o) => ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING'].includes(o.status));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Đơn hàng</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
          {!isFetching && <RefreshCw />} Làm mới
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Đơn hôm nay" value={todays.length} />
        <StatCard label="Đang xử lý" value={active.length} tone="primary" />
        <StatCard label="Chờ xác nhận" value={active.filter((o) => o.status === 'PENDING').length} tone="primary" />
        <StatCard label="Doanh thu hôm nay" value={formatVnd(revenue)} hint="Đơn đã hoàn thành" tone="secondary" />
      </div>

      <label className="relative mt-6 block max-w-sm">
        <span className="sr-only">Tìm đơn</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mã đơn, số điện thoại hoặc tên khách"
          className="h-8 pl-9"
        />
      </label>

      <div className="relative -mx-4 mt-3 overflow-x-auto px-4 scrollbar-none">
        <div className="flex w-max gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'h-8 rounded-xl border px-3 text-sm transition-colors duration-150',
                status === f.value ? 'border-border-strong bg-muted text-foreground' : 'border-transparent text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : data?.data.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.data.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        ) : (
          <EmptyState emoji="🛎️" title="Chưa có đơn nào" description="Đơn mới sẽ tự hiện ở đây theo thời gian thực." />
        )}
      </div>
    </div>
  );
}
