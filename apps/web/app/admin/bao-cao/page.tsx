'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AdminOnly } from '@/components/admin/admin-only';
import { DateRangeFilter, KpiRow, PaymentBreakdown, RevenueChart, TopProductsTable } from '@/components/admin/report-widgets';
import { Skeleton } from '@/components/ui/misc';
import { rangeFromParams, useRevenueReport, useTopProducts } from '@/hooks/useReports';

function Report() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { from, to, preset } = rangeFromParams(params);
  const revenue = useRevenueReport(from, to);
  const top = useTopProducts(from, to);
  const refetching = revenue.isPlaceholderData || top.isPlaceholderData;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Báo cáo doanh thu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Theo giờ Việt Nam · so với khoảng liền trước cùng độ dài</p>
        </div>
      </div>
      {/* Bộ lọc một hàng phía trên, áp cho mọi số liệu bên dưới */}
      <DateRangeFilter
        preset={preset}
        from={from}
        to={to}
        onPreset={(days) => router.replace(`${pathname}?days=${days}`, { scroll: false })}
        onCustom={(f, t) => router.replace(`${pathname}?from=${f}&to=${t}`, { scroll: false })}
      />

      {revenue.error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{revenue.error.message}</p>}

      {revenue.data ? (
        <div className={refetching ? 'space-y-4 opacity-60 transition-opacity' : 'space-y-4 transition-opacity'}>
          <KpiRow report={revenue.data} />
          <RevenueChart series={revenue.data.series} />
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <PaymentBreakdown rows={revenue.data.byPayment} />
            <TopProductsTable rows={top.data ?? []} />
          </div>
        </div>
      ) : (
        !revenue.error && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-80" />
          </div>
        )
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <AdminOnly>
      <Suspense>
        <Report />
      </Suspense>
    </AdminOnly>
  );
}
