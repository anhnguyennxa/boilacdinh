import { promoCondition, promoHeadline, promoValueLabel, type PromoDto } from '@foodhub/shared';
import { ArrowRight, CalendarClock, Flame, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PromoActions } from './promo-actions';

const DAY = 24 * 3600_000;

/** Định dạng theo giờ Việt Nam để server và trình duyệt ra cùng một chuỗi. */
const dateVn = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

function expiry(endsAt: string, now: number) {
  const left = new Date(endsAt).getTime() - now;
  if (left < DAY) return { text: 'Hết hạn hôm nay', urgent: true };
  if (left < 7 * DAY) return { text: `Còn ${Math.ceil(left / DAY)} ngày`, urgent: true };
  return { text: `HSD ${dateVn.format(new Date(endsAt))}`, urgent: false };
}

function Meta({ promo, now }: { promo: PromoDto; now: number }) {
  const exp = expiry(promo.endsAt, now);
  const scarce = promo.remaining != null && promo.remaining <= 50;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <li>{promoCondition(promo)}</li>
      <li className={cn('inline-flex items-center gap-1', exp.urgent && 'text-danger')}>
        <CalendarClock className="size-3" />
        {exp.text}
      </li>
      {promo.remaining != null && (
        <li className={cn('inline-flex items-center gap-1', scarce && 'text-danger')}>
          {scarce ? <Flame className="size-3" /> : <Users className="size-3" />}
          Còn {promo.remaining} lượt
        </li>
      )}
    </ul>
  );
}

/**
 * Đường cắt răng cưa kiểu vé: hai nửa hình tròn trùng màu nền trang ở hai mép.
 * Thẻ chứa dùng overflow-clip (không phải overflow-hidden): các chấm tròn thò ra ngoài sẽ khiến
 * overflow-hidden có vùng cuộn ẩn, và trình duyệt cuộn nội dung thẻ khi focus vào nút bên trong.
 */
function TicketNotch({ vertical }: { vertical?: boolean }) {
  const dot = 'absolute size-4 rounded-full border border-border bg-background';
  return vertical ? (
    <div aria-hidden className="relative w-px self-stretch border-l border-dashed border-border">
      <span className={cn(dot, '-top-2 left-1/2 -translate-x-1/2 -translate-y-1/2')} />
      <span className={cn(dot, '-bottom-2 left-1/2 -translate-x-1/2 translate-y-1/2')} />
    </div>
  ) : (
    <div aria-hidden className="relative -mx-6 my-6 border-t border-dashed border-border">
      <span className={cn(dot, '-left-2 top-1/2 -translate-y-1/2')} />
      <span className={cn(dot, '-right-2 top-1/2 -translate-y-1/2')} />
    </div>
  );
}

function FeaturedPromo({ promo, now }: { promo: PromoDto; now: number }) {
  return (
    <article className="glow-accent relative flex flex-col overflow-clip rounded-2xl border border-border bg-surface p-6 shadow-md">
      <div aria-hidden className="pointer-events-none absolute right-6 top-6 hidden select-none gap-2 text-4xl sm:flex">
        <span className="rotate-[-12deg]">🍜</span>
        <span className="translate-y-4 rotate-[8deg]">🥤</span>
        <span className="rotate-[-4deg]">☕</span>
      </div>

      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-highlight-foreground">
        Ưu đãi nổi bật
      </span>
      <p className="mt-6 flex items-end gap-3">
        <span className="text-gradient text-5xl font-bold tabular-nums">
          {promoValueLabel(promo)}
        </span>
        <span className="pb-1 text-base text-muted-foreground">giảm</span>
      </p>
      <h3 className="mt-3 text-xl font-semibold">{promoHeadline(promo)}</h3>
      {promo.description && <p className="mt-1 text-sm text-muted-foreground">{promo.description}</p>}
      <div className="mt-4">
        <Meta promo={promo} now={now} />
      </div>

      <TicketNotch />
      <PromoActions code={promo.code} />
    </article>
  );
}

function PromoTicket({ promo, now, index }: { promo: PromoDto; now: number; index: number }) {
  return (
    <article
      className="flex animate-rise-in overflow-clip rounded-2xl border border-border bg-surface shadow-sm transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong"
      style={{ animationDelay: `${120 + index * 60}ms` }}
    >
      <div className="grid w-24 shrink-0 place-items-center bg-primary-soft px-2 text-center">
        <span className="text-2xl font-bold tabular-nums text-primary">{promoValueLabel(promo)}</span>
      </div>
      <TicketNotch vertical />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-sm font-semibold">{promoHeadline(promo)}</h3>
          {promo.description && <p className="truncate text-xs text-muted-foreground">{promo.description}</p>}
        </div>
        <Meta promo={promo} now={now} />
        <PromoActions code={promo.code} compact />
      </div>
    </article>
  );
}

export function PromoHero({ promos }: { promos: PromoDto[] }) {
  if (promos.length === 0) return null;
  // Trang được ISR mỗi 5 phút; "còn x ngày" tính tại lúc render trên server
  const now = Date.now();
  const [featured, ...rest] = promos;

  return (
    <section id="uu-dai" aria-labelledby="uu-dai-title" className="mt-16 scroll-mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Ưu đãi hôm nay</p>
          <h2 id="uu-dai-title" className="mt-2 text-2xl font-semibold">
            Ăn ngon hơn, trả ít hơn
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bấm “Áp dụng” để gắn mã vào giỏ — ưu đãi được trừ khi thanh toán nếu đơn đủ điều kiện.
          </p>
        </div>
        <Link href="/thuc-don" className="inline-flex items-center gap-1 text-sm text-primary transition-colors duration-150 hover:text-foreground">
          Chọn món ngay <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className={cn('grid gap-3', rest.length > 0 && 'lg:grid-cols-[1.3fr_1fr]')}>
        <div className="animate-rise-in">
          <FeaturedPromo promo={featured} now={now} />
        </div>
        {rest.length > 0 && (
          <div className="flex flex-col gap-3">
            {rest.slice(0, 3).map((p, i) => (
              <PromoTicket key={p.code} promo={p} now={now} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
