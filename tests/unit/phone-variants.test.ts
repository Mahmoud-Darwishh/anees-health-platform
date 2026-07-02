import { describe, it, expect } from 'vitest';
import { phoneVariants, phonesMatch } from '@/lib/auth/phone-variants';

/**
 * PHONE-MATCHING INVARIANTS (B13 hardening).
 * ------------------------------------------
 * Patient self-registration and password-reset both match a caller-supplied
 * phone number against the value stored on the Patient record. Egyptian mobile
 * numbers get written in several formats (+20…, 0020…, 0…, bare local). These
 * tests lock the equivalence so a legitimate local format is never rejected and
 * two genuinely different subscribers never collide.
 */
describe('phone-variants matching', () => {
  it('treats common Egyptian formats of the same number as equal', () => {
    const canonical = '+201012345678';
    for (const input of ['01012345678', '0201012345678', '00201012345678', '201012345678', '+201012345678']) {
      expect(phonesMatch(input, canonical), `${input} should match ${canonical}`).toBe(true);
    }
  });

  it('does not match two different subscribers', () => {
    expect(phonesMatch('01012345678', '01087654321')).toBe(false);
  });

  it('is symmetric', () => {
    expect(phonesMatch('01012345678', '+201012345678')).toBe(
      phonesMatch('+201012345678', '01012345678'),
    );
  });

  it('always includes the digit-only and +digits forms', () => {
    const variants = phoneVariants('0101 234 5678');
    expect(variants).toContain('01012345678');
    expect(variants).toContain('+201012345678');
  });
});
