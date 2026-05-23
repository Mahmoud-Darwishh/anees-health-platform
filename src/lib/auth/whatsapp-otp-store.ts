import { createHash, randomInt } from 'crypto';

type OtpEntry = {
  codeHash: string;
  createdAtMs: number;
  expiresAtMs: number;
  attempts: number;
  purpose: string;
};

type OtpStoreShape = {
  otpByChatId: Map<string, OtpEntry>;
};

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'invalid' | 'too_many_attempts' };

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const globalForOtpStore = globalThis as unknown as {
  whatsappOtpStore?: OtpStoreShape;
};

const store: OtpStoreShape =
  globalForOtpStore.whatsappOtpStore ?? {
    otpByChatId: new Map<string, OtpEntry>(),
  };

if (process.env.NODE_ENV !== 'production') {
  globalForOtpStore.whatsappOtpStore = store;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function cleanupExpired(nowMs: number): void {
  for (const [chatId, entry] of store.otpByChatId.entries()) {
    if (entry.expiresAtMs <= nowMs) {
      store.otpByChatId.delete(chatId);
    }
  }
}

export function createWhatsAppOtp(chatId: string, purpose: string): { code: string; expiresAtMs: number } {
  const nowMs = Date.now();
  cleanupExpired(nowMs);

  const code = randomInt(100000, 1000000).toString();
  const expiresAtMs = nowMs + OTP_TTL_MS;

  store.otpByChatId.set(chatId, {
    codeHash: hashCode(code),
    createdAtMs: nowMs,
    expiresAtMs,
    attempts: 0,
    purpose,
  });

  return { code, expiresAtMs };
}

export function clearWhatsAppOtp(chatId: string): void {
  store.otpByChatId.delete(chatId);
}

export function getWhatsAppOtpTtlMs(): number {
  return OTP_TTL_MS;
}

export function verifyWhatsAppOtp(chatId: string, code: string): VerifyOtpResult {
  const nowMs = Date.now();
  cleanupExpired(nowMs);

  const entry = store.otpByChatId.get(chatId);
  if (!entry) return { ok: false, reason: 'not_found' };

  if (entry.expiresAtMs <= nowMs) {
    store.otpByChatId.delete(chatId);
    return { ok: false, reason: 'expired' };
  }

  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    store.otpByChatId.delete(chatId);
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (hashCode(code) !== entry.codeHash) {
    entry.attempts += 1;
    return { ok: false, reason: 'invalid' };
  }

  store.otpByChatId.delete(chatId);
  return { ok: true };
}

export function getOtpPurpose(chatId: string): string | null {
  const nowMs = Date.now();
  cleanupExpired(nowMs);

  const entry = store.otpByChatId.get(chatId);
  return entry?.purpose || null;
}
