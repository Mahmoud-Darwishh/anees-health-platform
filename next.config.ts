import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com https://chatling.ai https://cdn.jsdelivr.net https://www.clarity.ms https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.vercel-scripts.com https://vercel.live https://chatling.ai https://www.clarity.ms https://connect.facebook.net",
              "frame-src 'self' https://chatling.ai",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
