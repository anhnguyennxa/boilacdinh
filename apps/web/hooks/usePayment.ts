'use client';

import type { PaymentInitDto, PaymentMethod, PaymentMethodsDto } from '@foodhub/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<PaymentMethodsDto>('/payments/methods'),
    staleTime: 5 * 60_000,
  });
}

/** Tạo link thanh toán và chuyển trình duyệt sang cổng VNPay/MoMo. */
export async function redirectToPayment(orderId: string, method: Exclude<PaymentMethod, 'COD'>) {
  const { payUrl } = await api<PaymentInitDto>(`/payments/${orderId}/${method.toLowerCase()}`, { method: 'POST' });
  window.location.assign(payUrl);
}

/** Số giây còn lại tới hạn, cập nhật mỗi giây. */
export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : null;
}
