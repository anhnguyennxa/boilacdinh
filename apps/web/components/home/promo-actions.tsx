'use client';

import { Check, Copy, TicketPercent } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';

/** Mã in kiểu vé + nút sao chép và "Áp dụng" (gắn mã vào giỏ, server kiểm tra lại khi thanh toán). */
export function PromoActions({ code, compact }: { code: string; compact?: boolean }) {
  const hydrated = useHydrated();
  const applied = useCartStore((s) => s.couponCode) === code && hydrated;
  const setCoupon = useCartStore((s) => s.setCoupon);
  const openDrawer = useCartStore((s) => s.setDrawerOpen);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không sao chép được, hãy chọn và sao chép thủ công');
    }
  }

  function apply() {
    setCoupon(code);
    toast.success(`Đã áp dụng mã ${code}`, {
      description: 'Ưu đãi được trừ khi thanh toán nếu đơn đủ điều kiện.',
      action: { label: 'Xem giỏ', onClick: () => openDrawer(true) },
    });
  }

  return (
    <div className={cn('flex items-center gap-2', compact ? 'flex-wrap' : 'flex-col sm:flex-row')}>
      <button
        type="button"
        onClick={copy}
        aria-label={`Sao chép mã ${code}`}
        className={cn(
          'group inline-flex items-center justify-between gap-3 rounded-xl border border-dashed border-border-strong bg-background font-mono text-foreground transition-colors duration-150 hover:border-primary',
          compact ? 'h-7 px-2 text-xs' : 'h-10 w-full px-3 text-base sm:w-auto',
        )}
      >
        <span className="tracking-wider">{code}</span>
        {copied ? (
          <Check className="size-3.5 animate-pop-in text-secondary" />
        ) : (
          <Copy className="size-3.5 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />
        )}
      </button>
      <Button
        type="button"
        size={compact ? 'sm' : 'lg'}
        variant={applied ? 'outline' : 'primary'}
        onClick={apply}
        disabled={applied}
        className={cn(!compact && 'w-full sm:w-auto')}
      >
        {applied ? <Check /> : <TicketPercent />}
        {applied ? 'Đã áp dụng' : 'Áp dụng'}
      </Button>
    </div>
  );
}
