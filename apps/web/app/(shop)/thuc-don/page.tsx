import type { Metadata } from 'next';
import { MenuView, type MenuSearchParams } from '@/components/product/menu-view';

export const metadata: Metadata = { title: 'Thực đơn' };

export default function MenuPage({ searchParams }: { searchParams: MenuSearchParams }) {
  return <MenuView searchParams={searchParams} />;
}
