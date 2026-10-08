import { Global, Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

const STARTUP_TAGS = ['menu', 'promos'];

/** Xóa cache Redis và báo Next.js revalidateTag khi dữ liệu thực đơn thay đổi. */
@Injectable()
export class MenuInvalidator implements OnApplicationBootstrap {
  private readonly logger = new Logger(MenuInvalidator.name);

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Khi API vừa khởi động: báo web làm mới thực đơn/ưu đãi — phòng trường hợp trang được build
   * hoặc làm mới lúc API chưa chạy. Web có thể lên sau API nên thử lại vài lần, không chặn khởi động.
   */
  onApplicationBootstrap() {
    void (async () => {
      for (let attempt = 1; attempt <= 6; attempt++) {
        if (await this.notifyWeb(STARTUP_TAGS, attempt === 6)) {
          this.logger.log('Đã báo web làm mới thực đơn sau khi khởi động');
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    })();
  }

  async menuChanged(tags: string[] = ['menu']) {
    await this.cache.invalidate('menu:');
    await this.notifyWeb(tags, true);
  }

  /** true nếu web nhận lệnh (hoặc chưa cấu hình — không có gì để báo). */
  private async notifyWeb(tags: string[], logFailure: boolean): Promise<boolean> {
    const secret = this.config.get<string>('REVALIDATE_SECRET');
    const webUrl = this.config.get<string>('WEB_URL');
    if (!secret || !webUrl) return true;
    try {
      const res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      if (logFailure) this.logger.warn(`Không gọi được revalidate của web: ${(err as Error).message}`);
      return false;
    }
  }
}

@Global()
@Module({
  providers: [MenuInvalidator],
  exports: [MenuInvalidator],
})
export class RevalidateModule {}
