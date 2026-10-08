import { cn, formatVnd } from '@/lib/utils';

/** Giá là thông tin, không phải hành động: dùng màu chữ chính, không dùng accent. */
export function PriceTag({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('font-semibold tabular-nums text-foreground', className)}>{formatVnd(amount)}</span>;
}
