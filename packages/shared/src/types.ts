import type {
  CategoryType,
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from './enums';

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  imageUrl: string | null;
  sortOrder: number;
}

export interface OptionDto {
  id: string;
  name: string;
  extraPrice: number;
}

export interface OptionGroupDto {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: OptionDto[];
}

export interface ProductSummaryDto {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  soldCount: number;
  ratingAvg: number;
  category: Pick<CategoryDto, 'id' | 'name' | 'slug' | 'type'>;
}

export interface ProductDetailDto extends ProductSummaryDto {
  description: string | null;
  images: { id: string; url: string }[];
  optionGroups: OptionGroupDto[];
}

export interface OrderItemDto {
  id: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  options: { group: string; name: string; extraPrice: number }[];
  lineTotal: number;
}

export interface OrderDto {
  id: string;
  code: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  customerName: string;
  customerPhone: string;
  address: Record<string, string> | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  note: string | null;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodsDto {
  COD: boolean;
  VNPAY: boolean;
  MOMO: boolean;
  /** Đang dùng cổng giả lập (môi trường dev) */
  mock: boolean;
  /** Đơn online chưa trả sau số phút này sẽ tự hủy */
  ttlMinutes: number;
}

export interface PaymentInitDto {
  payUrl: string;
  expiresAt: string;
}

export interface CouponCheckDto {
  code: string;
  discount: number;
}

/** Sự kiện Socket.IO */
export const SocketEvents = {
  ORDER_UPDATED: 'order:updated',
  ORDER_CREATED: 'order:created',
  JOIN_ORDER: 'order:join',
} as const;
