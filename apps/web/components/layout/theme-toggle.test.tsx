import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { ThemeToggle } from './theme-toggle';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  // jsdom không có matchMedia
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});

describe('ThemeToggle', () => {
  it('xoay vòng hệ thống → sáng → tối → hệ thống, lưu lựa chọn và gắn data-theme', () => {
    render(<ThemeToggle showLabel />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Theo hệ thống');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('Sáng');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('Tối');
    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('Theo hệ thống');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
