import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'spdkgrsshwgqpvrezpdf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // サムネイル用の小さいサイズを追加して帯域を節約
    imageSizes: [48, 96, 200, 384],
    // デバイスサイズの最適化
    deviceSizes: [640, 750, 828, 1080, 1200],
    // 画像キャッシュの有効期間を延長（1週間）
    minimumCacheTTL: 604800,
    // WebP形式を優先して軽量化
    formats: ['image/webp'],
  },
};

export default nextConfig;
