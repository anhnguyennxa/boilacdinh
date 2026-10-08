import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // Chỉ bật khi build Docker: standalone tạo symlink, Windows chặn nếu chưa bật Developer Mode
  output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined,
  // Trình duyệt gọi /api/v1/* cùng origin → cookie refresh token httpOnly nằm trên domain frontend
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${API_URL}/api/v1/:path*` },
      // Ảnh món tải lên server (khi không dùng Cloudinary) — cùng origin với web
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      // Ảnh nền hero (lib/hero-slides.ts)
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
