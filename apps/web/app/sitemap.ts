import type { ProductSummaryDto } from '@foodhub/shared';
import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

async function allProducts(): Promise<ProductSummaryDto[]> {
  const first = await getProducts({ limit: 100 });
  const pages = Math.ceil(first.meta.total / first.meta.limit);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => getProducts({ limit: 100, page: i + 2 })),
  );
  return [first, ...rest].flatMap((p) => p.data);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/thuc-don`, changeFrequency: 'daily', priority: 0.9 },
  ];
  try {
    const [categories, products] = await Promise.all([getCategories(), allProducts()]);
    return [
      ...pages,
      ...categories.map((c) => ({ url: `${SITE_URL}/thuc-don/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...products.map((p) => ({ url: `${SITE_URL}/mon/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ];
  } catch {
    // Lúc build không có API: trả bản tối thiểu, tự làm mới sau 1 giờ
    return pages;
  }
}
