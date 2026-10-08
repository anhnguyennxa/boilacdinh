'use client';

import { ArrowRight, ClipboardList, Plus, TicketPercent } from 'lucide-react';
import Link from 'next/link';
import { AdminOnly } from '@/components/admin/admin-only';
import { KpiTile, RevenueChart, TopProductsTable } from '@/components/admin/report-widgets';
import { Skeleton } from '@/components/ui/misc';
import { daysBefore, todayVn, useRevenueReport, useTopProducts } from '@/hooks/useReports';
import { formatVnd } from '@/lib/utils';

const QUICK = [
  { href: '/admin/don-hang', label: 'Xử lý đơn hàng', icon: ClipboardList },
  { href: '/admin/mon/moi', label: 'Thêm món mới', icon: Plus },
  { href: '/admin/khuyen-mai', label: 'Tạo mã giảm giá', icon: TicketPercent },
];

function Overview() {
  const today = todayVn();
  const todayReport = useRevenueReport(today, today); // kỳ trước = hôm qua
  const twoWeeks = useRevenueReport(daysBefore(today, 13), today);
  const top = useTopProducts(daysBefore(today, 6), today, 5);
  const t = todayReport.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tổng quan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hôm nay so với hôm qua</p>
        </div>
        <Link href="/admin/bao-cao" className="inline-flex items-center gap-1 text-sm text-primary transition-colors duration-150 hover:text-foreground">
          Báo cáo chi tiết <ArrowRight className="size-4" />
        </Link>
      </div>

      {t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Doanh thu hôm nay" value={formatVnd(t.summary.revenue)} current={t.summary.revenue} previous={t.previous.revenue} hint="so với hôm qua" />
          <KpiTile label="Đơn hôm nay" value={t.summary.orders.toLocaleString('vi-VN')} current={t.summary.orders} previous={t.previous.orders} />
          <KpiTile label="Đã hoàn thành" value={t.summary.completed.toLocaleString('vi-VN')} current={t.summary.completed} previous={t.previous.completed} />
          <KpiTile label="Giá trị trung bình" value={formatVnd(t.summary.avgOrderValue)} current={t.summary.avgOrderValue} previous={t.previous.avgOrderValue} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {twoWeeks.data ? <RevenueChart series={twoWeeks.data.series} /> : <Skeleton className="h-80" />}
        <div className="space-y-4">
          <TopProductsTable rows={top.data ?? []} title="Bán chạy 7 ngày" />
          <nav className="rounded-2xl border border-border bg-surface p-2 shadow-md" aria-label="Lối tắt">
            {QUICK.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" /> {label}
                <ArrowRight className="ml-auto size-3.5" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function AdminHome() {
  return (
    <AdminOnly>
      <Overview />
    </AdminOnly>
  );
}
