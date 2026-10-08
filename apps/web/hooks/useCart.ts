'use client';

import type { CouponCheckDto } from '@foodhub/shared';
import { orderTotals } from '@foodhub/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { GUEST, selectCount, selectSubtotal, useCartStore } from '@/stores/cart-store';

/** Giỏ hàng lưu localStorage nên chỉ đọc được sau khi mount (tránh lệch hydrate). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCart() {
  const mounted = useHydrated();
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const owner = useCartStore((s) => s.owner);
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  // Giỏ của một tài khoản chỉ hiện khi đã xác nhận chính người đó đang đăng nhập —
  // tránh lộ giỏ người trước trong lúc chờ khôi phục phiên (phiên có thể đã hết hạn)
  const ownerConfirmed = owner === GUEST ? authStatus !== 'authenticated' : authStatus === 'authenticated' && userId === owner;
  const hydrated = mounted && ownerConfirmed;
  return {
    hydrated,
    items: hydrated ? items : [],
    count: hydrated ? count : 0,
    subtotal: hydrated ? subtotal : 0,
  };
}

/** Kiểm tra mã giảm giá ở server mỗi khi tạm tính thay đổi. */
export function useCoupon(subtotal: number) {
  const code = useCartStore((s) => s.couponCode);
  const query = useQuery({
    queryKey: ['coupon', code, subtotal],
    enabled: !!code && subtotal > 0,
    retry: false,
    queryFn: () => api<CouponCheckDto>('/coupons/validate', { method: 'POST', body: { code, subtotal } }),
  });
  return {
    code,
    discount: query.data?.discount ?? 0,
    error: query.error instanceof ApiError ? query.error.message : null,
    checking: query.isFetching,
  };
}

export function useTotals(deliveryType: 'DELIVERY' | 'PICKUP' = 'DELIVERY') {
  const { subtotal } = useCart();
  const coupon = useCoupon(subtotal);
  return { ...orderTotals({ subtotal, discount: coupon.discount, deliveryType }), coupon };
}
