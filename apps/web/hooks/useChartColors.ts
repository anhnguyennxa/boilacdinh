'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './useTheme';

export interface ChartColors {
  mark: string;
  grid: string;
  axis: string;
  surface: string;
}

const FALLBACK: ChartColors = { mark: '#e8691a', grid: '#2a2e33', axis: '#9c9da1', surface: '#191d20' };

/**
 * Recharts ghi màu vào thuộc tính SVG (fill="…"), nơi var(--x) không được phân giải —
 * nên đọc giá trị token đã tính từ CSS rồi truyền màu cụ thể, đọc lại khi đổi theme.
 */
export function useChartColors(scope?: React.RefObject<HTMLElement | null>): ChartColors {
  const { resolved } = useTheme();
  const [colors, setColors] = useState(FALLBACK);

  useEffect(() => {
    const el = scope?.current ?? document.documentElement;
    const css = getComputedStyle(el);
    const rgb = (name: string) => `rgb(${css.getPropertyValue(name).trim().split(/\s+/).join(',')})`;
    setColors({ mark: rgb('--chart'), grid: rgb('--border'), axis: rgb('--muted-foreground'), surface: rgb('--surface') });
  }, [resolved, scope]);

  return colors;
}
