import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/** MoMo API v2: chữ ký HMAC-SHA256 trên chuỗi "key=value&..." theo thứ tự cố định trong tài liệu. */

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
}

const hmac256 = (secret: string, data: string) => createHmac('sha256', secret).update(data, 'utf8').digest('hex');

function rawSignature(fields: string[], values: Record<string, string | number | undefined>) {
  return fields.map((k) => `${k}=${values[k] ?? ''}`).join('&');
}

const CREATE_FIELDS = ['accessKey', 'amount', 'extraData', 'ipnUrl', 'orderId', 'orderInfo', 'partnerCode', 'redirectUrl', 'requestId', 'requestType'];
/** Dùng chung cho IPN và query redirect */
const RESULT_FIELDS = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];
const QUERY_FIELDS = ['accessKey', 'orderId', 'partnerCode', 'requestId'];

export type MomoResultPayload = Record<string, string | number> & { signature?: string };

export function signResult(cfg: Pick<MomoConfig, 'accessKey' | 'secretKey'>, payload: MomoResultPayload): string {
  return hmac256(cfg.secretKey, rawSignature(RESULT_FIELDS, { ...payload, accessKey: cfg.accessKey }));
}

export function verifyResult(cfg: Pick<MomoConfig, 'accessKey' | 'secretKey'>, payload: MomoResultPayload): boolean {
  const given = String(payload.signature ?? '');
  const expected = signResult(cfg, payload);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export interface MomoResult {
  ref: string;
  amount: number;
  success: boolean;
  transId: string | null;
  /** 1000: đã khởi tạo, chờ người dùng xác nhận; 7000/7002: đang xử lý */
  pending: boolean;
}

export function parseResult(payload: MomoResultPayload): MomoResult {
  const code = Number(payload.resultCode);
  // MoMo cho phép 9000 (đã xác nhận, chờ capture) với giao dịch 2 bước; dùng captureWallet nên 0 là thành công
  return {
    ref: String(payload.orderId),
    amount: Number(payload.amount),
    success: code === 0,
    pending: code === 1000 || code === 7000 || code === 7002,
    transId: payload.transId && String(payload.transId) !== '0' ? String(payload.transId) : null,
  };
}

export async function createPayment(
  cfg: MomoConfig,
  p: { ref: string; amount: number; orderInfo: string; redirectUrl: string; ipnUrl: string },
): Promise<{ payUrl: string; requestId: string }> {
  const body = {
    partnerCode: cfg.partnerCode,
    requestId: randomUUID(),
    amount: p.amount,
    orderId: p.ref,
    orderInfo: p.orderInfo,
    redirectUrl: p.redirectUrl,
    ipnUrl: p.ipnUrl,
    requestType: 'captureWallet',
    extraData: '',
    lang: 'vi',
  };
  const signature = hmac256(cfg.secretKey, rawSignature(CREATE_FIELDS, { ...body, accessKey: cfg.accessKey }));
  const res = await fetch(`${cfg.endpoint}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, signature }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { resultCode: number; message: string; payUrl?: string };
  if (json.resultCode !== 0 || !json.payUrl) throw new Error(`MoMo: ${json.message} (${json.resultCode})`);
  return { payUrl: json.payUrl, requestId: body.requestId };
}

export async function queryTransaction(cfg: MomoConfig, ref: string): Promise<{ status: 'paid' | 'failed' | 'pending'; transId: string | null; amount: number | null }> {
  const body = { partnerCode: cfg.partnerCode, requestId: randomUUID(), orderId: ref, lang: 'vi' };
  const signature = hmac256(cfg.secretKey, rawSignature(QUERY_FIELDS, { ...body, accessKey: cfg.accessKey }));
  const res = await fetch(`${cfg.endpoint}/v2/gateway/api/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, signature }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as { resultCode: number; transId?: number; amount?: number };
  const parsed = parseResult({ ...json, orderId: ref } as unknown as MomoResultPayload);
  return {
    status: parsed.success ? 'paid' : parsed.pending ? 'pending' : 'failed',
    transId: parsed.transId,
    amount: json.amount ?? null,
  };
}
