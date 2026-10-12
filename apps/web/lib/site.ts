/** Địa chỉ công khai của website (không có "/" cuối) — dùng cho sitemap, robots và link chia sẻ. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
