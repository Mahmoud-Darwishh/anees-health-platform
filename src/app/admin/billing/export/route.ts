import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { PAYMENT_CONFIRM_ROLES } from '@/features/admin/billing/types';

export const dynamic = 'force-dynamic';

/** RFC-4180 CSV cell: quote and escape embedded quotes. */
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Delivered-visits export (CSV) for MANUAL payout reconciliation. Per the launch
 * decision, clinician pay is not automated — this is the source list ops/finance
 * reconcile from: every delivered (checked-out / completed) visit, its amount,
 * and the clinician who delivered it. Tenant-scoped, staff-gated.
 */
export async function GET() {
  const user = await getStaffUser([...PAYMENT_CONFIRM_ROLES]);
  if (!user) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const tenantId = user.tenantId ?? 'platform';
  const visits = await prisma.visit.findMany({
    where: {
      tenantId,
      OR: [{ status: 'completed' }, { checkOutAt: { not: null } }],
    },
    orderBy: [{ checkOutAt: 'desc' }, { scheduledDate: 'desc' }],
    take: 5000,
    select: {
      code: true,
      status: true,
      scheduledDate: true,
      checkOutAt: true,
      servicePriceEgp: true,
      netPriceEgp: true,
      providerPayoutEgp: true,
      patient: { select: { code: true, fullName: true } },
      provider: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  });

  const header = [
    'Visit Code',
    'Delivered Date',
    'Patient Code',
    'Patient Name',
    'Clinician',
    'Service',
    'Status',
    'Service Price (EGP)',
    'Net Price (EGP)',
    'Provider Payout (EGP)',
  ];

  const rows = visits.map((v) =>
    [
      v.code,
      v.checkOutAt ? dateFmt.format(v.checkOutAt) : dateFmt.format(v.scheduledDate),
      v.patient?.code ?? '',
      v.patient?.fullName ?? '',
      v.provider?.fullName ?? '',
      v.service?.name ?? '',
      v.status,
      Number(v.servicePriceEgp).toFixed(2),
      Number(v.netPriceEgp).toFixed(2),
      Number(v.providerPayoutEgp).toFixed(2),
    ]
      .map(csvCell)
      .join(','),
  );

  const csv = [header.map(csvCell).join(','), ...rows].join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="delivered-visits-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
