'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';

const CartDrawer = dynamic(() => import('./cart-drawer').then((m) => m.CartDrawer), { ssr: false });

/** Ngăn kéo giỏ hàng (kèm Radix Dialog) chỉ tải khi mở lần đầu — không nằm trong JS ban đầu của trang. */
export function LazyCartDrawer() {
  const open = useCartStore((s) => s.drawerOpen);
  const [wanted, setWanted] = useState(open);
  useEffect(() => {
    if (open) setWanted(true);
  }, [open]);
  return wanted ? <CartDrawer /> : null;
}
