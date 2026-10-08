import type { Metadata } from 'next';
import { MenuView, type MenuSearchParams } from '@/components/product/menu-view';
import { getCategories } from '@/lib/api';

type Params = Promise<{ 'danh-muc': string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const slug = (await params)['danh-muc'];
  const category = (await getCategories().catch(() => [])).find((c) => c.slug === slug);
  return { title: category?.name ?? 'Thực đơn' };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: MenuSearchParams }) {
  return <MenuView category={(await params)['danh-muc']} searchParams={searchParams} />;
}
