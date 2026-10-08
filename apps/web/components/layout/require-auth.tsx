'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/misc';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@foodhub/shared';

/**
 * Middleware đã chặn khi không có cookie phiên; component này xử lý trường hợp cookie hết hạn
 * và kiểm tra vai trò. Quyền thực sự luôn được API kiểm tra lại.
 */
export function RequireAuth({
  roles,
  redirectTo = '/',
  children,
}: {
  roles?: Role[];
  /** Đã đăng nhập nhưng sai vai trò thì chuyển tới đây */
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const { status, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = status === 'authenticated' && (!roles || (user && roles.includes(user.role)));

  useEffect(() => {
    if (status === 'guest') router.replace(`/dang-nhap?next=${encodeURIComponent(pathname)}`);
    else if (status === 'authenticated' && !allowed) router.replace(redirectTo);
  }, [status, allowed, router, pathname, redirectTo]);

  if (!allowed) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  return <>{children}</>;
}
