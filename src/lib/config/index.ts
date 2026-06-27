// Configuration for API endpoints and environment variables
// This file will be expanded as new features are added
import { SAME_AS_PROFILES } from './social-links';

/**
 * Resolve the canonical site origin (no trailing slash).
 *
 * Fail-fast in production: a missing/non-https `NEXT_PUBLIC_SITE_URL` would
 * otherwise silently fall back to `http://localhost:3000`, poisoning every
 * canonical URL, hreflang, sitemap entry, and JSON-LD `@id` — which would
 * drop the whole site from the index. This is a hard guard for the
 * Hostinger → OVH migration. Dev still falls back to localhost.
 */
function resolveBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === 'production') {
    if (!url || !url.startsWith('https://')) {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL must be set to an https:// origin in production ' +
          '(it feeds every canonical, hreflang, sitemap URL, and JSON-LD @id).'
      );
    }
    return url.replace(/\/$/, '');
  }
  return (url || 'http://localhost:3000').replace(/\/$/, '');
}

export const config = {
  // API Configuration
  api: {
    baseUrl: resolveBaseUrl(),
    timeout: 30000,
  },

  // Localization
  locales: {
    default: 'en',
    supported: ['en', 'ar'],
  },

  // Future features configuration
  features: {
    videoCall: {
      enabled: false, // To be enabled when implementing video call feature
      provider: 'webrtc',
    },
    chat: {
      enabled: false, // To be enabled when implementing chat feature
      realtime: true,
    },
    booking: {
      enabled: false, // To be enabled when implementing booking feature
      advanceBookingDays: 30,
    },
  },

  // Pagination
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100,
  },

  // Brand entity references (sameAs) used for SEO/GEO + Knowledge Graph consistency
  brand: {
    sameAs: SAME_AS_PROFILES,
  },
};

export default config;
