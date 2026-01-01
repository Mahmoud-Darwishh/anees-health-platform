/**
 * Robots.txt configuration
 * Route: /robots.txt
 * 
 * Configures search engine and AI crawler access
 * - Allows all legitimate bots (Google, Bing, AI crawlers)
 * - Sitemap references for discovery
 */

import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = config.api.baseUrl;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/booking/confirmation',
          '/_next/',
          '/admin/',
          '/dashboard/',
        ],
      },
      // Explicitly allow AI crawlers for GEO (Generative Engine Optimization)
      {
        userAgent: 'GPTBot', // OpenAI
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'ChatGPT-User', // OpenAI ChatGPT
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'CCBot', // Common Crawl (used by many AI models)
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'anthropic-ai', // Claude
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'PerplexityBot', // Perplexity AI
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'Google-Extended', // Google AI (Bard/Gemini)
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'cohere-ai', // Cohere AI
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'Bytespider', // ByteDance (TikTok)
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
      {
        userAgent: 'Diffbot', // Diffbot AI
        allow: '/',
        disallow: ['/api/', '/booking/', '/admin/', '/dashboard/'],
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/en/sitemap.xml`,
      `${baseUrl}/ar/sitemap.xml`,
    ],
  };
}
