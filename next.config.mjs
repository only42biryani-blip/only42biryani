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
    // Safe defaults: no guessing of file types, nobody can put our pages in a frame, only the origin is sent as the
    // referrer to other sites, and location is allowed only for our own pages (the order form's "use my location").
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
    ];
    return [
      { source: '/:path*', headers: security },
      { source: '/images/:path*', headers: cache },
      { source: '/icons/:path*', headers: cache },
    ];
  },
};

export default nextConfig;
