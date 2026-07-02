import { NextRequest, NextResponse } from 'next/server';
import { runOpsWatchdog } from '@/lib/ops/watchdog';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { logger } from '@/lib/utils/app-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Internal ops watchdog endpoint. Poked by an external scheduler (cron) on a
 * fixed cadence. Detects operational drift (no-show risk, stuck visits,
 * unassigned backlog, stale payments, unacknowledged handoffs) and alerts the
 * dispatch desk. Never auto-mutates money-affecting state.
 *
 * Auth mirrors the document-scan job: an `x-ops-watchdog-key` header OR a
 * `Bearer ${CRON_SECRET}`. If neither secret is configured, the route refuses.
 */
function isAuthorized(request: NextRequest): boolean {
  const watchdogKey = process.env.OPS_WATCHDOG_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  const keys = [watchdogKey, cronSecret].filter((key): key is string => !!key);
  if (keys.length === 0) return false;

  const incoming =
    request.headers.get('x-ops-watchdog-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  return !!incoming && keys.includes(incoming);
}

async function handle(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`ops-watchdog:${ip}`, 12, 60_000);
  if (!allowed) {
    return tooManyRequests(cors);
  }

  const url = new URL(request.url);
  const tenantId = (url.searchParams.get('tenantId') || 'platform').trim() || 'platform';

  try {
    const report = await runOpsWatchdog(tenantId);
    logger.info('[ops-watchdog] sweep complete', {
      tenantId,
      totalFlagged: report.totalFlagged,
      notified: report.notified.delivered,
    });
    return NextResponse.json({ success: true, report }, { status: 200, headers: cors });
  } catch (error) {
    logger.error('[ops-watchdog] sweep failed', {
      tenantId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ success: false, message: 'Watchdog run failed' }, { status: 500, headers: cors });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Allow GET so simple cron pingers (that only issue GETs) can trigger it too.
export async function GET(request: NextRequest) {
  return handle(request);
}

export function OPTIONS(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, { status: 204, headers: cors });
}
