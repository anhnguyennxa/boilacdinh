import Link from 'next/link';
import { BrandLogo } from '@/components/layout/brand-logo';
import { BRAND } from '@/lib/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="glow-accent flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label={`${BRAND.name} — trang chủ`} className="mb-8 flex flex-col items-center gap-3">
        <BrandLogo size={72} priority />
        <span className="text-base font-semibold tracking-tight">{BRAND.name}</span>
      </Link>
      <div className="w-full max-w-[360px] animate-pop-in rounded-2xl border border-border bg-surface p-6 shadow-lg">{children}</div>
    </div>
  );
}
