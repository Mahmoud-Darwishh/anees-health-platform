/**
 * Strict CORS allow-list.
 * - Production: only the configured site URL is allowed
 * - Preview deployments: any *.vercel.app subdomain of this project
 * - Local dev: localhost / cloudflared / ngrok tunnels
 *
 * Endpoints that do NOT need cross-origin access at all should simply not
 * include any Access-Control-* headers. This helper is only for the few that
 * legitimately need to be callable from the browser (e.g. booking create).
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

// Hard-coded production domains. Add any additional public origins here.
const ALLOWED_ORIGINS = new Set<string>([
  'https://aneeshealth.com',
  'https://www.aneeshealth.com',
]);

if (SITE_URL) ALLOWED_ORIGINS.add(SITE_URL);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;

  // Vercel preview deployments — any subdomain of vercel.app
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  // Local development on standard ports
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;

  // Cloudflared / ngrok tunnels for local Kashier testing
  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.ngrok\.io$/i.test(origin)) return true;

  return false;
}

/**
 * Returns the CORS headers to include in the response if (and only if) the
 * request's Origin is on the allow-list. For disallowed origins it returns an
 * empty object — the browser will block the response.
 */
export function resolveCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin)) {
    return { Vary: 'Origin' };
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  };
}
