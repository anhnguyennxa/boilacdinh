import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  REVALIDATE_SECRET: z.string().min(8).optional(),

  // Địa chỉ công khai của API để cổng thanh toán gọi về (return/IPN)
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  /** Cổng giả lập trên máy dev khi chưa có tài khoản sandbox; luôn tắt ở production. */
  PAYMENT_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  PAYMENT_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),

  VNPAY_TMN_CODE: z.string().optional(),
  VNPAY_HASH_SECRET: z.string().optional(),
  VNPAY_PAY_URL: z.string().url().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNPAY_API_URL: z.string().url().default('https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'),

  MOMO_PARTNER_CODE: z.string().optional(),
  MOMO_ACCESS_KEY: z.string().optional(),
  MOMO_SECRET_KEY: z.string().optional(),
  MOMO_ENDPOINT: z.string().url().default('https://test-payment.momo.vn'),

  /** cloudinary://<api_key>:<api_secret>@<cloud_name> — bỏ trống thì lưu ảnh vào apps/api/uploads */
  CLOUDINARY_URL: z
    .string()
    .regex(/^cloudinary:\/\/[^:]+:[^@]+@.+$/, 'CLOUDINARY_URL phải có dạng cloudinary://key:secret@cloud')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type Env = z.infer<typeof envSchema>;

/** Dùng cho ConfigModule.validate: dừng app ngay nếu thiếu biến môi trường. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
  }
  return parsed.data;
}
