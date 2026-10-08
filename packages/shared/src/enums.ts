export const Role = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  DELIVERING: 'DELIVERING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const DeliveryType = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
} as const;
export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType];

export const PaymentMethod = {
  COD: 'COD',
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const CategoryType = {
  FOOD: 'FOOD',
  DRINK: 'DRINK',
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const CouponType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
} as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: 'Tiền mặt',
  VNPAY: 'VNPay',
  MOMO: 'Ví MoMo',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

/** Trạng thái kế tiếp hợp lệ. Đơn nhận tại quầy bỏ qua bước DELIVERING. */
export function nextStatuses(status: OrderStatus, deliveryType: DeliveryType): OrderStatus[] {
  switch (status) {
    case 'PENDING':
      return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['PREPARING', 'CANCELLED'];
    case 'PREPARING':
      return deliveryType === 'PICKUP' ? ['COMPLETED', 'CANCELLED'] : ['DELIVERING', 'CANCELLED'];
    case 'DELIVERING':
      return ['COMPLETED'];
    default:
      return [];
  }
}

export function statusFlow(deliveryType: DeliveryType): OrderStatus[] {
  return deliveryType === 'PICKUP'
    ? ['PENDING', 'CONFIRMED', 'PREPARING', 'COMPLETED']
    : ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'COMPLETED'];
}
