import { NextResponse } from 'next/server';

/**
 * Public, unauthenticated, PHI-free liveness probe for external uptime monitors
 * (UptimeRobot / Better Stack / Cloudflare Health Checks).
 *
 * It confirms only that the Next.js process is up and serving requests — it
 * deliberately does NOT touch Postgres, Medplum, or any PHI, so it is safe to
 * expose publicly and cheap to poll frequently. A deep readiness check that
 * probes the database/Medplum stays behind auth at `/api/medplum/health`.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'anees-web' },
    { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
