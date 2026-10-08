import { CartDrawer } from '@/components/cart/cart-drawer';
import { MobileCartBar } from '@/components/cart/mobile-cart-bar';
import { cn } from '@/lib/utils';
import { Footer } from './footer';
import { Header } from './header';

/**
 * bleed: main không giới hạn bề rộng — trang tự đặt container cho từng khối (dùng cho trang chủ có hero
 * tràn viền, thay vì kéo giãn bằng 100vw vốn tính cả thanh cuộn và gây cuộn ngang).
 */
export function ShopShell({ children, bleed }: { children: React.ReactNode; bleed?: boolean }) {
  return (
    <>
      <Header />
      <main className={cn('min-h-[60vh]', !bleed && 'mx-auto max-w-container px-4')}>{children}</main>
      <Footer />
      <CartDrawer />
      <MobileCartBar />
    </>
  );
}

/** Container chuẩn của trang (max 1280px, lề 16px). */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto max-w-container px-4', className)}>{children}</div>;
}
