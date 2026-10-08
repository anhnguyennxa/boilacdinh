import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Nhập họ tên').max(100),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  phone: phone.optional(),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const addressSchema = z.object({
  receiverName: z.string().trim().min(2, 'Nhập tên người nhận'),
  phone,
  street: z.string().trim().min(3, 'Nhập số nhà, tên đường'),
  ward: z.string().trim().min(1, 'Nhập phường/xã'),
  district: z.string().trim().min(1, 'Nhập quận/huyện'),
  city: z.string().trim().min(1, 'Nhập tỉnh/thành phố'),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  optionIds: z.array(z.string().uuid()).max(20).default([]),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const deliveryAddressSchema = addressSchema.omit({ receiverName: true, phone: true });
export type DeliveryAddressInput = z.infer<typeof deliveryAddressSchema>;

const orderBase = z.object({
  deliveryType: z.enum(['DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['COD', 'VNPAY', 'MOMO']),
  customerName: z.string().trim().min(2, 'Nhập họ tên'),
  customerPhone: phone,
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

/** Form thanh toán: ô địa chỉ luôn có trong form nhưng chỉ kiểm tra khi giao tận nơi. */
export const checkoutFormSchema = orderBase
  .extend({
    address: z.object({ street: z.string(), ward: z.string(), district: z.string(), city: z.string() }),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType !== 'DELIVERY') return;
    const r = deliveryAddressSchema.safeParse(v.address);
    if (!r.success) {
      for (const issue of r.error.issues) ctx.addIssue({ ...issue, path: ['address', ...issue.path] });
    }
  });
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

export const createOrderSchema = orderBase
  .extend({
    items: z.array(cartItemSchema).min(1, 'Giỏ hàng trống').max(50),
    address: deliveryAddressSchema.optional(),
    couponCode: z.string().trim().toUpperCase().optional(),
  })
  .refine((v) => v.deliveryType === 'PICKUP' || v.address, {
    message: 'Cần địa chỉ giao hàng',
    path: ['address'],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
