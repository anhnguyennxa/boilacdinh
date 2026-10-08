'use client';

import type { RevenueReportDto, TopProductDto } from '@foodhub/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const DAY = 86_400_000;

/** Hôm nay theo giờ Việt Nam (YYYY-MM-DD), độc lập múi giờ máy người xem. */
export function todayVn(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function daysBefore(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * DAY).toISOString().slice(0, 10);
}

/** ?days=30 hoặc ?from=…&to=… → khoảng ngày cụ thể */
export function rangeFromParams(params: URLSearchParams, defaultDays = 30) {
  const from = params.get('from');
  const to = params.get('to');
  if (from && to) return { from, to, preset: null as string | null };
  const days = params.get('days') ?? String(defaultDays);
  const end = todayVn();
  return { from: daysBefore(end, Number(days) - 1), to: end, preset: days };
}

export function useRevenueReport(from: string, to: string) {
  return useQuery({
    queryKey: ['report', 'revenue', from, to],
    queryFn: () => api<RevenueReportDto>(`/admin/reports/revenue?from=${from}&to=${to}`),
    placeholderData: keepPreviousData, // giữ khung cũ khi đổi khoảng ngày
  });
}

export function useTopProducts(from: string, to: string, limit = 10) {
  return useQuery({
    queryKey: ['report', 'top', from, to, limit],
    queryFn: () => api<TopProductDto[]>(`/admin/reports/top-products?from=${from}&to=${to}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}
