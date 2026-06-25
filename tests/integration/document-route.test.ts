import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Route-level integration test for the authenticated document-streaming endpoint.
 * It exercises the real GET handler with its data dependencies mocked (no DB, no
 * Medplum, no R2), validating the fail-closed security gate: only a `clean`,
 * authorized document is served; never-scanned (`pending`) and `infected` files
 * are blocked. This is the harness pattern for route handlers — extend it for the
 * payment webhook, visit transitions, etc.
 */

vi.mock('@/lib/auth/rbac', () => ({
  CLINICAL_READ_ROLES: ['doctor', 'nurse'],
  getSessionUser: vi.fn(),
  isCaseScopedClinicalRole: vi.fn(),
  staffHasRole: vi.fn(),
}));
vi.mock('@/lib/medplum/documents', () => ({ getPatientDocumentBinary: vi.fn() }));
vi.mock('@/lib/storage/r2-medical', () => ({ getPrivateMedicalObject: vi.fn() }));
vi.mock('@/lib/medplum/practitioners', () => ({ ensureCachedMedplumPractitionerForStaff: vi.fn() }));
vi.mock('@/lib/medplum/care-teams', () => ({ listCareTeamPatientIdsForPractitioner: vi.fn() }));
vi.mock('@/lib/portal/patient-record', () => ({ getOwnPatientRecord: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { auditLog: { create: vi.fn().mockResolvedValue({}) } } }));

import { GET } from '@/app/api/ehr/documents/[documentId]/route';
import { getSessionUser, staffHasRole, isCaseScopedClinicalRole } from '@/lib/auth/rbac';
import { getPatientDocumentBinary } from '@/lib/medplum/documents';
import { getPrivateMedicalObject } from '@/lib/storage/r2-medical';

const STAFF = { id: 'u1', role: 'staff', staffId: 's1', staffRole: 'doctor', name: 'Dr', email: 'd@x.com' };

const req = (id = 'doc1') => new Request(`http://localhost/api/ehr/documents/${id}`);
const ctx = (id = 'doc1') => ({ params: Promise.resolve({ documentId: id }) });

const payload = (malwareStatus: string) => ({
  document: {
    subject: { reference: 'Patient/p1' },
    content: [{ attachment: { title: 'lab.pdf', contentType: 'application/pdf' } }],
  },
  malwareStatus,
  r2ObjectKey: 'ehr/2026/06/k',
  checksumSha256: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(staffHasRole).mockReturnValue(true);
  vi.mocked(isCaseScopedClinicalRole).mockReturnValue(false);
});

describe('GET /api/ehr/documents/[documentId] — fail-closed gate', () => {
  it('401 when unauthenticated', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(401);
  });

  it('403 when the staff member lacks a clinical read role', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(STAFF as never);
    vi.mocked(staffHasRole).mockReturnValue(false);
    vi.mocked(getPatientDocumentBinary).mockResolvedValue(payload('clean') as never);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(403);
  });

  it('409 for a never-scanned (pending) document — fail closed', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(STAFF as never);
    vi.mocked(getPatientDocumentBinary).mockResolvedValue(payload('pending') as never);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(409);
  });

  it('423 for an infected document', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(STAFF as never);
    vi.mocked(getPatientDocumentBinary).mockResolvedValue(payload('infected') as never);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(423);
  });

  it('200 for a clean, authorized document — no regression', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(STAFF as never);
    vi.mocked(getPatientDocumentBinary).mockResolvedValue(payload('clean') as never);
    vi.mocked(getPrivateMedicalObject).mockResolvedValue({
      body: Buffer.from('hello'),
      contentType: 'application/pdf',
    } as never);
    const res = await GET(req(), ctx());
    expect(res.status).toBe(200);
  });
});
