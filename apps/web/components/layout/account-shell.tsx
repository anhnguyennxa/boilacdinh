'use client';

import { LogOut, MapPin, Receipt, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShopShell } from '@/components/layout/shop-shell';
import { RequireAuth } from '@/components/layout/require-auth';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/tai-khoan', label: 'Hồ sơ', icon: User },
  { href: '/tai-khoan/don-hang', label: 'Đơn hàng', icon: Receipt },
  { href: '/tai-khoan/dia-chi', label: 'Sổ địa chỉ', icon: MapPin },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <ShopShell>
      <RequireAuth>
        <div className="pt-6">
          <h1 className="text-2xl font-semibold">Xin chào, {user?.fullName.split(' ').at(-1)}</h1>
          <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
            <nav className="relative flex gap-2 overflow-x-auto scrollbar-none md:flex-col">
              {TABS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors duration-150',
                    pathname === href ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" /> {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.replace('/');
                }}
                className="flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-danger transition-colors duration-150 hover:bg-danger/10"
              >
                <LogOut className="size-4" /> Đăng xuất
              </button>
            </nav>
            <div>{children}</div>
          </div>
        </div>
      </RequireAuth>
    </ShopShell>
  );
}
