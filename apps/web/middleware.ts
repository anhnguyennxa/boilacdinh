import { NextResponse, type NextRequest } from 'next/server';

/**
 * Chặn sớm khi chưa có cookie phiên (refresh token httpOnly).
 * Vai trò ADMIN/STAFF được kiểm tra ở client (RequireAuth) và luôn kiểm tra lại ở API.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has('fh_rt')) {
    const url = req.nextUrl.clone();
    url.pathname = '/dang-nhap';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/tai-khoan/:path*', '/admin/:path*'],
};
