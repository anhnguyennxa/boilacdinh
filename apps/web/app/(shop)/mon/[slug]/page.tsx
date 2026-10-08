import { ChevronRight, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PriceTag } from '@/components/product/price-tag';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductImage } from '@/components/product/product-image';
import { ProductOptionsForm } from '@/components/product/product-options-form';
import { Badge } from '@/components/ui/misc';
import { getProduct, getProducts, getRelated, NotFoundError } from '@/lib/api';

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const { data } = await getProducts({ limit: 100 });
    return data.map((p) => ({ slug: p.slug }));
  } catch {
    return []; // API chưa chạy lúc build → render theo yêu cầu rồi cache (ISR)
  }
}

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await load((await params).slug);
  return { title: product.name, description: product.description ?? undefined };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  // Không nuốt lỗi: ISR giữ trang tốt đang cache thay vì lưu trang thiếu "món liên quan"
  const [product, related] = await Promise.all([load(slug), getRelated(slug)]);

  return (
    <div className="pb-24 pt-4 md:pb-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/thuc-don" className="transition-colors duration-150 hover:text-foreground">Thực đơn</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/thuc-don/${product.category.slug}`} className="transition-colors duration-150 hover:text-foreground">{product.category.name}</Link>
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <ProductImage
          name={product.name}
          imageUrl={product.images[0]?.url ?? product.imageUrl}
          categorySlug={product.category.slug}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-square rounded-2xl border border-border md:sticky md:top-20"
          emojiClassName="text-[9rem]"
        />

        <div>
          <div className="flex flex-wrap gap-2">
            {!product.isAvailable && <Badge tone="danger">Hết món</Badge>}
            {product.isFeatured && <Badge tone="primary">Nổi bật</Badge>}
            <Badge tone={product.category.type === 'DRINK' ? 'secondary' : 'neutral'}>{product.category.name}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-current" />
            <strong className="text-foreground">{product.ratingAvg.toFixed(1)}</strong> · Đã bán {product.soldCount}
          </p>
          <PriceTag amount={product.basePrice} className="mt-4 block text-xl" />
          {product.description && <p className="mt-4 leading-relaxed text-muted-foreground">{product.description}</p>}

          <hr className="my-6 border-border" />
          <ProductOptionsForm product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">Có thể bạn cũng thích</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
