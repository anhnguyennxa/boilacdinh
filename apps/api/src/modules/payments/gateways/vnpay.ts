import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/** Chuẩn VNPay 2.1.0: sắp xếp khóa, encode kiểu form (khoảng trắng = "+"), HMAC-SHA512. */

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;
  apiUrl: string;
}

export type VnpParams = Record<string, string>;

const encode = (v: string) => encodeURIComponent(v).replace(/%20/g, '+');

export function vnpSignData(params: VnpParams): string {
  return Object.keys(params)
    // Giống demo Node/PHP của VNPay: giữ cả giá trị rỗng, chỉ bỏ trường chữ ký
    .filter((k) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] != null)
    .sort()
    .map((k) => `${encode(k)}=${encode(String(params[k]))}`)
    .join('&');
}

export const hmac512 = (secret: string, data: string) => createHmac('sha512', secret).update(data, 'utf8').digest('hex');

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a.toLowerCase(), 'utf8');
  const bb = Buffer.from(b.toLowerCase(), 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Thời gian theo múi giờ GMT+7, dạng yyyyMMddHHmmss như VNPay yêu cầu. */
export function vnpDate(d: Date): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

export function buildPayUrl(
  cfg: Pick<VnpayConfig, 'tmnCode' | 'hashSecret' | 'payUrl'>,
  p: { ref: string; amount: number; orderInfo: string; returnUrl: string; ipAddr: string; createdAt: Date; expiresAt: Date },
) {
  const params: VnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: String(p.amount * 100), // VNPay tính theo đơn vị 1/100 đồng
    vnp_CurrCode: 'VND',
    vnp_TxnRef: p.ref,
    vnp_OrderInfo: p.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: p.returnUrl,
    vnp_IpAddr: p.ipAddr,
    vnp_CreateDate: vnpDate(p.createdAt),
    vnp_ExpireDate: vnpDate(p.expiresAt),
  };
  const signData = vnpSignData(params);
  return { url: `${cfg.payUrl}?${signData}&vnp_SecureHash=${hmac512(cfg.hashSecret, signData)}`, params };
}

export function signParams(hashSecret: string, params: VnpParams): VnpParams {
  return { ...params, vnp_SecureHash: hmac512(hashSecret, vnpSignData(params)) };
}

export function verifyParams(hashSecret: string, params: VnpParams): boolean {
  const given = params.vnp_SecureHash;
  if (!given) return false;
  return safeEqualHex(given, hmac512(hashSecret, vnpSignData(params)));
}

export interface VnpResult {
  ref: string;
  /** Đồng (đã chia 100) */
  amount: number;
  success: boolean;
  transactionNo: string | null;
}

export function parseResult(params: VnpParams): VnpResult {
  return {
    ref: params.vnp_TxnRef,
    amount: Math.round(Number(params.vnp_Amount) / 100),
    success: params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00',
    // VNPay trả "0" khi giao dịch không thành công/chưa có mã
    transactionNo: params.vnp_TransactionNo && params.vnp_TransactionNo !== '0' ? params.vnp_TransactionNo : null,
  };
}

/** Phản hồi IPN theo tài liệu VNPay */
export const IPN_RESPONSE = {
  ok: { RspCode: '00', Message: 'Confirm Success' },
  not_found: { RspCode: '01', Message: 'Order not found' },
  already: { RspCode: '02', Message: 'Order already confirmed' },
  invalid_amount: { RspCode: '04', Message: 'Invalid amount' },
  invalid_signature: { RspCode: '97', Message: 'Invalid signature' },
  error: { RspCode: '99', Message: 'Unknown error' },
} as const;

export type QueryOutcome = { status: 'paid' | 'failed' | 'pending'; transactionNo: string | null; amount: number | null };

/** Truy vấn trạng thái giao dịch (querydr) — dùng cho đối soát khi không nhận được IPN. */
export async function queryTransaction(
  cfg: VnpayConfig,
  p: { ref: string; transactionDate: string; ipAddr: string },
): Promise<QueryOutcome> {
  const body = {
    vnp_RequestId: randomUUID().replace(/-/g, ''),
    vnp_Version: '2.1.0',
    vnp_Command: 'querydr',
    vnp_TmnCode: cfg.tmnCode,
    vnp_TxnRef: p.ref,
    vnp_OrderInfo: `Doi soat ${p.ref}`,
    vnp_TransactionDate: p.transactionDate,
    vnp_CreateDate: vnpDate(new Date()),
    vnp_IpAddr: p.ipAddr,
  };
  const data = [
    body.vnp_RequestId,
    body.vnp_Version,
    body.vnp_Command,
    body.vnp_TmnCode,
    body.vnp_TxnRef,
    body.vnp_TransactionDate,
    body.vnp_CreateDate,
    body.vnp_IpAddr,
    body.vnp_OrderInfo,
  ].join('|');

  const res = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, vnp_SecureHash: hmac512(cfg.hashSecret, data) }),
    signal: AbortSignal.timeout(10_000),
  });
  const r = (await res.json()) as Record<string, string>;

  const respData = [
    r.vnp_ResponseId,
    r.vnp_Command,
    r.vnp_ResponseCode,
    r.vnp_Message,
    r.vnp_TmnCode,
    r.vnp_TxnRef,
    r.vnp_Amount,
    r.vnp_BankCode,
    r.vnp_PayDate,
    r.vnp_TransactionNo,
    r.vnp_TransactionType,
    r.vnp_TransactionStatus,
    r.vnp_OrderInfo,
    r.vnp_PromotionCode,
    r.vnp_PromotionAmount,
  ]
    .map((v) => v ?? '')
    .join('|');
  if (!r.vnp_SecureHash || !safeEqualHex(r.vnp_SecureHash, hmac512(cfg.hashSecret, respData))) {
    throw new Error('VNPay querydr: chữ ký phản hồi không hợp lệ');
  }
  if (r.vnp_ResponseCode !== '00') return { status: 'pending', transactionNo: null, amount: null };

  const status = r.vnp_TransactionStatus === '00' ? 'paid' : r.vnp_TransactionStatus === '01' ? 'pending' : 'failed';
  return {
    status,
    transactionNo: r.vnp_TransactionNo && r.vnp_TransactionNo !== '0' ? r.vnp_TransactionNo : null,
    amount: r.vnp_Amount ? Math.round(Number(r.vnp_Amount) / 100) : null,
  };
}
