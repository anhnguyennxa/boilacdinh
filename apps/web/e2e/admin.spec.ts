import { expect, test } from '@playwright/test';

test('trang quản trị yêu cầu đăng nhập; admin vào được, khách thì không', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Đăng nhập bị giới hạn 5 lần/phút — chỉ chạy trên desktop');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dang-nhap/);

  await page.getByLabel('Email').fill('khach@foodhub.local');
  await page.getByLabel('Mật khẩu').fill('Khach@12345');
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page).not.toHaveURL(/\/admin/);

  await page.context().clearCookies();
  await page.goto('/dang-nhap?next=/admin');
  await page.getByLabel('Email').fill('admin@foodhub.local');
  await page.getByLabel('Mật khẩu').fill('Admin@12345');
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible();

  // Phân trang thực đơn (20 món/trang): số trang vượt quá → tự về trang cuối, có nhãn "Món a–b / tổng"
  await page.goto('/admin/mon?page=99');
  await expect(page).toHaveURL(/\/admin\/mon(\?page=\d+)?$/);
  await expect(page.getByText(/^Món \d+–\d+ \/ \d+$/)).toBeVisible();
  const total = Number((await page.getByText(/^Món \d+–\d+ \/ \d+$/).textContent())?.split('/ ')[1]);
  await expect(page.locator('tbody tr')).toHaveCount(total - 20 * (Math.ceil(total / 20) - 1));

  // Trên điện thoại: bảng cuộn ngang bên trong khung, trang không được rộng hơn màn hình
  // (lỗi cũ: nhãn sr-only position:absolute thoát khỏi khung overflow-x-auto không có relative)
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/admin/mon', '/admin/danh-muc', '/admin/khuyen-mai', '/admin/don-hang', '/admin/bao-cao']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} tràn ngang ${overflow}px trên màn hình 390px`).toBeLessThanOrEqual(0);
  }
});

test('trang chủ không bị tràn ngang và có đủ các mục', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Danh mục', 'Bán chạy nhất', 'Món mới']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
