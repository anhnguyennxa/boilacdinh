import type { Metadata } from 'next';
import { MenuView, type MenuSearchParams } from '@/components/product/menu-view';

export const metadata: Metadata = {
  title: 'Thực đơn',
  description: 'Thực đơn đầy đủ: cơm, phở, bánh mì, món ăn vặt, cà phê, trà sữa và nước ép — đặt món giao tận nơi hoặc nhận tại quầy.',
};

export default function MenuPage({ searchParams }: { searchParams: MenuSearchParams }) {
  return <MenuView searchParams={searchParams} />;
}
