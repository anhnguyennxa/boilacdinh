'use client';

import { ArrowLeft, BarChart3, ClipboardList, FolderTree, LayoutDashboard, TicketPercent, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/layout/require-auth';
import { BrandLogo } from '@/components/layout/brand-logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { BRAND } from '@/lib/brand';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['ADMIN'], exact: true },
  { href: '/admin/don-hang', label: 'Đơn hàng', icon: ClipboardList, roles: ['STAFF', 'ADMIN'] },
  { href: '/admin/mon', label: 'Thực đơn', icon: UtensilsCrossed, roles: ['ADMIN'] },
  { href: '/admin/danh-muc', label: 'Danh mục', icon: FolderTree, roles: ['ADMIN'] },
  { href: '/admin/khuyen-mai', label: 'Khuyến mãi', icon: TicketPercent, roles: ['ADMIN'] },
  { href: '/admin/bao-cao', label: 'Báo cáo', icon: BarChart3, roles: ['ADMIN'] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const nav = NAV.filter((n) => user && n.roles.includes(user.role));

  return (
    <RequireAuth roles={['STAFF', 'ADMIN']}>
      <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
        <aside className="sticky top-0 z-[1] border-b border-border bg-background md:h-dvh md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 px-4 py-4">
            <BrandLogo size={32} />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{BRAND.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</p>
            </div>
          </div>
          <nav className="relative flex gap-1 overflow-x-auto px-2 pb-2 scrollbar-none md:flex-col md:pb-0">
            {nav.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-sm transition-colors duration-150',
                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" /> {label}
                </Link>
              );
            })}
            <Link href="/" className="flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-surface hover:text-foreground md:mt-4">
              <ArrowLeft className="size-4" /> Về trang khách
            </Link>
            <ThemeToggle showLabel className="shrink-0 justify-start" />
          </nav>
        </aside>
        <main className="min-w-0 p-4 md:p-8 md:pt-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
