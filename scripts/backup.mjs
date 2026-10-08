// Sao lưu database (Postgres trong Docker) + ảnh đã tải lên vào backups/<thời điểm>/
// Chạy: pnpm db:backup            Khôi phục: xem README mục "Sao lưu & khôi phục"
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CONTAINER = process.env.PG_CONTAINER ?? 'foodhub-postgres-1';
const DB = 'foodhub';

const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', '_').replaceAll(':', '-');
const dir = join(ROOT, 'backups', stamp);
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
