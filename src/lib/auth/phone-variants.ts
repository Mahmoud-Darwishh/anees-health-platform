/**
 * Egypt-aware phone-number variants so a number entered in any common local or
 * international format matches the one stored on file. Handles the +20 / 0020 /
 * 00 / leading-0 permutations that Egyptian mobile numbers are written in.
 *
 * Shared by the patient self-registration and password-reset routes so both use
 * identical matching logic (no drift between "sign up" and "reset").
 */
export function phoneVariants(input: string): string[] {
  let digits = input.replace(/\D/g, '');
  // Strip the "00" international access code so 0020… collapses to the same
  // subscriber as +20… / 20… before the country-code permutations run.
  if (digits.startsWith('00')) digits = digits.slice(2);
  const set = new Set<string>([input.trim(), digits, `+${digits}`]);
  if (digits.startsWith('20')) {
    const local = digits.slice(2);
    set.add(local).add(`0${local}`).add(`20${local}`).add(`+20${local}`);
  } else if (digits.startsWith('0')) {
    const local = digits.slice(1);
    set.add(local).add(`20${local}`).add(`+20${local}`);
  } else {
    set.add(`0${digits}`).add(`20${digits}`).add(`+20${digits}`);
  }
  return [...set].filter(Boolean);
}

/** True when two numbers refer to the same subscriber across format variants. */
export function phonesMatch(a: string, b: string): boolean {
  const variantsOfA = new Set(phoneVariants(a));
  return phoneVariants(b).some((variant) => variantsOfA.has(variant));
}
