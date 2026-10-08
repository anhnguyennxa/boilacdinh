import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { BRAND } from '@/lib/brand';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

// Inter Variable (không chỉ định weight → tải bản variable), có bộ ký tự tiếng Việt
const font = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
  display: 'swap',
});

// Favicon/icon iOS lấy tự động từ app/icon.png và app/apple-icon.png
export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, images: [{ url: BRAND.logo, width: 512, height: 512, alt: BRAND.name }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f2f4' },
    { media: '(prefers-color-scheme: dark)', color: '#080808' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme được script trong <head> gắn trước khi React hydrate
    <html lang="vi" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
