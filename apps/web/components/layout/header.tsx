'use client';

import { LayoutDashboard, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { useCartStore } from '@/stores/cart-store';
import { BrandLogo } from './brand-logo';
import { ThemeToggle } from './theme-toggle';

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/tim-kiem?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label className="relative block">
        <span className="sr-only">Tìm món</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Tìm phở, trà sữa, cà phê…"
          className="h-8 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 hover:border-border-strong focus:border-primary focus:shadow-ring focus:outline-none"
        />
      </label>
    </form>
  );
}

const NAV = [
  { href: '/thuc-don', label: 'Thực đơn', match: (p: string) => p === '/thuc-don' || (p.startsWith('/thuc-don/') && !/(ca-phe|tra-sua|nuoc-ep)/.test(p)) },
  { href: '/thuc-don/tra-sua', label: 'Đồ uống', match: (p: string) => /^\/thuc-don\/(ca-phe|tra-sua|nuoc-ep)/.test(p) },
];

const iconBtn =
  'relative grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground';

export function Header() {
  const { count } = useCart();
  const openDrawer = useCartStore((s) => s.setDrawerOpen);
  const { status, user, isStaff } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-container items-center gap-2 px-4">
        <Link href="/" aria-label={`${BRAND.name} — trang chủ`} className="shrink-0">
          <BrandLogo size={36} withName priority nameClassName="hidden text-base sm:inline" />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm transition-colors duration-150',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <SearchBox className="ml-auto hidden w-full max-w-[280px] md:block" />
        </Suspense>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <ThemeToggle />
          <Link href="/tim-kiem" className={cn(iconBtn, 'md:hidden')} aria-label="Tìm kiếm">
            <Search className="size-4" />
          </Link>
          {isStaff && (
            <Link href="/admin/don-hang" className={iconBtn} aria-label="Quản trị">
              <LayoutDashboard className="size-4" />
            </Link>
          )}
          <Link
            href={status === 'authenticated' ? '/tai-khoan' : '/dang-nhap'}
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            aria-label={user ? `Tài khoản của ${user.fullName}` : 'Đăng nhập'}
          >
            <User className="size-4" />
            <span className="hidden max-w-28 truncate text-sm lg:inline">
              {user ? user.fullName.split(' ').at(-1) : 'Đăng nhập'}
            </span>
          </Link>
          <button type="button" onClick={() => openDrawer(true)} className={iconBtn} aria-label={`Giỏ hàng, ${count} món`}>
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
          {status !== 'authenticated' && (
            <Link
              href="/thuc-don"
              className="ml-2 hidden h-8 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 sm:inline-flex"
            >
              Đặt món
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export { SearchBox };
