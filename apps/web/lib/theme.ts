// Dùng chung cho server (layout gốc) và client (useTheme) — không đặt 'use client' ở đây.

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'foodhub-theme';

/**
 * Chạy trong <head> trước khi trang vẽ để không bị nháy màu.
 * Chỉ gắn data-theme khi người dùng chọn rõ; "theo hệ thống" để CSS media query quyết định.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
