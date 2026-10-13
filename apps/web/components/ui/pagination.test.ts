import { describe, expect, it } from 'vitest';
import { pageItems, rangeLabel } from './pagination';

describe('pageItems', () => {
  it('ít trang: hiện đủ, không có "…"', () => {
    expect(pageItems(1, 1)).toEqual([]);
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('nhiều trang: giữ trang đầu, cuối và quanh trang hiện tại', () => {
    expect(pageItems(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, 'gap', 12]);
    expect(pageItems(12, 12)).toEqual([1, 'gap', 11, 12]);
  });

  it('khoảng chỉ thiếu 1 trang thì hiện số thay vì "…"', () => {
    expect(pageItems(4, 12)).toEqual([1, 2, 3, 4, 5, 'gap', 12]);
    expect(pageItems(9, 12)).toEqual([1, 'gap', 8, 9, 10, 11, 12]);
  });
});

describe('rangeLabel', () => {
  it('khoảng đang xem trên tổng', () => {
    expect(rangeLabel(1, 20, 57)).toBe('1–20 / 57');
    expect(rangeLabel(3, 20, 57)).toBe('41–57 / 57');
    expect(rangeLabel(1, 20, 0)).toBe('0');
  });
});
