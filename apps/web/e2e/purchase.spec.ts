import { expect, test } from '@playwright/test';
import { setOrderStatus, staffApi } from './api';

/** Đơn tạo trong lúc test — hủy ở cuối để không lẫn vào doanh thu thật */
const createdOrders: string[] = [];

test.afterAll(async () => {
  if (!createdOrders.length) return;
  const api = await staffApi();
  for (const code of createdOrders) await setOrderStatus(api, code, 'CANCELLED');
});

test('khách vãng lai: chọn món có tùy chọn → giỏ hàng + mã giảm giá → đặt món → theo dõi đơn realtime', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Đặt món ngay' }).click();
  await expect(page).toHaveURL(/\/thuc-don/);

  // Mở một món trà sữa (có nhóm tùy chọn bắt buộc)
  await page.goto('/thuc-don/tra-sua');
  await page.locator('main a[href^="/mon/"]').first().click();
  await expect(page).toHaveURL(/\/mon\//);
  const productName = (await page.getByRole('heading', { level: 1 }).textContent())?.trim() ?? '';

  // Nhóm bắt buộc đã chọn sẵn lựa chọn đầu; đổi sang size L thì giá trên nút phải tăng
  const addButton = page.getByRole('button', { name: /^Thêm · / });
  const basePrice = await addButton.textContent();
  await page.locator('fieldset').filter({ hasText: 'Size' }).getByRole('button', { name: /^L/ }).click();
  await expect(addButton).not.toHaveText(basePrice ?? '');
  await page.getByRole('button', { name: 'Tăng số lượng' }).click(); // 2 ly để đủ đơn tối thiểu của CHAOBAN
  await addButton.click();
  await expect(page.getByRole('button', { name: /Giỏ hàng, 2 món/ })).toBeVisible();

  // Giỏ hàng: áp mã CHAOBAN
  await page.goto('/gio-hang');
  await expect(page.getByText(productName).first()).toBeVisible();
  const coupon = page.getByLabel('Mã giảm giá');
  await coupon.fill('chaoban');
  await coupon.press('Enter');
  await expect(page.getByText('Giảm giá')).toBeVisible();
  await page.getByRole('link', { name: /Tiến hành thanh toán/ }).click();

  // Thanh toán: nhận tại quầy, tiền mặt
  await expect(page).toHaveURL(/\/thanh-toan/);
  await page.getByRole('radio', { name: /Nhận tại quầy/ }).click();
  await page.getByLabel('Họ tên').fill('Khách Playwright');
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel(/Ghi chú/).fill('[e2e] đơn kiểm thử tự động');
  await page.getByRole('button', { name: /^Đặt món · / }).click();

  // Trang theo dõi đơn
  await expect(page).toHaveURL(/\/don-hang\/[A-Z0-9]+/);
  const code = page.url().split('/don-hang/')[1].split('?')[0];
  createdOrders.push(code);
  await expect(page.getByText('Chờ xác nhận').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Giỏ hàng, 0 món/ })).toBeVisible(); // giỏ đã được làm trống

  // Nhân viên xác nhận → trang tự cập nhật qua Socket.IO, không cần tải lại
  const api = await staffApi();
  expect((await setOrderStatus(api, code, 'CONFIRMED')).ok()).toBeTruthy();
  await expect(page.getByText('Đã xác nhận').first()).toBeVisible();
});

test('form thanh toán báo lỗi khi thiếu thông tin, không tạo đơn', async ({ page }) => {
  await page.goto('/thuc-don/mon-an-vat');
  await page.getByRole('button', { name: /^Thêm .+ vào giỏ$/ }).first().click();
  // Nút "+" mở hộp chọn (tải lười) → bấm thêm trong hộp
  await page.getByRole('dialog').getByRole('button', { name: /^Thêm · / }).click();
  await expect(page.getByRole('button', { name: /Giỏ hàng, [1-9]/ })).toBeVisible();
  await page.goto('/thanh-toan');
  await page.getByRole('radio', { name: /Giao tận nơi/ }).click();
  await page.getByLabel('Số điện thoại').fill('123');
  await page.getByRole('button', { name: /^Đặt món · / }).click();

  await expect(page).toHaveURL(/\/thanh-toan/);
  await expect(page.getByText('Số điện thoại không hợp lệ')).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
});
