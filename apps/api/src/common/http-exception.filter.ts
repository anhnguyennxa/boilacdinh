import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Mọi lỗi trả về dạng { statusCode, message, error }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? exception.message);
      return res.status(status).json({ statusCode: status, message, error: HttpStatus[status] ?? 'Error' });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return res.status(409).json({ statusCode: 409, message: 'Dữ liệu đã tồn tại', error: 'CONFLICT' });
      }
      if (exception.code === 'P2025') {
        return res.status(404).json({ statusCode: 404, message: 'Không tìm thấy dữ liệu', error: 'NOT_FOUND' });
      }
    }

    this.logger.error(exception);
    return res
      .status(500)
      .json({ statusCode: 500, message: 'Lỗi máy chủ, vui lòng thử lại', error: 'INTERNAL_SERVER_ERROR' });
  }
}
