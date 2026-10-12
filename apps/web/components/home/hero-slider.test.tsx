import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeroSlide } from '@/lib/hero-slides';
import { HeroSlider } from './hero-slider';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _p, quality: _q, ...props }: Record<string, unknown>) => <img {...props} />,
}));

const slides: HeroSlide[] = ['Phở', 'Bánh mì', 'Cà phê'].map((caption, i) => ({
  src: `https://images.unsplash.com/photo-${i}`,
  alt: caption,
  caption,
  href: `/mon/${i}`,
  focus: '50% 50%',
}));

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() });
}

const caption = () => screen.getByRole('link', { name: /Trong ảnh/ });
const progressFill = () => screen.getByRole('button', { current: true }).querySelector('span > span')!;

describe('HeroSlider', () => {
  beforeEach(() => mockReducedMotion(false));

  it('tự chuyển ảnh khi thanh tiến trình chạy hết, quay vòng về đầu', () => {
    render(<HeroSlider slides={slides}>nội dung</HeroSlider>);
    expect(caption()).toHaveTextContent('Phở');
    fireEvent.animationEnd(progressFill());
    expect(caption()).toHaveTextContent('Bánh mì');
    fireEvent.animationEnd(progressFill());
    fireEvent.animationEnd(progressFill());
    expect(caption()).toHaveTextContent('Phở');
  });

  it('bấm chỉ mục để chọn ảnh', () => {
    render(<HeroSlider slides={slides}>nội dung</HeroSlider>);
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh 3: Cà phê' }));
    expect(caption()).toHaveTextContent('Cà phê');
  });

  it('tạm dừng thì không tự chuyển', () => {
    render(<HeroSlider slides={slides}>nội dung</HeroSlider>);
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng trình chiếu' }));
    expect(screen.getByRole('button', { name: 'Tiếp tục trình chiếu' })).toBeInTheDocument();
    fireEvent.animationEnd(progressFill());
    expect(caption()).toHaveTextContent('Phở');
  });

  it('người dùng bật giảm chuyển động: không tự chạy', () => {
    mockReducedMotion(true);
    render(<HeroSlider slides={slides}>nội dung</HeroSlider>);
    fireEvent.animationEnd(progressFill());
    expect(caption()).toHaveTextContent('Phở');
  });

  it('lúc đầu chỉ tải ảnh đầu (LCP); trang rảnh mới tải trước ảnh kế tiếp', () => {
    vi.useFakeTimers();
    const { container } = render(<HeroSlider slides={slides}>nội dung</HeroSlider>);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    act(() => vi.runAllTimers());
    expect(container.querySelectorAll('img')).toHaveLength(2);
    vi.useRealTimers();
  });
});
