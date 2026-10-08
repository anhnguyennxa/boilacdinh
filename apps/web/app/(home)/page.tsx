import { promoHeadline, type CategoryDto, type ProductSummaryDto, type PromoDto } from '@foodhub/shared';
import { ArrowRight, Bike, Clock, Store } from 'lucide-react';
import Link from 'next/link';
import { ProductGrid } from '@/components/product/product-grid';
import { Button } from '@/components/ui/button';
import { HeroSlider } from '@/components/home/hero-slider';
import { Container } from '@/components/layout/shop-shell';
import { PromoHero } from '@/components/home/promo-hero';
import { getCategories, getProducts, getPromos } from '@/lib/api';
import { HERO_SLIDES } from '@/lib/hero-slides';
import { CATEGORY_EMOJI } from '@/lib/product-visual';

export const revalidate = 300;

async function load() {
  try {
    const [categories, bestSellers, newest, promos] = await Promise.all([
      getCategories(),
      getProducts({ sort: 'popular', limit: 8 }),
      getProducts({ sort: 'newest', limit: 4 }),
      getPromos(),
    ]);
    return { categories, bestSellers: bestSellers.data, newest: newest.data, promos };
  } catch (error) {
    // Lúc chạy: ném lỗi để Next.js GIỮ trang tốt đang cache và thử lại lần sau.
    // Nếu trả về rỗng, ISR sẽ cache luôn trang trống (vd. web lên trước API vài giây khi khởi động).
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw error;
    // Lúc build (CI không có API): cho build qua với trang rỗng; API gọi /api/revalidate khi khởi động để làm đầy lại
    return {
      categories: [] as CategoryDto[],
      bestSellers: [] as ProductSummaryDto[],
      newest: [] as ProductSummaryDto[],
      promos: [] as PromoDto[],
    };
  }
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-primary transition-colors duration-150 hover:text-foreground">
          Xem tất cả <ArrowRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const { categories, bestSellers, newest, promos } = await load();
  const topPromo = promos[0];

  return (
    <>
      {/* Hero: chữ lớn căn giữa trên nền ảnh món tự chuyển */}
      <HeroSlider slides={HERO_SLIDES}>
        {topPromo && (
          <Link
            href="#uu-dai"
            className="inline-flex animate-rise-in items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-xs text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
          >
            <span className="rounded-full bg-highlight px-2 py-0.5 font-semibold text-highlight-foreground">Ưu đãi</span>
            Mã <span className="font-mono text-foreground">{topPromo.code}</span> · {promoHeadline(topPromo).toLowerCase()}
            <ArrowRight className="size-3" />
          </Link>
        )}
        <h1 className="text-gradient mx-auto mt-6 max-w-[720px] animate-rise-in text-3xl font-bold [animation-delay:60ms] sm:text-5xl">
          Đói là có, khát là giao.
        </h1>
        <p className="mx-auto mt-4 max-w-[480px] animate-rise-in text-base text-[#d2d7de] [animation-delay:120ms]">
          Cơm, phở, bánh mì, cà phê và trà sữa — đặt trong 3 bước, theo dõi đơn theo thời gian thực.
        </p>
        <div className="mt-8 flex animate-rise-in justify-center gap-3 [animation-delay:180ms]">
          <Button asChild size="lg">
            <Link href="/thuc-don">
              Đặt món ngay <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/thuc-don/tra-sua">Xem đồ uống</Link>
          </Button>
        </div>
        <ul className="mx-auto mt-12 grid max-w-[640px] animate-rise-in grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-background/50 text-xs [animation-delay:240ms]">
          {[
            { icon: Clock, text: 'Giao trong 30 phút' },
            { icon: Bike, text: 'Freeship từ 200k' },
            { icon: Store, text: 'Nhận tại quầy' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex flex-col items-center gap-2 px-2 py-3 text-[#d2d7de] sm:flex-row sm:justify-center">
              <Icon className="size-4 text-foreground" />
              {text}
            </li>
          ))}
        </ul>
      </HeroSlider>

      <Container>
        <PromoHero promos={promos} />

        {categories.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">Danh mục</h2>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {categories.map((c, i) => (
                <li key={c.id} className="animate-rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <Link
                    href={`/thuc-don/${c.slug}`}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted-foreground transition-[border-color,color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground"
                  >
                    <span className="text-3xl transition-transform duration-200 ease-spring group-hover:scale-110" aria-hidden>
                      {CATEGORY_EMOJI[c.slug] ?? '🍴'}
                    </span>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {bestSellers.length > 0 && (
          <Section title="Bán chạy nhất" href="/thuc-don?sort=popular">
            <ProductGrid products={bestSellers} />
          </Section>
        )}

        {newest.length > 0 && (
          <Section title="Món mới" href="/thuc-don?sort=newest">
            <ProductGrid products={newest} />
          </Section>
        )}
      </Container>
    </>
  );
}
