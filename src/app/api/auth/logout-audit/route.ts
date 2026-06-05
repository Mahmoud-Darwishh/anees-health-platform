import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = resolveCorsHeaders(request.headers.get('origin'));

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = resolveCorsHeaders(request.headers.get('origin'));
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`auth-logout-audit:${ip}`, 30, 60_000);

  if (!allowed) {
    return tooManyRequests(corsHeaders);
  }

  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    return NextResponse.json(
      { success: false, message: 'Not authenticated' },
      { status: 401, headers: corsHeaders },
    );
  }

  const isStaff = Boolean(sessionUser.staffId);
  const actorRole = isStaff ? 'staff' : 'patient';

  try {
    await prisma.auditLog.create({
      data: {
        tableName: isStaff ? 'staff' : 'users',
        recordId: sessionUser.id,
        action: 'logout',
        changedFields: {
          source: 'header',
        },
        changedBy: `${actorRole}_${sessionUser.id}`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to write logout audit event' },
      { status: 500, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { success: true },
    { status: 200, headers: corsHeaders },
  );
}
