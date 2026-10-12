import './instrument';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true }));
  const config = app.get(ConfigService);

  if (config.get('NODE_ENV') !== 'production' || config.get('SWAGGER') === 'true') {
    const swagger = new DocumentBuilder()
      .setTitle('Bối Lạc Đình API')
      .setDescription('REST API đặt đồ ăn & nước uống')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  app.get(Logger).log(`API: http://localhost:${port}/api/v1 · Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
