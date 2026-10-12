'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';
import { reportError } from '@/lib/sentry-client';

/** Hiện khi không tải được dữ liệu (thường do API đang khởi động lại) — thay cho trang lỗi 500 trơn. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportError(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-container px-4 py-16">
      <EmptyState
        emoji="🍜"
        title="Bếp đang bận một chút"
        description="Chưa tải được thực đơn. Vui lòng thử lại sau vài giây."
        action={
          <div className="flex gap-2">
            <Button onClick={reset}>
              <RotateCw /> Thử lại
            </Button>
            <Button variant="outline" asChild>
              <Link href="/gio-hang">Xem giỏ hàng</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
