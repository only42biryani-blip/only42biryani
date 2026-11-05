/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // AVIF is usually 30-50% smaller than WebP for photos; browsers that can't use it get WebP.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    const cache = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }];
    return [
      { source: '/images/:path*', headers: cache },
      { source: '/icons/:path*', headers: cache },
    ];
  },
};

export default nextConfig;
