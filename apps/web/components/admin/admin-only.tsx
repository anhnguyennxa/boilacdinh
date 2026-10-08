import { RequireAuth } from '@/components/layout/require-auth';

/** Trang chỉ dành cho quản trị viên; nhân viên được đưa về bảng đơn hàng. API vẫn kiểm tra quyền lại. */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['ADMIN']} redirectTo="/admin/don-hang">
      {children}
    </RequireAuth>
  );
}
