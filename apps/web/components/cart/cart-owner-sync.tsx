'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { GUEST, useCartStore } from '@/stores/cart-store';

/**
 * Gắn giỏ hàng với người đang dùng:
 * - khách vãng lai đăng nhập → giỏ khách gộp vào giỏ tài khoản;
 * - đăng xuất / hết phiên / người khác đăng nhập → giỏ cũ được cất, không hiện cho người sau.
 */
export function CartOwnerSync() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  // Trên server không có localStorage nên zustand không gắn useCartStore.persist — chỉ đọc trong effect
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useCartStore.persist;
    if (hydrated || !persist) return;
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    if (persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || status === 'loading') return;
    const { owner, switchOwner } = useCartStore.getState();
    if (status === 'authenticated' && userId) {
      switchOwner(userId, { mergeCurrent: owner === GUEST });
    } else if (status === 'guest') {
      switchOwner(GUEST);
    }
  }, [hydrated, status, userId]);

  return null;
}
