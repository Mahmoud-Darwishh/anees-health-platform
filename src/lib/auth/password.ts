import 'server-only';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

/**
 * bcrypt cost factor. Matches the patient-register route (12) so all password
 * hashes on the platform share one work factor.
 */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A hash of a long random secret that no one holds. Used to satisfy the NOT-NULL
 * `Staff.passwordHash` column when an account is created via invite: the staff
 * member cannot log in until they consume their invite link and set a real
 * password, because no plaintext will ever bcrypt-match this placeholder.
 */
export async function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(48).toString('hex'), BCRYPT_ROUNDS);
}
