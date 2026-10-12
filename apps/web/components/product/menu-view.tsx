import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EmptyState } from '@/components/ui/misc';
import { getCategories, getProducts } from '@/lib/api';
import { CategoryTabs } from './category-tabs';
import { MenuFilters } from './menu-filters';
import { Pagination, ProductGrid } from './product-grid';

export type MenuSearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export async function MenuView({ category, searchParams }: { category?: string; searchParams: MenuSearchParams }) {
  const sp = await searchParams;
  const page = num(one(sp.page)) ?? 1;
  const sort = one(sp.sort);
  const minPrice = num(one(sp.minPrice));
  const maxPrice = num(one(sp.maxPrice));

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ category, sort, minPrice, maxPrice, page, limit: 12 }),
  ]);
  const current = categories.find((c) => c.slug === category);
  if (category && !current) notFound();

  const keep = new URLSearchParams();
  if (sort) keep.set('sort', sort);
  if (minPrice != null) keep.set('minPrice', String(minPrice));
  if (maxPrice != null) keep.set('maxPrice', String(maxPrice));
  const base = `/thuc-don${category ? `/${category}` : ''}`;
  const hrefFor = (p: number) => {
    const q = new URLSearchParams(keep);
    if (p > 1) q.set('page', String(p));
    return `${base}${q.size ? `?${q}` : ''}`;
  };

  return (
    <div className="pt-6">
      <h1 className="text-2xl font-semibold">{current?.name ?? 'Thực đơn'}</h1>
      <div className="sticky top-14 z-[1] -mx-4 mt-4 space-y-3 border-b border-border bg-background px-4 py-3">
        <CategoryTabs categories={categories} active={category} query={keep.toString()} />
        <Suspense>
          <MenuFilters total={products.meta.total} />
        </Suspense>
      </div>
      <div className="mt-4 space-y-8">
        <h2 className="sr-only">Danh sách món</h2>
        {products.data.length ? (
          <ProductGrid products={products.data} priorityCount={2} />
        ) : (
          <EmptyState emoji="🥢" title="Chưa có món phù hợp" description="Thử đổi khoảng giá hoặc chọn danh mục khác." />
        )}
        <Pagination page={page} limit={products.meta.limit} total={products.meta.total} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
