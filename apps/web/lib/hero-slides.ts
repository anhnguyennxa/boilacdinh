/**
 * Ảnh nền hero (Unsplash License — miễn phí, cho phép nhúng trực tiếp).
 * Thay bằng ảnh món thật của quán khi có: chỉ cần đổi `src` sang URL Cloudinary/S3
 * (nhớ thêm domain vào images.remotePatterns trong next.config.ts).
 */
export interface HeroSlide {
  src: string;
  alt: string;
  /** Tên món hiển thị ở chú thích, dẫn tới trang món */
  caption: string;
  href: string;
  /** Điểm neo của hiệu ứng zoom chậm, giúp mỗi ảnh chuyển động một hướng */
  focus: string;
}

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=70`;

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: unsplash('photo-1582878826629-29b7ad1cdc43'),
    alt: 'Tô phở bò với bánh phở, thịt bò và hành lá',
    caption: 'Phở bò tái nạm',
    href: '/mon/pho-bo-tai-nam',
    focus: '50% 40%',
  },
  {
    src: unsplash('photo-1715925717150-2a6d181d8846'),
    alt: 'Hai ổ bánh mì kẹp thịt, đồ chua và rau thơm',
    caption: 'Bánh mì thịt nướng',
    href: '/mon/banh-mi-thit-nuong',
    focus: '30% 50%',
  },
  {
    src: unsplash('photo-1461023058943-07fcbe16d735'),
    alt: 'Ly cà phê sữa đá',
    caption: 'Cà phê sữa đá',
    href: '/mon/ca-phe-sua-da',
    focus: '35% 60%',
  },
  {
    src: unsplash('photo-1766050587783-1c90751275dd'),
    alt: 'Đĩa cơm gà nướng với trứng ốp la',
    caption: 'Cơm gà xối mỡ',
    href: '/mon/com-ga-xoi-mo',
    focus: '60% 50%',
  },
  {
    src: unsplash('photo-1558857563-b371033873b8'),
    alt: 'Ly trà sữa trân châu đường đen',
    caption: 'Trà sữa trân châu đường đen',
    href: '/mon/tra-sua-tran-chau-duong-den',
    focus: '50% 70%',
  },
  {
    src: unsplash('photo-1641440615059-42c8ed3af8c8'),
    alt: 'Mâm cơm Việt với rau, thịt luộc và nước chấm',
    caption: 'Món chính mỗi ngày',
    href: '/thuc-don/mon-chinh',
    focus: '70% 40%',
  },
];
