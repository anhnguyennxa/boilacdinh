import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/** NestJS gọi khi admin sửa thực đơn → làm mới trang ISR ngay thay vì chờ 5 phút. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { tags } = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const list = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : ['menu'];
  for (const tag of list) revalidateTag(tag);
  return NextResponse.json({ ok: true, revalidated: list });
}
