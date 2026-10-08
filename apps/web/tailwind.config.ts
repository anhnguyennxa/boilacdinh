import type { Config } from 'tailwindcss';

/**
 * Design system kiểu Linear (Inter, lưới 4px, radius 9px) với màu thương hiệu Bối Lạc Đình:
 * accent cam #fa7d2b (tối) / đỏ #cc0a13 (sáng), điểm nhấn xanh chanh #c4fe0b — xem globals.css.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent duy nhất: CTA, link, focus ring, trạng thái active
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
          soft: 'rgb(var(--primary) / 0.14)',
        },
        // success #27a644
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-foreground'),
          soft: 'rgb(var(--secondary) / 0.14)',
        },
        background: token('background'),
        surface: token('surface'),
        foreground: token('foreground'),
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        subtle: token('subtle'),
        border: token('border'),
        'border-strong': token('border-strong'),
        danger: token('danger'),
        // Xanh chanh của logo: nền cho nhãn khuyến mãi, luôn đi với chữ đen
        highlight: { DEFAULT: token('highlight'), foreground: token('highlight-foreground') },
        // Màu mark biểu đồ (đã kiểm tra dải độ sáng/tương phản theo từng theme)
        chart: token('chart'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        // Berkeley Mono là font thương mại; dùng monospace hệ thống thay thế
        mono: ['"Berkeley Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Body 13px, caption 12px, heading 36–40px / line-height 1.2
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['36px', { lineHeight: '1.2' }],
        '4xl': ['38px', { lineHeight: '1.2' }],
        '5xl': ['40px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '9px',
        '2xl': '12px',
        '3xl': '12px',
      },
      // Giá trị bóng đổi theo theme (xem globals.css)
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        ring: '0 0 0 2px rgb(var(--primary) / 0.25)',
        none: 'none',
      },
      maxWidth: {
        container: '1280px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.16,1,.3,1)',
        spring: 'cubic-bezier(.45,1.45,.8,1)',
      },
      keyframes: {
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        // Dùng thuộc tính `scale` riêng để không ghi đè transform translate của hộp thoại căn giữa
        'pop-in': { from: { opacity: '0', scale: '.96' }, to: { opacity: '1', scale: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        // Zoom chậm cho ảnh nền hero (Ken Burns)
        'ken-burns': { from: { transform: 'scale(1)' }, to: { transform: 'scale(1.12)' } },
        progress: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 250ms cubic-bezier(.32,.72,0,1)',
        'slide-up': 'slide-up 250ms cubic-bezier(.32,.72,0,1)',
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 220ms cubic-bezier(.16,1,.3,1)',
        'rise-in': 'rise-in 400ms cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
