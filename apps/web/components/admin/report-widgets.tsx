'use client';

import {
  PAYMENT_METHOD_LABEL,
  percentChange,
  type RevenuePoint,
  type RevenueReportDto,
  type TopProductDto,
} from '@foodhub/shared';
import { ArrowDownRight, ArrowUpRight, Minus, Table2, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { cn, formatVnd } from '@/lib/utils';

const dateVn = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('vi-VN', { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/** 63.315.800 → "63,3 tr"; 1.250.000.000 → "1,25 tỷ" — cho trục và ô số liệu */
export function compactVnd(n: number): string {
  const f = (v: number, d: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(v);
  if (Math.abs(n) >= 1e9) return `${f(n / 1e9, 2)} tỷ`;
  if (Math.abs(n) >= 1e6) return `${f(n / 1e6, 1)} tr`;
  if (Math.abs(n) >= 1e3) return `${f(n / 1e3, 0)}k`;
  return f(n, 0);
}

// ───────────── Ô số liệu ─────────────

export function KpiTile({
  label,
  value,
  current,
  previous,
  upIsGood = true,
  hint,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  /** Tỉ lệ hủy: tăng là xấu */
  upIsGood?: boolean;
  hint?: string;
}) {
  const delta = current != null && previous != null ? percentChange(current, previous) : null;
  const good = delta == null || delta === 0 ? null : (delta > 0) === upIsGood;
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-md">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {/* Số lớn đứng riêng: dùng chữ số tỉ lệ (không tabular) */}
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        {current != null && previous != null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              good === true && 'text-secondary',
              good === false && 'text-danger',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {delta == null ? 'chưa có kỳ trước' : `${delta > 0 ? '+' : ''}${delta.toLocaleString('vi-VN')}%`}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </p>
    </div>
  );
}

export function KpiRow({ report }: { report: RevenueReportDto }) {
  const s = report.summary;
  const p = report.previous;
  const cancelRate = s.orders ? (s.cancelled / s.orders) * 100 : 0;
  const prevCancelRate = p.orders ? (p.cancelled / p.orders) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Doanh thu" value={formatVnd(s.revenue)} current={s.revenue} previous={p.revenue} hint="so với kỳ trước" />
      <KpiTile label="Đơn hoàn thành" value={s.completed.toLocaleString('vi-VN')} current={s.completed} previous={p.completed} hint={`/ ${s.orders.toLocaleString('vi-VN')} đơn`} />
      <KpiTile label="Giá trị trung bình" value={formatVnd(s.avgOrderValue)} current={s.avgOrderValue} previous={p.avgOrderValue} hint="mỗi đơn" />
      <KpiTile
        label="Tỉ lệ hủy"
        value={`${cancelRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`}
        current={cancelRate}
        previous={prevCancelRate}
        upIsGood={false}
        hint={`${s.cancelled} đơn`}
      />
    </div>
  );
}

// ───────────── Biểu đồ doanh thu ─────────────

function RevenueTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const point = payload?.[0]?.payload as RevenuePoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {/* Giá trị là phần nổi bật; nhãn đứng sau */}
      <p className="text-sm font-semibold tabular-nums">{formatVnd(point.revenue)}</p>
      <p className="text-muted-foreground">{dateVn(point.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</p>
      <p className="mt-1 tabular-nums text-muted-foreground">
        {point.completed} hoàn thành · {point.cancelled} hủy · {point.orders} đơn
      </p>
    </div>
  );
}

export function RevenueChart({ series, faded }: { series: RevenuePoint[]; faded?: boolean }) {
  const colors = useChartColors();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const peak = series.reduce<RevenuePoint | null>((m, p) => (!m || p.revenue > m.revenue ? p : m), null);
  const tickEvery = Math.max(1, Math.ceil(series.length / 8));

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Doanh thu theo ngày</h2>
          <p className="text-xs text-muted-foreground">
            Đơn đã hoàn thành
            {peak && peak.revenue > 0 && (
              <> · cao nhất {formatVnd(peak.revenue)} ngày {dateVn(peak.date, { day: '2-digit', month: '2-digit' })}</>
            )}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Kiểu hiển thị">
          {(
            [
              ['chart', BarChart3, 'Biểu đồ'],
              ['table', Table2, 'Bảng'],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors duration-150',
                view === v ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Giữ khung khi tải lại: làm mờ thay vì nháy skeleton */}
      <div className={cn('mt-4 transition-opacity duration-200', faded && 'opacity-50')}>
        {view === 'chart' ? (
          <div className="h-64" role="img" aria-label={`Biểu đồ cột doanh thu ${series.length} ngày; xem dạng bảng để đọc số liệu`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                  interval={tickEvery - 1}
                  tick={{ fill: colors.axis, fontSize: 12 }}
                  tickFormatter={(d: string) => dateVn(d, { day: '2-digit', month: '2-digit' })}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: colors.axis, fontSize: 12 }}
                  tickFormatter={compactVnd}
                  allowDecimals={false}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: colors.grid, fillOpacity: 0.5 }} isAnimationActive={false} />
                <Bar
                  dataKey="revenue"
                  fill={colors.mark}
                  maxBarSize={24}
                  radius={[4, 4, 0, 0]}
                  activeBar={{ fillOpacity: 0.8 }}
                  animationDuration={400}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="relative max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Ngày</th>
                  <th className="py-2 text-right font-medium">Doanh thu</th>
                  <th className="py-2 text-right font-medium">Hoàn thành</th>
                  <th className="py-2 text-right font-medium">Hủy</th>
                  <th className="py-2 text-right font-medium">Tổng đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {[...series].reverse().map((p) => (
                  <tr key={p.date}>
                    <td className="py-1.5">{dateVn(p.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                    <td className="py-1.5 text-right">{formatVnd(p.revenue)}</td>
                    <td className="py-1.5 text-right">{p.completed}</td>
                    <td className="py-1.5 text-right">{p.cancelled}</td>
                    <td className="py-1.5 text-right">{p.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ───────────── Phương thức thanh toán ─────────────

/** Một màu (độ lớn), nhãn và giá trị bằng màu chữ — danh tính nằm ở nhãn, không ở màu. */
export function PaymentBreakdown({ rows }: { rows: RevenueReportDto['byPayment'] }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-md">
      <h2 className="text-sm font-semibold">Theo phương thức thanh toán</h2>
      <p className="text-xs text-muted-foreground">Doanh thu đơn hoàn thành</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Chưa có đơn hoàn thành trong khoảng này.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.method}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{PAYMENT_METHOD_LABEL[r.method]}</span>
                <span className="tabular-nums">
                  <strong className="font-semibold">{compactVnd(r.revenue)}</strong>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {total ? Math.round((r.revenue / total) * 100) : 0}% · {r.orders} đơn
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-chart" style={{ width: `${(r.revenue / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────────── Món bán chạy ─────────────

export function TopProductsTable({ rows, title = 'Món bán chạy' }: { rows: TopProductDto[]; title?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-md">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">Theo doanh thu, đơn đã hoàn thành</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-6 py-2 font-medium">#</th>
              <th className="py-2 font-medium">Món</th>
              <th className="py-2 text-right font-medium">SL</th>
              <th className="py-2 text-right font-medium">Doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={r.productId ?? r.name}>
                <td className="py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="py-2">
                  <span className="block">{r.name}</span>
                  <span className="mt-1 block h-1 rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-chart" style={{ width: `${(r.revenue / max) * 100}%` }} />
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{r.quantity.toLocaleString('vi-VN')}</td>
                <td className="py-2 text-right tabular-nums">{compactVnd(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ───────────── Bộ lọc khoảng ngày ─────────────

export const RANGE_PRESETS = [
  { key: '7', label: '7 ngày' },
  { key: '30', label: '30 ngày' },
  { key: '90', label: '90 ngày' },
] as const;

export function DateRangeFilter({
  preset,
  from,
  to,
  onPreset,
  onCustom,
}: {
  preset: string | null;
  from: string;
  to: string;
  onPreset: (days: string) => void;
  onCustom: (from: string, to: string) => void;
}) {
  const input =
    'h-8 rounded-lg border border-border bg-background px-2 text-sm tabular-nums text-foreground focus:border-primary focus:shadow-ring focus:outline-none';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-border bg-surface p-0.5" role="group" aria-label="Khoảng thời gian">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={preset === p.key}
            onClick={() => onPreset(p.key)}
            className={cn(
              'h-7 rounded-lg px-3 text-sm transition-colors duration-150',
              preset === p.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        Từ
        <input type="date" className={input} value={from} max={to} onChange={(e) => e.target.value && onCustom(e.target.value, to)} />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        đến
        <input type="date" className={input} value={to} min={from} onChange={(e) => e.target.value && onCustom(from, e.target.value)} />
      </label>
    </div>
  );
}
