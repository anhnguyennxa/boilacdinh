import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { randomInt, randomUUID } from 'node:crypto';
import type { AuthUser } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import * as momo from './gateways/momo';
import * as vnpay from './gateways/vnpay';

export type OnlineProvider = Exclude<PaymentMethod, 'COD'>;
type Mode = 'live' | 'mock' | null;
export type SettleOutcome = 'ok' | 'not_found' | 'already' | 'invalid_amount';

/** Mã tham chiếu gửi cổng thanh toán = id bản ghi payments bỏ dấu gạch (VNPay chỉ nhận chữ và số). */
export const toRef = (paymentId: string) => paymentId.replace(/-/g, '');
export function fromRef(ref: string): string | null {
  if (!/^[0-9a-f]{32}$/i.test(ref)) return null;
  return `${ref.slice(0, 8)}-${ref.slice(8, 12)}-${ref.slice(12, 16)}-${ref.slice(16, 20)}-${ref.slice(20)}`.toLowerCase();
}

const MOCK_VNPAY: vnpay.VnpayConfig = {
  tmnCode: 'MOCKTMN1',
  hashSecret: 'mock-vnpay-hash-secret',
  payUrl: '',
  apiUrl: '',
};
const MOCK_MOMO: momo.MomoConfig = {
  partnerCode: 'MOCKMOMO',
  accessKey: 'mock-momo-access',
  secretKey: 'mock-momo-secret',
  endpoint: '',
};

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function normalizeIp(ip: string | undefined) {
  if (!ip || ip === '::1') return '127.0.0.1';
  return ip.replace(/^::ffff:/, '');
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private reconciling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orders: OrdersService,
  ) {}

  // ───────────── Cấu hình ─────────────

  private get mockAllowed() {
    return this.config.get<boolean>('PAYMENT_MOCK') === true && this.config.get('NODE_ENV') !== 'production';
  }

  private get ttlMs() {
    return (this.config.get<number>('PAYMENT_TTL_MINUTES') ?? 15) * 60_000;
  }

  private apiUrl(path: string) {
    return `${this.config.getOrThrow<string>('API_PUBLIC_URL')}/api/v1${path}`;
  }

  webOrderUrl(code: string, result: 'success' | 'failed') {
    return `${this.config.getOrThrow<string>('WEB_URL')}/don-hang/${code}?payment=${result}`;
  }

  mode(provider: OnlineProvider): Mode {
    const c = this.config;
    const live =
      provider === 'VNPAY'
        ? c.get('VNPAY_TMN_CODE') && c.get('VNPAY_HASH_SECRET')
        : c.get('MOMO_PARTNER_CODE') && c.get('MOMO_ACCESS_KEY') && c.get('MOMO_SECRET_KEY');
    if (live) return 'live';
    return this.mockAllowed ? 'mock' : null;
  }

  vnpayConfig(): vnpay.VnpayConfig | null {
    const mode = this.mode('VNPAY');
    if (mode === 'mock') return MOCK_VNPAY;
    if (mode !== 'live') return null;
    return {
      tmnCode: this.config.getOrThrow('VNPAY_TMN_CODE'),
      hashSecret: this.config.getOrThrow('VNPAY_HASH_SECRET'),
      payUrl: this.config.getOrThrow('VNPAY_PAY_URL'),
      apiUrl: this.config.getOrThrow('VNPAY_API_URL'),
    };
  }

  momoConfig(): momo.MomoConfig | null {
    const mode = this.mode('MOMO');
    if (mode === 'mock') return MOCK_MOMO;
    if (mode !== 'live') return null;
    return {
      partnerCode: this.config.getOrThrow('MOMO_PARTNER_CODE'),
      accessKey: this.config.getOrThrow('MOMO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow('MOMO_SECRET_KEY'),
      endpoint: this.config.getOrThrow('MOMO_ENDPOINT'),
    };
  }

  methods() {
    const vnp = this.mode('VNPAY');
    const mm = this.mode('MOMO');
    return {
      COD: true,
      VNPAY: vnp !== null,
      MOMO: mm !== null,
      mock: vnp === 'mock' || mm === 'mock',
      ttlMinutes: this.ttlMs / 60_000,
    };
  }

  // ───────────── Khởi tạo thanh toán ─────────────

  async init(orderId: string, provider: OnlineProvider, ip: string | undefined, user?: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';
    if (order.userId && order.userId !== user?.id && !isStaff) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn này');
    }
    if (order.paymentMethod !== provider) throw new BadRequestException('Phương thức thanh toán không khớp với đơn');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Đơn đã được thanh toán');
    if (order.status !== 'PENDING') throw new BadRequestException('Đơn không còn chờ thanh toán');
    const expiresAt = new Date(order.createdAt.getTime() + this.ttlMs);
    if (expiresAt.getTime() - Date.now() < 60_000) throw new BadRequestException('Đơn đã hết hạn thanh toán');

    const mode = this.mode(provider);
    if (!mode) throw new BadRequestException(`Cổng ${provider} chưa được cấu hình`);

    const amount = order.total.toNumber();
    const ipAddr = normalizeIp(ip);
    // Chuỗi không dấu: VNPay khuyến nghị vnp_OrderInfo không có ký tự đặc biệt
    const orderInfo = `Thanh toan don hang ${order.code}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      if (order.paymentStatus === 'FAILED') {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'UNPAID' } });
      }
      return tx.payment.create({ data: { orderId: order.id, provider, amount, status: 'UNPAID' } });
    });
    const ref = toRef(payment.id);

    let payUrl: string;
    let init: Record<string, string>;
    if (mode === 'mock') {
      payUrl = this.apiUrl(`/payments/mock/${provider.toLowerCase()}/${ref}`);
      init = { mode: 'mock' };
    } else if (provider === 'VNPAY') {
      const built = vnpay.buildPayUrl(this.vnpayConfig()!, {
        ref,
        amount,
        orderInfo,
        returnUrl: this.apiUrl('/payments/vnpay/return'),
        ipAddr,
        createdAt: payment.createdAt,
        expiresAt,
      });
      payUrl = built.url;
      init = { mode: 'live', createDate: built.params.vnp_CreateDate, ipAddr };
    } else {
      const created = await momo.createPayment(this.momoConfig()!, {
        ref,
        amount,
        orderInfo,
        redirectUrl: this.apiUrl('/payments/momo/return'),
        ipnUrl: this.apiUrl('/payments/momo/ipn'),
      });
      payUrl = created.payUrl;
      init = { mode: 'live', requestId: created.requestId };
    }

    await this.prisma.payment.update({ where: { id: payment.id }, data: { rawResponse: { init } } });
    if (order.paymentStatus === 'FAILED') await this.orders.notify(order.id);
    return { payUrl, expiresAt: expiresAt.toISOString() };
  }

  // ───────────── Kết quả từ cổng (IPN / return) ─────────────

  /**
   * Ghi nhận kết quả, idempotent: updateMany có điều kiện trạng thái nên IPN và return URL đến cùng lúc
   * chỉ một bên ghi được. Giao dịch thành công đến muộn (sau khi đã đánh dấu thất bại/hết hạn) vẫn được ghi
   * là PAID để không mất tiền của khách — đơn đã hủy sẽ hiện "cần hoàn tiền" ở trang quản trị.
   */
  async settle(input: {
    provider: OnlineProvider;
    ref: string;
    amount: number;
    success: boolean;
    transactionId: string | null;
    raw: Record<string, unknown>;
  }): Promise<{ outcome: SettleOutcome; orderCode?: string }> {
    const id = fromRef(input.ref);
    const payment = id
      ? await this.prisma.payment.findUnique({ where: { id }, include: { order: { select: { id: true, code: true } } } })
      : null;
    if (!payment || payment.provider !== input.provider) return { outcome: 'not_found' };
    const orderCode = payment.order.code;
    if (payment.amount.toNumber() !== input.amount) {
      this.logger.warn(`Sai số tiền ${input.provider} ${orderCode}: ${input.amount} ≠ ${payment.amount}`);
      return { outcome: 'invalid_amount', orderCode };
    }

    const prevRaw = (payment.rawResponse ?? {}) as Prisma.JsonObject;
    try {
      const changed = await this.prisma.$transaction(async (tx) => {
        const res = await tx.payment.updateMany({
          where: { id: payment.id, status: input.success ? { in: ['UNPAID', 'FAILED'] } : 'UNPAID' },
          data: {
            status: input.success ? 'PAID' : 'FAILED',
            transactionId: input.success ? input.transactionId : undefined,
            rawResponse: { ...prevRaw, result: input.raw as Prisma.JsonObject },
          },
        });
        if (res.count === 0) return false;
        if (input.success) {
          await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } });
        } else {
          await tx.order.updateMany({
            where: { id: payment.orderId, paymentStatus: 'UNPAID' },
            data: { paymentStatus: 'FAILED' },
          });
        }
        return true;
      });
      if (!changed) return { outcome: 'already', orderCode };
    } catch (e) {
      // transaction_id đã được ghi cho một bản ghi khác → coi như đã xử lý
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { outcome: 'already', orderCode };
      throw e;
    }

    this.logger.log(`${input.provider} ${orderCode}: ${input.success ? 'thanh toán thành công' : 'thất bại/hủy'}`);
    await this.orders.notify(payment.orderId);
    return { outcome: 'ok', orderCode };
  }

  async handleVnpay(params: vnpay.VnpParams) {
    const cfg = this.vnpayConfig();
    if (!cfg || !vnpay.verifyParams(cfg.hashSecret, params)) return { outcome: 'invalid_signature' as const };
    const r = vnpay.parseResult(params);
    return this.settle({
      provider: 'VNPAY',
      ref: r.ref,
      amount: r.amount,
      success: r.success,
      transactionId: r.transactionNo,
      raw: params,
    });
  }

  async handleMomo(payload: momo.MomoResultPayload) {
    const cfg = this.momoConfig();
    if (!cfg || !momo.verifyResult(cfg, payload)) return { outcome: 'invalid_signature' as const };
    const r = momo.parseResult(payload);
    // MoMo có thể gửi trạng thái "đang xử lý" — chưa kết luận, chờ IPN tiếp theo hoặc đối soát
    if (r.pending) return { outcome: 'already' as const };
    return this.settle({
      provider: 'MOMO',
      ref: r.ref,
      amount: r.amount,
      success: r.success,
      transactionId: r.transId,
      raw: payload,
    });
  }

  // ───────────── Đối soát & hết hạn ─────────────

  @Interval(60_000)
  async reconcileJob() {
    try {
      const r = await this.reconcile();
      if (r.paid || r.failed || r.expired) this.logger.log(`Đối soát: ${JSON.stringify(r)}`);
    } catch (e) {
      this.logger.error(`Đối soát lỗi: ${(e as Error).message}`);
    }
  }

  /**
   * 1. Hỏi lại cổng thanh toán các giao dịch chưa có kết quả sau 2 phút (phòng khi mất IPN).
   * 2. Hủy đơn online quá hạn mà chưa trả tiền (hoàn lượt mã giảm giá).
   */
  async reconcile() {
    const summary = { checked: 0, paid: 0, failed: 0, expired: 0, errors: 0 };
    if (this.reconciling) return summary;
    this.reconciling = true;
    try {
      const now = Date.now();
      const pending = await this.prisma.payment.findMany({
        where: { status: 'UNPAID', createdAt: { lt: new Date(now - 2 * 60_000), gt: new Date(now - 24 * 3600_000) } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const p of pending) {
        const provider = p.provider as OnlineProvider;
        if (this.mode(provider) !== 'live') continue;
        const init = ((p.rawResponse as Prisma.JsonObject | null)?.init ?? {}) as Record<string, string>;
        if (init.mode !== 'live') continue;
        summary.checked++;
        try {
          const ref = toRef(p.id);
          const q =
            provider === 'VNPAY'
              ? await vnpay
                  .queryTransaction(this.vnpayConfig()!, { ref, transactionDate: init.createDate, ipAddr: init.ipAddr ?? '127.0.0.1' })
                  .then((r) => ({ status: r.status, tx: r.transactionNo, amount: r.amount }))
              : await momo.queryTransaction(this.momoConfig()!, ref).then((r) => ({ status: r.status, tx: r.transId, amount: r.amount }));
          if (q.status === 'pending') continue;
          const { outcome } = await this.settle({
            provider,
            ref,
            amount: q.amount ?? p.amount.toNumber(),
            success: q.status === 'paid',
            transactionId: q.tx,
            raw: { source: 'reconcile', ...q },
          });
          if (outcome === 'ok') summary[q.status === 'paid' ? 'paid' : 'failed']++;
        } catch (e) {
          summary.errors++;
          this.logger.warn(`Không đối soát được payment ${p.id}: ${(e as Error).message}`);
        }
      }

      const expired = await this.prisma.order.findMany({
        where: {
          paymentMethod: { not: 'COD' },
          paymentStatus: { not: 'PAID' },
          status: 'PENDING',
          createdAt: { lt: new Date(now - this.ttlMs) },
        },
        select: { id: true },
        take: 100,
      });
      for (const o of expired) {
        try {
          await this.orders.updateStatus(o.id, 'CANCELLED');
          summary.expired++;
        } catch (e) {
          summary.errors++;
          this.logger.warn(`Không hủy được đơn hết hạn ${o.id}: ${(e as Error).message}`);
        }
      }
      return summary;
    } finally {
      this.reconciling = false;
    }
  }

  // ───────────── Cổng giả lập (chỉ môi trường dev) ─────────────

  async mockPage(provider: OnlineProvider, ref: string): Promise<string> {
    if (this.mode(provider) !== 'mock') throw new NotFoundException();
    const id = fromRef(ref);
    const payment = id
      ? await this.prisma.payment.findUnique({ where: { id }, include: { order: { select: { code: true } } } })
      : null;
    if (!payment || payment.provider !== provider) throw new NotFoundException('Không tìm thấy giao dịch');

    const amount = payment.amount.toNumber();
    const orderInfo = `Thanh toan don hang ${payment.order.code}`;
    let successUrl: string;
    let cancelUrl: string;

    if (provider === 'VNPAY') {
      const base = {
        vnp_Amount: String(amount * 100),
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_OrderInfo: orderInfo,
        vnp_PayDate: vnpay.vnpDate(new Date()),
        vnp_TmnCode: MOCK_VNPAY.tmnCode,
        vnp_TxnRef: ref,
      };
      const sign = (extra: vnpay.VnpParams) =>
        this.apiUrl(`/payments/vnpay/return?${new URLSearchParams(vnpay.signParams(MOCK_VNPAY.hashSecret, { ...base, ...extra }))}`);
      successUrl = sign({ vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: String(randomInt(10_000_000, 99_999_999)) });
      cancelUrl = sign({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02', vnp_TransactionNo: '0' });
    } else {
      const base = {
        partnerCode: MOCK_MOMO.partnerCode,
        orderId: ref,
        requestId: randomUUID(),
        amount,
        orderInfo,
        orderType: 'momo_wallet',
        payType: 'qr',
        responseTime: Date.now(),
        extraData: '',
      };
      const sign = (extra: Record<string, string | number>) => {
        const payload = { ...base, ...extra };
        const signature = momo.signResult(MOCK_MOMO, payload);
        const qs = new URLSearchParams(Object.entries({ ...payload, signature }).map(([k, v]) => [k, String(v)]));
        return this.apiUrl(`/payments/momo/return?${qs}`);
      };
      successUrl = sign({ resultCode: 0, message: 'Successful.', transId: randomInt(1_000_000_000, 2_000_000_000) });
      cancelUrl = sign({ resultCode: 1006, message: 'Người dùng đã từ chối xác nhận thanh toán.', transId: 0 });
    }

    const brand = provider === 'VNPAY' ? { name: 'VNPay', color: '#005BAA' } : { name: 'MoMo', color: '#A50064' };
    const vnd = new Intl.NumberFormat('vi-VN').format(amount);
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brand.name} giả lập</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f4f5;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px}
.card{background:#fff;border-radius:20px;max-width:380px;width:100%;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center}
.brand{color:${brand.color};font-weight:800;font-size:28px}.tag{display:inline-block;background:#fef3c7;color:#92400e;border-radius:99px;padding:4px 12px;font-size:12px;font-weight:600;margin-top:8px}
.amount{font-size:32px;font-weight:800;margin:20px 0 4px}.muted{color:#71717a;font-size:14px}
a{display:block;border-radius:99px;padding:14px;font-weight:700;text-decoration:none;margin-top:12px}
.ok{background:${brand.color};color:#fff}.no{background:#f4f4f5;color:#3f3f46}</style></head>
<body><main class="card"><div class="brand">${brand.name}</div><span class="tag">Cổng giả lập · chỉ dùng khi phát triển</span>
<p class="amount">${vnd} ₫</p><p class="muted">Đơn ${payment.order.code}</p>
<a class="ok" href="${escapeAttr(successUrl)}">Thanh toán thành công</a><a class="no" href="${escapeAttr(cancelUrl)}">Hủy giao dịch</a>
<p class="muted" style="margin-top:20px">Kết quả được ký HMAC như cổng thật và đi qua cùng bộ xác thực chữ ký.</p></main></body></html>`;
  }
}
