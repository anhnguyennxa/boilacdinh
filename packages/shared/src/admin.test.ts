import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE_URL_PATTERN, percentChange, slugify, SLUG_PATTERN } from './admin';

test('slugify tiếng Việt', () => {
  assert.equal(slugify('Phở bò tái nạm'), 'pho-bo-tai-nam');
  assert.equal(slugify('Đồ uống — Trà sữa (size L)!'), 'do-uong-tra-sua-size-l');
  assert.equal(slugify('  Bánh   mì  '), 'banh-mi');
  assert.ok(SLUG_PATTERN.test(slugify('Cà phê muối 2024')));
});

test('đường dẫn ảnh hợp lệ', () => {
  assert.ok(IMAGE_URL_PATTERN.test('/uploads/2026/10/abc.webp'));
  assert.ok(IMAGE_URL_PATTERN.test('https://res.cloudinary.com/demo/image/upload/x.jpg'));
  assert.ok(!IMAGE_URL_PATTERN.test('http://insecure.example/x.jpg'));
  assert.ok(!IMAGE_URL_PATTERN.test('javascript:alert(1)'));
  assert.ok(!IMAGE_URL_PATTERN.test('/etc/passwd'));
});

test('% thay đổi', () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
});
