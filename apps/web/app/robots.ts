import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Trang riêng tư hoặc theo phiên — không có giá trị tìm kiếm
      disallow: ['/admin', '/tai-khoan', '/gio-hang', '/thanh-toan', '/don-hang', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
