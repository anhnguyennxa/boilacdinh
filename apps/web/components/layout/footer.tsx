import Link from 'next/link';
import { BrandLogo } from './brand-logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-background pb-24 md:pb-0">
      <div className="mx-auto grid max-w-container gap-8 px-4 py-12 text-sm sm:grid-cols-3">
        <div className="space-y-2">
          <BrandLogo size={40} withName nameClassName="text-base" />
          <p className="text-muted-foreground">Đồ ăn ngon, nước uống mát — giao tận nơi hoặc nhận tại quầy.</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Thực đơn</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link href="/thuc-don/mon-chinh" className="transition-colors duration-150 hover:text-foreground">Món chính</Link></li>
            <li><Link href="/thuc-don/ca-phe" className="transition-colors duration-150 hover:text-foreground">Cà phê</Link></li>
            <li><Link href="/thuc-don/tra-sua" className="transition-colors duration-150 hover:text-foreground">Trà sữa</Link></li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Liên hệ</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>Mở cửa 7:00 – 22:00 hằng ngày</li>
            <li>Miễn phí giao hàng cho đơn từ 200.000đ</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
