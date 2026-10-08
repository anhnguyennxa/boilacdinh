'use client';

import type { UserDto } from '@foodhub/shared';
import { useAuthStore } from '@/stores/auth-store';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown };

let refreshing: Promise<boolean> | null = null;

/** Gọi /auth/refresh một lần duy nhất dù nhiều request cùng gặp 401. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        useAuthStore.getState().clear();
        return false;
      }
      const { data } = (await res.json()) as { data: { accessToken: string; user: UserDto } };
      useAuthStore.getState().setSession(data);
      return true;
    } catch {
      useAuthStore.getState().clear();
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

async function send(path: string, opts: Options) {
  const token = useAuthStore.getState().accessToken;
  // FormData (tải file): để trình duyệt tự đặt content-type kèm boundary
  const isForm = opts.body instanceof FormData;
  return fetch(`/api/v1${path}`, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(opts.body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

/** Trả về nguyên phong bì { data, meta? } của API. */
export async function apiRaw<T>(path: string, opts: Options = {}): Promise<T> {
  let res = await send(path, opts);
  if (res.status === 401 && useAuthStore.getState().accessToken && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await send(path, opts);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json.message) ? json.message[0] : json.message;
    throw new ApiError(res.status, msg ?? 'Có lỗi xảy ra, vui lòng thử lại');
  }
  return json as T;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  return (await apiRaw<{ data: T }>(path, opts)).data;
}
