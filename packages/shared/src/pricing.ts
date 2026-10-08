import type { CouponType, DeliveryType } from './enums';

export const SHIPPING_FEE = 15_000;
export const FREE_SHIPPING_MIN = 200_000;

export function shippingFee(deliveryType: DeliveryType, subtotal: number): number {
  if (deliveryType === 'PICKUP') return 0;
  return subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
}

export interface CouponRule {
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
}

/** Số tiền giảm, làm tròn xuống tới đồng, không vượt quá tạm tính. */
export function couponDiscount(rule: CouponRule, subtotal: number): number {
  if (subtotal < rule.minOrder) return 0;
  let discount = rule.type === 'PERCENT' ? Math.floor((subtotal * rule.value) / 100) : rule.value;
  if (rule.maxDiscount != null) discount = Math.min(discount, rule.maxDiscount);
  return Math.min(discount, subtotal);
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

export function orderTotals(input: {
  subtotal: number;
  discount: number;
  deliveryType: DeliveryType;
}) {
  const fee = shippingFee(input.deliveryType, input.subtotal);
  return {
    subtotal: input.subtotal,
    discount: input.discount,
    shippingFee: fee,
    total: input.subtotal - input.discount + fee,
  };
}

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
export function formatVnd(amount: number): string {
  return vnd.format(amount);
}
