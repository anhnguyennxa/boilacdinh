// Sao lưu database (Postgres trong Docker) + ảnh đã tải lên vào backups/<thời điểm>/
// Chạy: pnpm db:backup            Khôi phục: xem README mục "Sao lưu & khôi phục"
// Giữ BACKUP_KEEP bản mới nhất (mặc định 14, đặt 0 để giữ tất cả) — chạy hằng ngày = giữ 2 tuần.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONTAINER = process.env.PG_CONTAINER ?? 'foodhub-postgres-1';
const DB = 'foodhub';
const KEEP = Number(process.env.BACKUP_KEEP ?? 14);
const BACKUPS = join(ROOT, 'backups');

const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', '_').replaceAll(':', '-');
const dir = join(BACKUPS, stamp);
mkdirSync(dir, { recursive: true });

const dump = (args) =>
  execFileSync('docker', ['exec', CONTAINER, 'pg_dump', '-U', DB, '-d', DB, '--no-owner', ...args], {
    maxBuffer: 1024 * 1024 * 1024,
  });

// .dump: định dạng nén của pg_restore (khôi phục nhanh, chọn từng bảng được)
writeFileSync(join(dir, `${DB}.dump`), dump(['-Fc']));
// .sql: văn bản thuần — mở đọc được, chạy bằng psql
writeFileSync(join(dir, `${DB}.sql`), dump(['--clean', '--if-exists']));

const uploads = join(ROOT, 'apps/api/uploads');
if (existsSync(uploads)) cpSync(uploads, join(dir, 'uploads'), { recursive: true });

console.log(`Đã sao lưu vào ${dir}`);

// Xoay vòng: chỉ đụng tới thư mục do script này tạo (tên dạng 2026-10-08_14-13-17)
if (KEEP > 0) {
  const old = readdirSync(BACKUPS)
    .filter((n) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(n))
    .sort()
    .slice(0, -KEEP);
  for (const n of old) rmSync(join(BACKUPS, n), { recursive: true });
  if (old.length) console.log(`Đã xóa ${old.length} bản cũ, giữ ${KEEP} bản gần nhất`);
}
