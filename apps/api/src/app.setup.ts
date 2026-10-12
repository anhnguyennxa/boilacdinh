import { INestApplicationContext, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { ServerOptions } from 'socket.io';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';
import { UPLOAD_DIR } from './modules/uploads/uploads.module';

class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, { ...options, cors: { origin: this.origin, credentials: true } });
  }
}

/** Cấu hình dùng chung cho main.ts và test e2e — để test chạy đúng như production. */
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  const webUrl = config.getOrThrow<string>('WEB_URL');

  app.useLogger(app.get(Logger));
  // Sau proxy của nền tảng (Render, Nginx…): lấy IP thật cho throttler/VNPay và nhận diện HTTPS
  app.set('trust proxy', Number(config.get('TRUST_PROXY') ?? 1));
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  // Ảnh món tải lên khi không dùng Cloudinary; tên file ngẫu nhiên nên cache lâu dài được
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads', maxAge: '365d', immutable: true, index: false, dotfiles: 'deny' });
  app.enableCors({ origin: webUrl, credentials: true });
  app.useWebSocketAdapter(new SocketIoAdapter(app, webUrl));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();
  return app;
}
