import { describe, expect, it } from 'vitest';
import { compactVnd } from './report-widgets';

describe('compactVnd', () => {
  it('rút gọn số tiền cho trục biểu đồ và ô số liệu', () => {
    expect(compactVnd(0)).toBe('0');
    expect(compactVnd(950)).toBe('950');
    expect(compactVnd(29_000)).toBe('29k');
    expect(compactVnd(63_315_800)).toBe('63,3 tr');
    expect(compactVnd(1_250_000_000)).toBe('1,25 tỷ');
  });
});
