import type { PaymentMethod } from './enums';

/** "Phở bò tái nạm" → "pho-bo-tai-nam". Dùng cho slug món/danh mục. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Ảnh món: URL https (Cloudinary/S3) hoặc đường dẫn file đã tải lên server (/uploads/...). */
export const IMAGE_URL_PATTERN = /^(https:\/\/[^\s]+|\/uploads\/[\w./-]+)$/;

export interface RevenuePoint {
  /** YYYY-MM-DD theo giờ Việt Nam */
  date: string;
  revenue: number;
  orders: number;
  completed: number;
  cancelled: number;
}

export interface RevenueSummary {
  revenue: number;
  orders: number;
  completed: number;
  cancelled: number;
  /** Giá trị trung bình đơn hoàn thành */
  avgOrderValue: number;
}

export interface RevenueReportDto {
  from: string;
  to: string;
  series: RevenuePoint[];
  summary: RevenueSummary;
  /** Cùng độ dài, ngay trước khoảng đang xem — để tính % tăng/giảm */
  previous: RevenueSummary;
  byPayment: { method: PaymentMethod; orders: number; revenue: number }[];
}

export interface TopProductDto {
  productId: string | null;
  name: string;
  quantity: number;
  revenue: number;
}

/** % thay đổi so với kỳ trước; null khi kỳ trước bằng 0 (không so được). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
