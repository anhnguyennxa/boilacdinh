'use client';

import { SocketEvents, type OrderDto } from '@foodhub/shared';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

function connect(token: string | null): Socket {
  return io(SOCKET_URL, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });
}

/** Khách theo dõi một đơn: nhận order:updated của riêng mã đơn đó. */
export function useOrderSocket(code: string | undefined, onUpdate: (order: OrderDto) => void) {
  const token = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!code || status === 'loading') return;
    const socket = connect(token);
    socket.on('connect', () => socket.emit(SocketEvents.JOIN_ORDER, { code }));
    socket.on(SocketEvents.ORDER_UPDATED, (order: OrderDto) => {
      if (order.code === code) onUpdate(order);
    });
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token, status]);
}

/** Màn hình nhân viên: nhận mọi đơn mới và đơn đổi trạng thái. */
export function useStaffSocket(handlers: { onCreated: (o: OrderDto) => void; onUpdated: (o: OrderDto) => void }) {
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;
    const socket = connect(token);
    socket.on(SocketEvents.ORDER_CREATED, handlers.onCreated);
    socket.on(SocketEvents.ORDER_UPDATED, handlers.onUpdated);
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
