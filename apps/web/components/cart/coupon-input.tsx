'use client';

import { TicketPercent, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatVnd } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';

export function CouponInput({ discount, error, checking }: { discount: number; error: string | null; checking: boolean }) {
  const code = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const [value, setValue] = useState('');

  if (code) {
    return (
      <div
        className={
          error
            ? 'flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2'
            : 'flex items-center gap-3 rounded-xl border border-secondary/40 bg-secondary-soft px-3 py-2'
        }
      >
        <TicketPercent className={error ? 'size-4 text-danger' : 'size-4 text-secondary'} />
        <div className="flex-1 text-xs">
          <p className="font-mono font-medium text-foreground">{code}</p>
          <p className={error ? 'text-danger' : 'text-secondary'}>
            {checking ? 'Đang kiểm tra…' : error ?? `Giảm ${formatVnd(discount)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCoupon(null)}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          aria-label="Bỏ mã giảm giá"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const apply = () => value.trim() && setCoupon(value.trim().toUpperCase());

  // Không dùng <form>: component nằm trong form thanh toán, form lồng nhau sẽ submit nhầm đơn hàng
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
        }}
        placeholder="Mã giảm giá"
        aria-label="Mã giảm giá"
        className="uppercase placeholder:normal-case"
      />
      <Button type="button" variant="outline" className="h-9 shrink-0" onClick={apply}>
        Áp dụng
      </Button>
    </div>
  );
}
