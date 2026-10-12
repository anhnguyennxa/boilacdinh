'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/sentry-client';

/** Lỗi ở layout gốc (hiếm) — thay cả trang, nên tự dựng html/body với style tối thiểu. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <h1 style={{ fontSize: 20 }}>Đã có lỗi xảy ra</h1>
          <p style={{ color: '#666' }}>Vui lòng tải lại trang sau giây lát.</p>
          <button type="button" onClick={reset} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 9 }}>
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
