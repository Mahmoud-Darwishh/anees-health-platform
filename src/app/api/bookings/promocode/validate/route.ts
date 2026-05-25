import { NextRequest, NextResponse } from 'next/server';
import { validatePromocode } from '@/lib/api/promocode';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';

interface ValidateRequest {
  code?: unknown;
  baseAmount?: unknown;
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  try {
    const ip = getClientIp(request);
    // Tight limit — this is a public preview endpoint
    const allowed = await checkRateLimit(`promo-validate:${ip}`, 20, 60_000);
    if (!allowed) return tooManyRequests(cors);

    const body = (await request.json()) as ValidateRequest;
    const code = typeof body.code === 'string' ? body.code : '';
    const baseAmount = Number(body.baseAmount);

    if (!code.trim()) {
      return NextResponse.json(
        { ok: false, error: 'invalid' },
        { status: 400, headers: cors },
      );
    }
    if (!Number.isFinite(baseAmount) || baseAmount <= 0 || baseAmount > 1_000_000) {
      return NextResponse.json(
        { ok: false, error: 'invalid' },
        { status: 400, headers: cors },
      );
    }

    const result = await validatePromocode(code, baseAmount);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 200, headers: cors },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        code: result.promocode.code,
        description: result.promocode.description,
        kind: result.promocode.kind,
        value: Number(result.promocode.value),
        baseAmount: result.baseAmountEgp,
        discount: result.discountEgp,
        finalAmount: result.finalAmountEgp,
        currency: 'EGP' as const,
      },
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error('[Promocode validate]', err);
    return NextResponse.json(
      { ok: false, error: 'invalid' },
      { status: 500, headers: cors },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  });
}
