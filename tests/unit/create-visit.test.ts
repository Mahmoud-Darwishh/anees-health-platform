import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for the visit-creation service (`src/lib/visits/create-visit.ts`).
 * Prisma is fully mocked — no DB. `$transaction` runs its callback with the same
 * mock object as the tx client, so we can assert on the exact rows each function
 * writes (visit + initial ledger transition + audit, series generation, reschedule).
 */

vi.mock('@/lib/db/prisma', () => {
  const prisma = {
    service: { findFirst: vi.fn() },
    visit: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    visitStateTransition: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    carePlan: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { createVisit, createVisitSeries, rescheduleVisit } from '@/lib/visits/create-visit';
import { prisma } from '@/lib/db/prisma';

const p = prisma as unknown as {
  service: { findFirst: ReturnType<typeof vi.fn> };
  visit: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
  visitStateTransition: { create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  carePlan: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Run the transaction callback with the mock client itself as the tx.
  p.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  p.service.findFirst.mockResolvedValue({ id: 'svc1', listPriceEgp: 300, defaultProviderPayoutEgp: 180 });
  p.visit.create.mockImplementation(({ data }: { data: { code: string } }) =>
    Promise.resolve({ id: `v-${data.code}`, code: data.code }),
  );
  p.visitStateTransition.create.mockResolvedValue({});
  p.auditLog.create.mockResolvedValue({});
});

describe('createVisit', () => {
  it('creates a scheduled visit, an initial null→scheduled ledger row, and an audit row', async () => {
    const result = await createVisit({
      patientId: 'p1',
      serviceId: 'svc1',
      scheduledDate: new Date('2026-07-10'),
      scheduledTime: '09:00',
      visitType: 'in_home',
      tenantId: 'platform',
      bookedBy: 'staff_s1',
      discountEgp: 50,
    });

    expect(result.code).toMatch(/^VST_/);

    const visitData = p.visit.create.mock.calls[0][0].data;
    expect(visitData.status).toBe('scheduled');
    expect(visitData.state).toBe('scheduled');
    expect(visitData.servicePriceEgp).toBe(300);
    expect(visitData.discountEgp).toBe(50);
    expect(visitData.netPriceEgp).toBe(250); // 300 - 50
    expect(visitData.providerPayoutEgp).toBe(180);
    expect(visitData.tenantId).toBe('platform');

    const ledger = p.visitStateTransition.create.mock.calls[0][0].data;
    expect(ledger.fromState).toBeNull();
    expect(ledger.toState).toBe('scheduled');
    expect(ledger.actorSystem).toBe(false); // staff_ actor

    expect(p.auditLog.create).toHaveBeenCalledTimes(1);
    expect(p.auditLog.create.mock.calls[0][0].data.action).toBe('create');
  });

  it('flags a system actor on the ledger row and clamps net price at zero', async () => {
    await createVisit({
      patientId: 'p1',
      serviceId: 'svc1',
      scheduledDate: new Date('2026-07-10'),
      visitType: 'in_home',
      tenantId: 'platform',
      bookedBy: 'system:booking',
      discountEgp: 500, // exceeds price → net must clamp to 0, never negative
    });

    expect(p.visit.create.mock.calls[0][0].data.netPriceEgp).toBe(0);
    expect(p.visitStateTransition.create.mock.calls[0][0].data.actorSystem).toBe(true);
  });

  it('rejects an inactive / unknown service', async () => {
    p.service.findFirst.mockResolvedValue(null);
    await expect(
      createVisit({
        patientId: 'p1',
        serviceId: 'nope',
        scheduledDate: new Date('2026-07-10'),
        visitType: 'in_home',
        tenantId: 'platform',
        bookedBy: 'staff_s1',
      }),
    ).rejects.toThrow(/not available/i);
  });
});

describe('createVisitSeries', () => {
  it('opens a care plan and generates every session spaced by the cadence', async () => {
    p.carePlan.create.mockResolvedValue({ id: 'cp1' });

    const first = new Date('2026-07-10T00:00:00.000Z');
    const { carePlanId, visits } = await createVisitSeries({
      patientId: 'p1',
      serviceId: 'svc1',
      firstDate: first,
      sessionCount: 3,
      cadenceDays: 7,
      visitType: 'in_home',
      tenantId: 'platform',
      bookedBy: 'staff_s1',
      carePlan: { planName: 'Physio programme', totalPriceEgp: 900 },
    });

    expect(carePlanId).toBe('cp1');
    expect(visits).toHaveLength(3);
    expect(p.visit.create).toHaveBeenCalledTimes(3);

    // Care plan spans first → last session.
    const planData = p.carePlan.create.mock.calls[0][0].data;
    expect(planData.totalVisitsPlanned).toBe(3);
    expect(new Date(planData.endDate).getTime()).toBe(first.getTime() + 2 * 7 * 86_400_000);

    // Each visit is linked to the plan and spaced by the cadence.
    const dates = p.visit.create.mock.calls.map((c) => new Date(c[0].data.scheduledDate).getTime());
    expect(dates[1] - dates[0]).toBe(7 * 86_400_000);
    expect(dates[2] - dates[1]).toBe(7 * 86_400_000);
    for (const call of p.visit.create.mock.calls) {
      expect(call[0].data.carePlanId).toBe('cp1');
    }
  });

  it('clamps session count to 60 and cadence to a minimum of 1 day', async () => {
    const first = new Date('2026-07-10T00:00:00.000Z');
    const { visits } = await createVisitSeries({
      patientId: 'p1',
      serviceId: 'svc1',
      firstDate: first,
      sessionCount: 500, // → clamped to 60
      cadenceDays: 0, // → clamped to 1
      visitType: 'in_home',
      tenantId: 'platform',
      bookedBy: 'staff_s1',
    });

    expect(visits).toHaveLength(60);
    const dates = p.visit.create.mock.calls.map((c) => new Date(c[0].data.scheduledDate).getTime());
    expect(dates[1] - dates[0]).toBe(1 * 86_400_000); // cadence floored at 1 day
  });
});

describe('rescheduleVisit', () => {
  it('moves an open visit to a new date/time and audits it', async () => {
    p.visit.findFirst.mockResolvedValue({
      id: 'v1',
      code: 'VST_ABC',
      status: 'scheduled',
      scheduledDate: new Date('2026-07-10'),
      scheduledTime: '09:00',
    });

    const result = await rescheduleVisit({
      visitId: 'v1',
      tenantId: 'platform',
      newDate: new Date('2026-07-12'),
      newTime: '11:00',
      changedBy: 'staff_s1',
    });

    expect(result).toEqual({
      id: 'v1',
      code: 'VST_ABC',
      previous: { date: new Date('2026-07-10'), time: '09:00' },
    });

    const updateData = p.visit.update.mock.calls[0][0].data;
    expect(updateData.scheduledTime).toBe('11:00');
    expect(updateData.status).toBe('scheduled');
    expect(new Date(updateData.scheduledDate).getTime()).toBe(new Date('2026-07-12').getTime());
    expect(p.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('refuses to reschedule a closed (completed) visit', async () => {
    p.visit.findFirst.mockResolvedValue({
      id: 'v1',
      code: 'VST_ABC',
      status: 'completed',
      scheduledDate: new Date('2026-07-10'),
      scheduledTime: '09:00',
    });

    await expect(
      rescheduleVisit({ visitId: 'v1', tenantId: 'platform', newDate: new Date('2026-07-12'), changedBy: 'staff_s1' }),
    ).rejects.toThrow(/already closed/i);
    expect(p.visit.update).not.toHaveBeenCalled();
  });

  it('throws when the visit does not exist in the tenant', async () => {
    p.visit.findFirst.mockResolvedValue(null);
    await expect(
      rescheduleVisit({ visitId: 'ghost', tenantId: 'platform', newDate: new Date('2026-07-12'), changedBy: 'staff_s1' }),
    ).rejects.toThrow(/not found/i);
  });
});
