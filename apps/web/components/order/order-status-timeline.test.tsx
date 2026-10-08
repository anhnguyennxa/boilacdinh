import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderStatusTimeline } from './order-status-timeline';

describe('OrderStatusTimeline', () => {
  it('đơn giao tận nơi có bước "Đang giao"', () => {
    render(<OrderStatusTimeline status="PREPARING" deliveryType="DELIVERY" />);
    expect(screen.getByText('Đang giao')).toBeInTheDocument();
    expect(screen.getByText('Bếp đang làm món cho bạn')).toBeInTheDocument();
  });

  it('đơn nhận tại quầy bỏ bước giao và đổi nhãn bước cuối', () => {
    render(<OrderStatusTimeline status="PENDING" deliveryType="PICKUP" />);
    expect(screen.queryByText('Đang giao')).not.toBeInTheDocument();
    expect(screen.getByText('Đã nhận món')).toBeInTheDocument();
  });

  it('đơn đã hủy hiển thị thông báo riêng', () => {
    render(<OrderStatusTimeline status="CANCELLED" deliveryType="DELIVERY" />);
    expect(screen.getByText('Đơn hàng đã bị hủy')).toBeInTheDocument();
  });
});
