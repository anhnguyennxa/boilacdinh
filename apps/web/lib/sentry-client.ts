/**
 * Sentry phía trình duyệt, tải lười: SDK (~70KB) không nằm trong JS ban đầu, chỉ tải sau khi trang
 * load xong và khi có NEXT_PUBLIC_SENTRY_DSN. Bỏ trống DSN → không bao giờ tải.
 */
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

type SentryModule = typeof import('@sentry/nextjs');
let loading: Promise<SentryModule> | null = null;

function load(): Promise<SentryModule> | null {
  if (!DSN) return null;
  loading ??= import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
    return Sentry;
  });
  return loading;
}

/** Gọi một lần khi app khởi động (Providers). */
export function initSentry() {
  if (!DSN) return;
  const start = () => void load();
  if (document.readyState === 'complete') requestIdle(start);
  else window.addEventListener('load', () => requestIdle(start), { once: true });
}

/** Gửi lỗi từ error boundary (route-error, global-error). */
export function reportError(error: unknown) {
  void load()?.then((Sentry) => Sentry.captureException(error));
}

function requestIdle(cb: () => void) {
  if ('requestIdleCallback' in window) requestIdleCallback(cb, { timeout: 5000 });
  else setTimeout(cb, 1000);
}
