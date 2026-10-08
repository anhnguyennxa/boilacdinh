import type { OrderDto } from '@foodhub/shared';
import { formatVnd } from '@/lib/utils';

export function OrderItems({ items }: { items: OrderDto['items'] }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {items.map((i) => (
        <li key={i.id} className="flex gap-3 py-3">
          <span className="text-muted-foreground tabular-nums">{i.quantity}×</span>
          <span className="flex-1">
            {i.productName}
            {i.options.length > 0 && (
              <span className="block text-xs text-muted-foreground">{i.options.map((o) => o.name).join(' · ')}</span>
            )}
          </span>
          <span className="tabular-nums">{formatVnd(i.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}
