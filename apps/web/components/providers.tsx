'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { CartOwnerSync } from '@/components/cart/cart-owner-sync';
import { useTheme } from '@/hooks/useTheme';
import { refreshSession } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }),
  );

  const theme = useTheme().resolved;

  useEffect(() => {
    useCartStore.persist.rehydrate();
    // Khôi phục phiên từ cookie refresh token (nếu có)
    void refreshSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <CartOwnerSync />
      <Toaster position="top-center" theme={theme} richColors closeButton toastOptions={{ className: 'rounded-xl' }} />
    </QueryClientProvider>
  );
}
