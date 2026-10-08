import { BadRequestException } from '@nestjs/common';

const DAY = 24 * 3600_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function todayVn(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/**
 * Chuẩn hóa khoảng ngày báo cáo (tính theo giờ Việt Nam, hai đầu đều tính).
 * Mặc định 30 ngày gần nhất; tối đa 366 ngày. Trả kèm khoảng liền trước cùng độ dài để so sánh.
 */
export function resolveRange(from?: string, to?: string, now = new Date()) {
  const end = to ?? todayVn(now);
  const start = from ?? shift(end, -29);
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    throw new BadRequestException('Ngày phải có dạng YYYY-MM-DD');
  }
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1;
  if (days < 1) throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
  if (days > 366) throw new BadRequestException('Khoảng báo cáo tối đa 366 ngày');
  return {
    from: start,
    to: end,
    days,
    previous: { from: shift(start, -days), to: shift(start, -1) },
  };
}
