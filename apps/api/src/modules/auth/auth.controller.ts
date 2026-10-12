import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService, REFRESH_TTL_MS } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export const REFRESH_COOKIE = 'fh_rt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      secure: config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_MS,
    };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.withCookie(res, await this.auth.register(dto));
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.withCookie(res, await this.auth.login(dto));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Khách chưa đăng nhập (không có cookie) là trạng thái bình thường, không phải lỗi:
    // trả null thay vì 401 để trình duyệt không báo lỗi đỏ trên mọi lượt xem trang.
    if (!req.cookies?.[REFRESH_COOKIE]) return null;
    try {
      return this.withCookie(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]));
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  private withCookie(res: Response, result: Awaited<ReturnType<AuthService['login']>>) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, this.cookieOptions);
    return { accessToken: result.accessToken, user: result.user };
  }
}
