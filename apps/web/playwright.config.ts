import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const API_HEALTH = `${process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1'}/health`;
const CI = !!process.env.CI;

/**
 * E2E luồng mua hàng trên web thật + API thật.
 * Máy dev: dùng lại web/API đang chạy (cổng 3001/4000), chưa chạy thì tự bật bản đã build.
 * CI: luôn tự bật (cần `pnpm build` trước).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Máy dev dùng Chrome đã cài sẵn; CI dùng Chromium của Playwright
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: CI ? undefined : 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: CI ? undefined : 'chrome' } },
  ],
  webServer: [
    { command: 'node dist/main.js', cwd: '../api', url: API_HEALTH, reuseExistingServer: !CI, timeout: 60_000 },
    { command: 'npx next start -p 3001', url: WEB_URL, reuseExistingServer: !CI, timeout: 120_000 },
  ],
});
