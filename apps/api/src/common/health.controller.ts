import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './cache.service';

/**
 * Cho dịch vụ giám sát uptime và health check của nền tảng triển khai.
 * Database lỗi → 503 (API không phục vụ được); Redis lỗi chỉ báo "down" vì API vẫn chạy được không cache.
 */
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async check() {
    const [database, redis] = await Promise.all([this.pingDb(), this.cache.ping()]);
    const body = {
      status: database === 'up' ? 'ok' : 'error',
      database,
      redis,
      uptime: Math.round(process.uptime()),
      version: process.env.SENTRY_RELEASE ?? process.env.npm_package_version ?? 'dev',
    };
    if (database !== 'up') throw new ServiceUnavailableException(body);
    return body;
  }

  private async pingDb(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }
}
