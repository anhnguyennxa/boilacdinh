import { Global, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cache thực đơn trên Redis. Nếu Redis không chạy, mọi thao tác trở thành no-op
 * để API vẫn phục vụ được (chỉ chậm hơn).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    this.redis = url
      ? new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : null;
    this.redis?.on('error', (err) => this.logger.warn(`Redis: ${err.message}`));
  }

  async wrap<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await load();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.ready()) return null;
    try {
      const raw = await this.redis!.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number) {
    if (!this.ready()) return;
    try {
      await this.redis!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      /* bỏ qua lỗi cache */
    }
  }

  /** Xóa mọi key bắt đầu bằng prefix, ví dụ "menu:" khi admin sửa món. */
  async invalidate(prefix: string) {
    if (!this.ready()) return;
    try {
      const stream = this.redis!.scanStream({ match: `${prefix}*`, count: 100 });
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length) await this.redis!.del(...keys);
      }
    } catch {
      /* bỏ qua lỗi cache */
    }
  }

  /** Cho health check: "disabled" khi không cấu hình REDIS_URL. */
  async ping(): Promise<'up' | 'down' | 'disabled'> {
    if (!this.redis) return 'disabled';
    try {
      return (await this.redis.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  private ready() {
    return this.redis?.status === 'ready';
  }

  async onModuleDestroy() {
    this.redis?.disconnect();
  }
}

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
