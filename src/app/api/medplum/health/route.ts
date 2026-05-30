import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth/rbac';
import { getMedplumClient } from '@/lib/medplum/client';
import { getMedplumConfig } from '@/lib/medplum/config';

export const dynamic = 'force-dynamic';

/**
 * Admin-only connectivity probe for the self-hosted Medplum server.
 * Authenticates the server client and runs a cheap search to confirm the
 * API is reachable. Never exposed publicly — it would leak server state.
 */
export async function GET() {
  const staff = await getStaffUser(['superadmin', 'admin']);
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const { baseUrl } = getMedplumConfig();
    const medplum = await getMedplumClient();
    await medplum.searchResources('Patient', { _count: '0' });

    return NextResponse.json({
      ok: true,
      baseUrl,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 502 },
    );
  }
}
