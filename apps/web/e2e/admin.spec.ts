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
});

test('trang chủ không bị tràn ngang và có đủ các mục', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Danh mục', 'Bán chạy nhất', 'Món mới']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
