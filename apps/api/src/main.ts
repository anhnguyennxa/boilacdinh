import { INestApplicationContext, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './modules/uploads/uploads.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const webUrl = config.getOrThrow<string>('WEB_URL');

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

  const swagger = new DocumentBuilder()
    .setTitle('Bối Lạc Đình API')
    .setDescription('REST API đặt đồ ăn & nước uống')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/api/v1 · Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
