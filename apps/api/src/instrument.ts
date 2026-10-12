import * as Sentry from '@sentry/nestjs';

/**
 * Phải được import đầu tiên trong main.ts để Sentry gắn được vào các module.
 * Không có SENTRY_DSN thì không khởi tạo — Sentry.captureException khi đó là no-op.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}
