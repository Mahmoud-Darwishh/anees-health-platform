import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Image optimization for WebP and AVIF formats
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 85],
  },
  // Enable compression
  compress: true,
  // Optimize on-demand entries
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
    sourceMap: false,
  },
  async headers() {
    return [
      // Cache images aggressively (1 year)
      {
        source: '/assets/img/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache CSS with medium TTL (1 week)
      {
        source: '/assets/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800',
          },
        ],
      },
      // Cache fonts with long TTL (1 year)
      {
        source: '/assets/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // CSP and security headers
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com https://chatling.ai https://*.chatling.ai https://cdn.jsdelivr.net https://www.clarity.ms https://scripts.clarity.ms https://connect.facebook.net https://payments.kashier.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://payments.kashier.io https://chatling.ai https://*.chatling.ai",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.vercel-scripts.com https://vercel.live https://chatling.ai https://*.chatling.ai https://www.clarity.ms https://y.clarity.ms https://e.clarity.ms https://connect.facebook.net https://payments.kashier.io https://api.ipify.org https://www.cloudflare.com",
              "frame-src 'self' https://chatling.ai https://*.chatling.ai https://payments.kashier.io",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
