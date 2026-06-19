/**
 * PASSWORD RULES — shared, runtime-agnostic (safe to import on client + server).
 * ----------------------------------------------------------------------------
 * Pure Zod + constants only. No `server-only`, no bcrypt, so the set-password
 * form can validate inline with the SAME rule the server enforces — they can
 * never drift. Hashing lives in `password.ts` (server-only).
 */

import { z } from 'zod';

/** NIST-aligned floor. We favour length over forced symbol churn. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;

/**
 * A password strong enough for a PHI-bearing clinical system. Length is the
 * primary control; we additionally require a mix so a 12-char all-lowercase
 * passphrase isn't the weakest acceptable input.
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH, 'Password is too long.')
  .refine((value) => /[a-z]/.test(value), 'Add at least one lowercase letter.')
  .refine((value) => /[A-Z]/.test(value), 'Add at least one uppercase letter.')
  .refine((value) => /[0-9]/.test(value), 'Add at least one number.');

export const PASSWORD_REQUIREMENTS_TEXT = `At least ${MIN_PASSWORD_LENGTH} characters, with an uppercase letter, a lowercase letter, and a number.`;
