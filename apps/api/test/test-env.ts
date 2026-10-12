/**
 * Môi trường cho test e2e — tách hẳn khỏi .env của máy dev (ConfigModule bỏ qua file .env khi NODE_ENV=test).
 * Database riêng "foodhub_test" (CI: database trống của service container).
 */
export const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://foodhub:foodhub@localhost:5433/foodhub_test',
  // Redis db 15: không lẫn cache với dữ liệu dev; không có Redis thì cache tự tắt
  REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6380/15',
  WEB_URL: 'http://localhost:3001',
  API_PUBLIC_URL: 'http://api.test',
  JWT_ACCESS_SECRET: 'e2e-access-secret-0123456789abcdef0123',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-0123456789abcdef012',
  PAYMENT_MOCK: 'true',
};
