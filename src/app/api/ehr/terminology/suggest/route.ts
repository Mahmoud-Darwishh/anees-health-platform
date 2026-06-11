import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { suggestMedplumTerminology, type MedplumTerminologyDomain } from '@/lib/medplum/terminology';
import { searchIcd10Problems } from '@/features/ehr/catalogs/icd10-problems';

const querySchema = z.object({
  domain: z.enum([
    'problem',
    'allergen',
    'allergy-reaction',
    'allergy-note',
    'medication',
    'lab-order',
    'diagnostic-report',
  ]),
  q: z.string().trim().optional().default(''),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

export async function GET(request: Request) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  try {
    const user = await getSessionUser();
    if (!isStaff(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      domain: url.searchParams.get('domain'),
      q: url.searchParams.get('q') ?? '',
      limit: url.searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters.' }, { status: 400, headers: cors });
    }

    const limit = parsed.data.limit ?? 10;

    // Problems are served from the app-owned ICD-10 catalog, not Medplum's
    // terminology server (its ICD-10 CodeSystem is empty and write-protected).
    if (parsed.data.domain === 'problem') {
      return NextResponse.json({ terms: await searchIcd10Problems(parsed.data.q, limit) }, { headers: cors });
    }

    const terms = await suggestMedplumTerminology(
      parsed.data.domain as MedplumTerminologyDomain,
      parsed.data.q,
      limit,
    );

    return NextResponse.json({ terms }, { headers: cors });
  } catch {
    return NextResponse.json({ error: 'Failed to load terminology suggestions.' }, { status: 500, headers: cors });
  }
}

export function OPTIONS(request: Request) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
