'use client';

import { ArrowRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { HeroSlide } from '@/lib/hero-slides';
import { cn } from '@/lib/utils';

const FADE_MS = 1200;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hero có ảnh nền tự chuyển (mờ dần + zoom chậm). Việc chuyển ảnh do animation của thanh tiến trình
 * quyết định (onAnimationEnd) nên tạm dừng là cả thanh lẫn ảnh cùng đứng yên, không lệch nhịp.
 */
export function HeroSlider({
  slides,
  interval = 6000,
  children,
}: {
  slides: HeroSlide[];
  interval?: number;
  children: React.ReactNode;
}) {
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [engaged, setEngaged] = useState(false); // chuột/bàn phím đang ở trong hero
  const [hidden, setHidden] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const paused = userPaused || engaged || hidden || reduced;

  // Chỉ tải ảnh đang hiện + ảnh kế tiếp; ảnh đã tải thì giữ lại để quay vòng không tải lại
  const mounted = useRef(new Set([0, 1 % n]));
  mounted.current.add(index);
  mounted.current.add((index + 1) % n);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  function go(next: number) {
    const target = (next + n) % n;
    if (target === index) return;
    setPrev(index);
    setIndex(target);
  }

  const current = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Món nổi bật"
      className="theme-dark relative isolate overflow-clip border-b border-border bg-background text-foreground [color-scheme:dark]"
      onMouseEnter={() => setEngaged(true)}
      onMouseLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEngaged(false);
      }}
    >
      {/* Ảnh nền — trang trí, nội dung mô tả nằm ở chú thích bên dưới */}
      <div aria-hidden className="absolute inset-0 z-0 bg-surface">
        {slides.map((s, i) => {
          if (!mounted.current.has(i)) return null;
          const visible = i === index;
          const animating = visible || i === prev;
          return (
            <div
              key={s.src}
              className={cn('absolute inset-0 transition-opacity ease-out', visible ? 'opacity-100' : 'opacity-0')}
              style={{ transitionDuration: `${FADE_MS}ms` }}
            >
              <Image
                src={s.src}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                quality={70}
                className="object-cover"
                style={{
                  objectPosition: s.focus,
                  transformOrigin: s.focus,
                  animation: animating ? `ken-burns ${interval + FADE_MS}ms ease-out forwards` : undefined,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
              />
            </div>
          );
        })}
        <div className="hero-scrim absolute inset-0" />
      </div>

      <div className="relative z-[1] mx-auto max-w-container px-4 pb-6 pt-16 text-center sm:pt-24">
        {children}

        {/* Chú thích + điều khiển */}
        <div className="mt-12 flex items-center justify-between gap-4 text-left">
          <Link
            href={current.href}
            className="group hidden min-w-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-3 pr-2 text-xs text-muted-foreground shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-foreground sm:inline-flex"
          >
            <span className="shrink-0">Trong ảnh</span>
            <span key={index} className="animate-fade-in truncate font-medium text-foreground">
              {current.caption}
            </span>
            <ArrowRight className="size-3 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>

          <div className="ml-auto flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 shadow-sm">
            <div className="flex items-center" role="group" aria-label="Chọn ảnh">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Ảnh ${i + 1}: ${s.caption}`}
                  aria-current={i === index ? 'true' : undefined}
                  className="group grid h-6 w-6 place-items-center sm:w-8"
                >
                  <span className="relative h-1 w-4 overflow-hidden rounded-full bg-border-strong transition-colors duration-150 group-hover:bg-muted-foreground sm:w-6">
                    {i === index && (
                      <span
                        key={`${index}-${reduced}`}
                        className="absolute inset-0 origin-left rounded-full bg-foreground"
                        style={
                          reduced
                            ? undefined
                            : {
                                animation: `progress ${interval}ms linear forwards`,
                                animationPlayState: paused ? 'paused' : 'running',
                              }
                        }
                        onAnimationEnd={() => {
                          if (!paused && !reduced) go(index + 1);
                        }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? 'Tiếp tục trình chiếu' : 'Tạm dừng trình chiếu'}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {userPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
