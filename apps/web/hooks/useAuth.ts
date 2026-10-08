'use client';

import type { LoginInput, RegisterInput, UserDto } from '@foodhub/shared';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type Session = { accessToken: string; user: UserDto };

export function useAuth() {
  const { status, user, setSession, clear } = useAuthStore();
  const queryClient = useQueryClient();

  return {
    status,
    user,
    isStaff: user?.role === 'STAFF' || user?.role === 'ADMIN',
    async login(input: LoginInput) {
      setSession(await api<Session>('/auth/login', { method: 'POST', body: input }));
    },
    async register(input: RegisterInput) {
      setSession(await api<Session>('/auth/register', { method: 'POST', body: input }));
    },
    async logout() {
      await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
      clear();
      queryClient.clear();
    },
  };
}
