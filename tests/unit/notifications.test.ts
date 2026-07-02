import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for the per-user notification seam (`src/lib/notifications/index.ts`).
 * Prisma, the push transport, the subscription store, Wapilot, and the logger are
 * all mocked — no DB, no network. We assert the pure resolver + delivery logic:
 * target→user resolution, dead-endpoint (404/410) pruning, best-effort semantics
 * (never throws), WhatsApp gating, and role fan-out.
 */

vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findFirst: vi.fn(), findMany: vi.fn() } },
}));
vi.mock('@/lib/utils/app-logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/auth/wapilot', () => ({
  isWapilotConfigured: vi.fn(),
  normalizeWhatsAppChatId: vi.fn(),
  maskWhatsAppChatId: vi.fn(() => 'masked'),
  sendWapilotTextMessage: vi.fn(),
}));
vi.mock('@/lib/pwa/subscription-store', () => ({
  listSubscriptionsForUser: vi.fn(),
  removeSubscription: vi.fn(),
}));
vi.mock('@/lib/pwa/push', () => ({ sendPushToSubscription: vi.fn() }));

import { pushToUser, notify, sendWhatsAppToPhone, notifyStaffByRoles } from '@/lib/notifications';
import { prisma } from '@/lib/db/prisma';
import { isWapilotConfigured, normalizeWhatsAppChatId, sendWapilotTextMessage } from '@/lib/auth/wapilot';
import { listSubscriptionsForUser, removeSubscription } from '@/lib/pwa/subscription-store';
import { sendPushToSubscription } from '@/lib/pwa/push';

const user = prisma.user as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: 'a', auth: 'b' } });
const httpError = (statusCode: number) => Object.assign(new Error('push failed'), { statusCode });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pushToUser', () => {
  it('delivers to every device and prunes endpoints that return 410 Gone', async () => {
    vi.mocked(listSubscriptionsForUser).mockResolvedValue([sub('e1'), sub('e2')] as never);
    vi.mocked(sendPushToSubscription)
      .mockResolvedValueOnce(undefined as never)
      .mockRejectedValueOnce(httpError(410));

    const result = await pushToUser('u1', { title: 't', body: 'b', url: '/' });

    expect(result).toEqual({ attempted: 2, delivered: 1, pruned: 1 });
    expect(removeSubscription).toHaveBeenCalledWith('e2');
  });

  it('keeps a live-but-failing endpoint (non 404/410) without pruning', async () => {
    vi.mocked(listSubscriptionsForUser).mockResolvedValue([sub('e1')] as never);
    vi.mocked(sendPushToSubscription).mockRejectedValueOnce(httpError(500));

    const result = await pushToUser('u1', { title: 't', body: 'b', url: '/' });

    expect(result).toEqual({ attempted: 1, delivered: 0, pruned: 0 });
    expect(removeSubscription).not.toHaveBeenCalled();
  });

  it('returns zeros (never throws) when the subscription store fails to load', async () => {
    vi.mocked(listSubscriptionsForUser).mockRejectedValue(new Error('store down'));

    const result = await pushToUser('u1', { title: 't', body: 'b', url: '/' });

    expect(result).toEqual({ attempted: 0, delivered: 0, pruned: 0 });
  });
});

describe('notify', () => {
  it('resolves a staffId to its owning user and pushes to their devices', async () => {
    user.findFirst.mockResolvedValue({ id: 'u1' });
    vi.mocked(listSubscriptionsForUser).mockResolvedValue([sub('e1')] as never);
    vi.mocked(sendPushToSubscription).mockResolvedValue(undefined as never);

    const result = await notify({ staffId: 's1' }, { title: 'Assigned', body: 'Visit VST_1' });

    expect(user.findFirst).toHaveBeenCalledWith({ where: { staffId: 's1' }, select: { id: true } });
    expect(result.push).toEqual({ attempted: 1, delivered: 1, pruned: 0 });
  });

  it('no-ops the push when the target resolves to no user', async () => {
    user.findFirst.mockResolvedValue(null);

    const result = await notify({ patientId: 'p1' }, { title: 't', body: 'b' });

    expect(result.push).toEqual({ attempted: 0, delivered: 0, pruned: 0 });
    expect(listSubscriptionsForUser).not.toHaveBeenCalled();
  });

  it('never throws — a resolver failure yields the empty result', async () => {
    user.findFirst.mockRejectedValue(new Error('db down'));

    const result = await notify({ staffId: 's1' }, { title: 't', body: 'b' });

    expect(result).toEqual({
      push: { attempted: 0, delivered: 0, pruned: 0 },
      whatsapp: { attempted: false, delivered: false },
    });
  });

  it('sends over WhatsApp when the channel is requested and a phone is supplied', async () => {
    vi.mocked(isWapilotConfigured).mockReturnValue(true);
    vi.mocked(normalizeWhatsAppChatId).mockReturnValue('20100@c.us');
    vi.mocked(sendWapilotTextMessage).mockResolvedValue({ ok: true, status: 200 } as never);

    const result = await notify(
      { userId: 'u1' },
      { title: 'On the way', body: 'ETA 10m', channels: ['whatsapp'], whatsappPhone: '+201001234567' },
    );

    expect(result.whatsapp).toEqual({ attempted: true, delivered: true });
  });
});

describe('sendWhatsAppToPhone', () => {
  it('skips (returns false) when Wapilot is not configured', async () => {
    vi.mocked(isWapilotConfigured).mockReturnValue(false);
    expect(await sendWhatsAppToPhone('+201001234567', 'hi')).toBe(false);
    expect(sendWapilotTextMessage).not.toHaveBeenCalled();
  });

  it('returns false for an empty phone number', async () => {
    expect(await sendWhatsAppToPhone(null, 'hi')).toBe(false);
  });

  it('sends and reports success when configured', async () => {
    vi.mocked(isWapilotConfigured).mockReturnValue(true);
    vi.mocked(normalizeWhatsAppChatId).mockReturnValue('20100@c.us');
    vi.mocked(sendWapilotTextMessage).mockResolvedValue({ ok: true, status: 200 } as never);

    expect(await sendWhatsAppToPhone('+201001234567', 'hi')).toBe(true);
  });
});

describe('notifyStaffByRoles', () => {
  it('fans out to every active staff user and counts those reached', async () => {
    user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    vi.mocked(listSubscriptionsForUser).mockResolvedValue([sub('e1')] as never);
    vi.mocked(sendPushToSubscription).mockResolvedValue(undefined as never);

    const summary = await notifyStaffByRoles('platform', ['operator'], { title: 'Ops', body: 'x' });

    expect(summary).toEqual({ targeted: 2, delivered: 2 });
  });

  it('never throws — a query failure yields a zeroed summary', async () => {
    user.findMany.mockRejectedValue(new Error('db down'));

    const summary = await notifyStaffByRoles('platform', ['operator'], { title: 'Ops', body: 'x' });

    expect(summary).toEqual({ targeted: 0, delivered: 0 });
  });
});
