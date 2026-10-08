import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, Observable } from 'rxjs';

export class PageResult<T> {
  constructor(
    readonly items: T[],
    readonly page: number,
    readonly limit: number,
    readonly total: number,
  ) {}
}

/** Decimal của Prisma → number (VNĐ không có phần lẻ, nằm gọn trong Number). */
export function serialize<T = unknown>(value: unknown): T {
  if (value instanceof Prisma.Decimal) return value.toNumber() as T;
  if (value instanceof Date) return value.toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)])) as T;
  }
  return value as T;
}

/** Phản hồi thống nhất { data, meta? }. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof PageResult) {
          return {
            data: serialize(result.items),
            meta: { page: result.page, limit: result.limit, total: result.total },
          };
        }
        return { data: serialize(result ?? null) };
      }),
    );
  }
}
