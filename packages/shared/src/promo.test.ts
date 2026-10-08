import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promoCondition, promoHeadline, promoValueLabel, promoWeight } from './promo';

test('nhãn giá trị ưu đãi', () => {
  assert.equal(promoValueLabel({ type: 'PERCENT', value: 10 }), '10%');
  assert.equal(promoValueLabel({ type: 'FIXED', value: 20_000 }), '20k');
  assert.equal(promoValueLabel({ type: 'FIXED', value: 12_500 }), '12.500đ');
});

test('tiêu đề và điều kiện', () => {
  assert.equal(promoHeadline({ type: 'PERCENT', value: 10, maxDiscount: 30_000 }), 'Giảm 10%, tối đa 30k');
  assert.equal(promoHeadline({ type: 'FIXED', value: 20_000, maxDiscount: null }), 'Giảm 20k');
  assert.equal(promoCondition({ minOrder: 150_000 }), 'Đơn từ 150k');
  assert.equal(promoCondition({ minOrder: 0 }), 'Mọi đơn hàng');
});

test('ưu đãi giảm được nhiều hơn xếp trước', () => {
  const pct = promoWeight({ type: 'PERCENT', value: 10, maxDiscount: 30_000, minOrder: 50_000 });
  const fixed = promoWeight({ type: 'FIXED', value: 20_000, maxDiscount: null, minOrder: 150_000 });
  assert.ok(pct > fixed);
});
