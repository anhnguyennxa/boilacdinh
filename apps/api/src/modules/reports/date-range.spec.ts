import { BadRequestException } from '@nestjs/common';
import { resolveRange, todayVn } from './date-range';

describe('resolveRange', () => {
  it('mặc định 30 ngày gần nhất theo giờ Việt Nam, kèm kỳ trước cùng độ dài', () => {
    // 2026-10-06 18:30 UTC = 01:30 ngày 07/10 giờ Việt Nam
    const now = new Date('2026-10-06T18:30:00Z');
    expect(todayVn(now)).toBe('2026-10-07');
    expect(resolveRange(undefined, undefined, now)).toEqual({
      from: '2026-09-08',
      to: '2026-10-07',
      days: 30,
      previous: { from: '2026-08-09', to: '2026-09-07' },
    });
  });

  it('khoảng 1 ngày', () => {
    expect(resolveRange('2026-10-01', '2026-10-01').previous).toEqual({ from: '2026-09-30', to: '2026-09-30' });
  });

  it('từ chối khoảng ngược, quá dài hoặc sai định dạng', () => {
    expect(() => resolveRange('2026-10-05', '2026-10-01')).toThrow(BadRequestException);
    expect(() => resolveRange('2024-01-01', '2026-01-01')).toThrow(/366/);
    expect(() => resolveRange('06/10/2026', '2026-10-07')).toThrow(/YYYY-MM-DD/);
  });
});
