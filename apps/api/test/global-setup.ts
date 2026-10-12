import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import Redis from 'ioredis';
import { TEST_ENV } from './test-env';

/**
 * Chuẩn bị database test mà không xóa dữ liệu: `migrate deploy` tự tạo DB nếu chưa có,
 * seed chạy dạng upsert. Test viết theo kiểu không phụ thuộc dữ liệu của lần chạy trước.
 */
export default async function globalSetup() {
  const run = (cmd: string) =>
    execSync(cmd, { cwd: resolve(__dirname, '..'), env: { ...process.env, ...TEST_ENV }, stdio: 'pipe' });
  run('npx prisma migrate deploy');
  run('npx prisma db seed');

  // Seed tạo lại tùy chọn món (id mới) → bỏ cache thực đơn cũ của lần chạy trước (chỉ Redis db dành cho test)
  const redis = new Redis(TEST_ENV.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    await redis.flushdb();
  } catch {
    /* không có Redis → API test chạy không cache */
  } finally {
    redis.disconnect();
  }
}
