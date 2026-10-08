'use client';

import type { OrderDto, Paginated } from '@foodhub/shared';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { OrderStatusBadge } from '@/components/order/order-status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { apiRaw } from '@/lib/api-client';
import { formatDateTime, formatVnd } from '@/lib/utils';

export default function MyOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => apiRaw<Paginated<OrderDto>>(`/orders/me?page=${page}&limit=10`),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data?.data.length) {
    return (
      <EmptyState
        emoji="🧾"
        title="Bạn chưa có đơn nào"
        action={
          <Button asChild>
            <Link href="/thuc-don">Đặt món đầu tiên</Link>
          </Button>
        }
      />
    );
  }

  const pages = Math.ceil(data.meta.total / data.meta.limit);
  return (
    <div className="space-y-3">
      {data.data.map((o) => (
        <Link
          key={o.id}
          href={`/don-hang/${o.code}`}
          className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{o.code}</span>
              <OrderStatusBadge status={o.status} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
          </div>
          <span className="font-semibold tabular-nums">{formatVnd(o.total)}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      ))}
      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trước
          </Button>
          <span className="grid place-items-center px-2 text-sm">
            {page}/{pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
