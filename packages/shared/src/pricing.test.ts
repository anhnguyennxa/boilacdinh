import { test } from 'node:test';
import assert from 'node:assert/strict';
import { couponDiscount, orderTotals, shippingFee } from './pricing';
import { nextStatuses } from './enums';

test('phí ship: nhận tại quầy miễn phí, đơn từ 200k miễn phí', () => {
  assert.equal(shippingFee('PICKUP', 50_000), 0);
  assert.equal(shippingFee('DELIVERY', 199_000), 15_000);
  assert.equal(shippingFee('DELIVERY', 200_000), 0);
});

test('coupon phần trăm bị chặn bởi max_discount', () => {
  const rule = { type: 'PERCENT' as const, value: 20, minOrder: 100_000, maxDiscount: 30_000 };
  assert.equal(couponDiscount(rule, 90_000), 0);
  assert.equal(couponDiscount(rule, 100_000), 20_000);
  assert.equal(couponDiscount(rule, 500_000), 30_000);
});

test('coupon cố định không vượt tạm tính', () => {
  const rule = { type: 'FIXED' as const, value: 50_000, minOrder: 0, maxDiscount: null };
  assert.equal(couponDiscount(rule, 30_000), 30_000);
});

test('tổng đơn = tạm tính - giảm + ship', () => {
  assert.deepEqual(orderTotals({ subtotal: 100_000, discount: 10_000, deliveryType: 'DELIVERY' }), {
    subtotal: 100_000,
    discount: 10_000,
    shippingFee: 15_000,
    total: 105_000,
  });
});

test('đơn nhận tại quầy bỏ qua DELIVERING', () => {
  assert.deepEqual(nextStatuses('PREPARING', 'PICKUP'), ['COMPLETED', 'CANCELLED']);
  assert.deepEqual(nextStatuses('PREPARING', 'DELIVERY'), ['DELIVERING', 'CANCELLED']);
  assert.deepEqual(nextStatuses('COMPLETED', 'DELIVERY'), []);
});
