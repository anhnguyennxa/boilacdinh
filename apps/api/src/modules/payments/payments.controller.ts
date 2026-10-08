import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, OptionalJwtGuard, RolesGuard } from '../../common/guards';
import type { MomoResultPayload } from './gateways/momo';
import { IPN_RESPONSE, type VnpParams } from './gateways/vnpay';
import { PaymentsService, type OnlineProvider } from './payments.service';

const PROVIDER: Record<string, OnlineProvider> = { vnpay: 'VNPAY', momo: 'MOMO' };

function providerOf(slug: string): OnlineProvider {
  const p = PROVIDER[slug];
  if (!p) throw new NotFoundException('Cổng thanh toán không hỗ trợ');
  return p;
}

/** Query string của Express có thể là mảng; cổng thanh toán chỉ gửi giá trị đơn. */
function flat(q: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(q).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v ?? '')]));
}

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments/methods')
  methods() {
    return this.payments.methods();
  }

  // ── VNPay ──

  /** Trình duyệt quay về sau khi thanh toán → ghi nhận (idempotent) rồi chuyển tới trang theo dõi đơn. */
  @Get('payments/vnpay/return')
  @SkipThrottle()
  async vnpayReturn(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const result = await this.payments.handleVnpay(flat(query) as VnpParams);
    return this.redirectAfter(res, result, flat(query).vnp_ResponseCode === '00');
  }

  /** IPN server-to-server; khai báo URL này trong cấu hình merchant VNPay. */
  @Get('payments/vnpay/ipn')
  @SkipThrottle()
  async vnpayIpn(@Query() query: Record<string, unknown>, @Res() res: Response) {
    try {
      const { outcome } = await this.payments.handleVnpay(flat(query) as VnpParams);
      return res.status(200).json(IPN_RESPONSE[outcome]);
    } catch {
      return res.status(200).json(IPN_RESPONSE.error);
    }
  }

  // ── MoMo ──

  @Get('payments/momo/return')
  @SkipThrottle()
  async momoReturn(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const payload = flat(query) as MomoResultPayload;
    const result = await this.payments.handleMomo(payload);
    return this.redirectAfter(res, result, String(payload.resultCode) === '0');
  }

  /** MoMo yêu cầu phản hồi HTTP 204 khi đã nhận IPN hợp lệ. */
  @Post('payments/momo/ipn')
  @SkipThrottle()
  async momoIpn(@Body() body: MomoResultPayload, @Res() res: Response) {
    const { outcome } = await this.payments.handleMomo(body ?? {});
    if (outcome === 'invalid_signature') return res.status(400).json({ message: 'Invalid signature' });
    return res.status(204).end();
  }

  // ── Cổng giả lập (dev) ──

  @Get('payments/mock/:provider/:ref')
  @SkipThrottle()
  async mock(@Param('provider') provider: string, @Param('ref') ref: string, @Res() res: Response) {
    const html = await this.payments.mockPage(providerOf(provider), ref);
    return res.type('html').send(html);
  }

  // ── Quản trị ──

  @Post('admin/payments/reconcile')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  reconcile() {
    return this.payments.reconcile();
  }

  /** Khai báo sau các route tĩnh (payments/momo/ipn…) để không bị khớp nhầm. */
  @Post('payments/:orderId/:provider')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  init(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('provider') provider: string,
    @Req() req: Request,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.payments.init(orderId, providerOf(provider), req.ip, user);
  }

  private redirectAfter(
    res: Response,
    result: { outcome: string; orderCode?: string },
    gatewaySaysSuccess: boolean,
  ) {
    if (result.outcome === 'invalid_signature' || !result.orderCode) {
      throw new BadRequestException('Kết quả thanh toán không hợp lệ');
    }
    // "already": IPN đã ghi nhận trước đó — hiển thị theo kết quả cổng trả về
    const success = result.outcome === 'ok' || result.outcome === 'already' ? gatewaySaysSuccess : false;
    return res.redirect(302, this.payments.webOrderUrl(result.orderCode, success ? 'success' : 'failed'));
  }
}
