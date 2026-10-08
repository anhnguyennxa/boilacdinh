import { ORDER_STATUS_LABEL, type OrderStatus } from '@foodhub/shared';
import { Badge } from '@/components/ui/misc';

const TONE: Record<OrderStatus, 'neutral' | 'primary' | 'secondary' | 'danger'> = {
  PENDING: 'primary',
  CONFIRMED: 'primary',
  PREPARING: 'primary',
  DELIVERING: 'primary',
  COMPLETED: 'secondary',
  CANCELLED: 'danger',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
