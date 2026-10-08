'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemeMode } from '@/lib/theme';

export type { ResolvedTheme, ThemeMode };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener('change', cb);
    window.removeEventListener('storage', cb);
  };
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, readMode, () => 'system' as ThemeMode);
  const resolved = useSyncExternalStore(
    subscribe,
    () => resolve(readMode()),
    () => 'dark' as ResolvedTheme,
  );

  const setMode = useCallback((next: ThemeMode) => {
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* trình duyệt chặn localStorage: vẫn đổi được trong phiên hiện tại */
    }
    const root = document.documentElement;
    if (next === 'system') delete root.dataset.theme;
    else root.dataset.theme = next;
    emit();
  }, []);

  return { mode, resolved, setMode };
}
