/**
 * Robots.txt configuration
 * Route: /robots.txt
 *
 * Configures search engine and AI crawler access.
 * - Allows all legitimate bots (Google, Bing, AI crawlers)
 * - Locale-aware disallow rules (public routes are prefixed /en, /ar)
 * - Sitemap reference for discovery
 *
 * NOTE: robots.txt is advisory only. PHI/private surfaces (admin, clinician,
 * portal, api) are auth-gated in code — never rely on robots.txt for security.
 */

import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

// Shared disallow list. Public routes are locale-prefixed (/en/..., /ar/...), so
// funnel/private paths use a wildcard prefix ("/" + "*" + "/booking/") to match
// both locales as well as the bare path. (A bare "/booking/" would NOT match
// "/en/booking".)
const DISALLOW = [
  '/api/',
  '/_next/',
  '/admin/',
  '/dashboard/',
  '/*/booking/',
  '/*/payment/',
  '/*/portal/',
  '/booking/confirmation',
];

/**
 * AI / answer-engine crawlers we explicitly welcome for AEO/GEO. Tokens kept
 * current as of 2026 (search-index + live-fetch + training crawlers). All
 * honor robots.txt per their operator docs.
 */
const AI_CRAWLERS = [
  'GPTBot', // OpenAI training
  'ChatGPT-User', // OpenAI live user fetch
  'OAI-SearchBot', // OpenAI SearchGPT index
  'CCBot', // Common Crawl (feeds many LLMs)
  'anthropic-ai', // Anthropic (legacy)
  'ClaudeBot', // Anthropic training crawler
  'Claude-User', // Anthropic live user fetch
  'Claude-SearchBot', // Anthropic search index
  'Claude-Web', // Anthropic on-demand fetcher
  'PerplexityBot', // Perplexity index
  'Perplexity-User', // Perplexity live user fetch
  'Google-Extended', // Google AI (Gemini/Vertex) training opt-in token
  'Google-CloudVertexBot', // Vertex AI Agent Builder fetch
  'cohere-ai', // Cohere
  'Bytespider', // ByteDance / TikTok
  'Diffbot', // Diffbot
  'Applebot-Extended', // Apple Intelligence
  'Meta-ExternalAgent', // Meta AI training
  'Meta-ExternalFetcher', // Meta AI on-demand fetch
  'MistralAI-User', // Mistral Le Chat
  'DuckAssistBot', // DuckDuckGo AI assist
  'Amazonbot', // Amazon (Alexa / Rufus)
  'YouBot', // You.com AI search
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = config.api.baseUrl;

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    // Single canonical sitemap. The previous sitemap-doctors.xml entry returned
    // 404 (a standalone sitemap-doctors route file is not recognized by Next),
    // and sitemap.ts already lists every doctor URL, so it was removed.
    sitemap: baseUrl + '/sitemap.xml',
    host: baseUrl,
  };
}
