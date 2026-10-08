import { ShopShell } from '@/components/layout/shop-shell';

/** Trang chủ: main tràn viền để hero ảnh phủ hết bề ngang; các khối khác tự dùng <Container>. */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell bleed>{children}</ShopShell>;
}
