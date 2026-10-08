import type { CouponType } from './enums';

/** Mã giảm giá công khai hiện trên trang chủ. */
export interface PromoDto {
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  description: string | null;
  endsAt: string;
  /** null = không giới hạn lượt */
  remaining: number | null;
}

const k = (n: number) => (n % 1000 === 0 ? `${n / 1000}k` : new Intl.NumberFormat('vi-VN').format(n) + 'đ');

/** "10%" hoặc "20k" — con số lớn trên thẻ ưu đãi. */
export function promoValueLabel(p: Pick<PromoDto, 'type' | 'value'>): string {
  return p.type === 'PERCENT' ? `${p.value}%` : k(p.value);
}

/** "Giảm 10%, tối đa 30k" */
export function promoHeadline(p: Pick<PromoDto, 'type' | 'value' | 'maxDiscount'>): string {
  const base = `Giảm ${promoValueLabel(p)}`;
  return p.type === 'PERCENT' && p.maxDiscount ? `${base}, tối đa ${k(p.maxDiscount)}` : base;
}

/** "Đơn từ 50k" / "Mọi đơn hàng" */
export function promoCondition(p: Pick<PromoDto, 'minOrder'>): string {
  return p.minOrder > 0 ? `Đơn từ ${k(p.minOrder)}` : 'Mọi đơn hàng';
}

/** Ưu đãi "đáng giá" nhất để làm thẻ chính: ưu tiên mức giảm tối đa có thể nhận được. */
export function promoWeight(p: Pick<PromoDto, 'type' | 'value' | 'maxDiscount' | 'minOrder'>): number {
  const ceiling = p.type === 'PERCENT' ? (p.maxDiscount ?? Math.round((p.value / 100) * 500_000)) : p.value;
  // Đơn tối thiểu càng thấp càng dễ dùng
  return ceiling - p.minOrder / 20;
}
