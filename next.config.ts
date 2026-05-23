import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from '@ducanh2912/next-pwa';
import { runtimeCaching } from '@ducanh2912/next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' && process.env.ENABLE_PWA_DEV !== 'true',
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  customWorkerSrc: 'worker',
  workboxOptions: {
    runtimeCaching,
    cleanupOutdatedCaches: true,
  },
  fallbacks: {
    document: '/~offline',
  },
});

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
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '1.1.0',
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com https://chatling.ai https://*.chatling.ai https://cdn.jsdelivr.net https://www.clarity.ms https://scripts.clarity.ms https://connect.facebook.net https://payments.kashier.io https://*.kashier.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://chatling.ai https://*.chatling.ai https://payments.kashier.io",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.vercel-scripts.com https://vercel.live https://chatling.ai https://*.chatling.ai https://*.clarity.ms https://connect.facebook.net https://api.ipify.org https://www.cloudflare.com https://api.kashier.io https://test-api.kashier.io https://payments.kashier.io",
              "frame-src 'self' https://chatling.ai https://*.chatling.ai https://payments.kashier.io https://*.kashier.io",
              "frame-ancestors 'none'",
              "form-action 'self' https://payments.kashier.io https://*.kashier.io",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // HSTS: force HTTPS for 2 years, include subdomains, preload-eligible
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Block MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Belt-and-braces clickjacking protection (also covered by CSP frame-ancestors)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Limit referrer leakage to cross-origin sites
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deny browser features the site does not use — locks down ambient APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=(), browsing-topics=()',
          },
          // Opt-in cross-origin isolation primitives — safe defaults
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
