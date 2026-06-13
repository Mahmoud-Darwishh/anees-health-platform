/**
 * Helpers for unwrapping `Promise.allSettled` results into the
 * `AdminPatientDetailData` DTO shape (value-or-fallback + a rejection message),
 * replacing ~18 hand-written `status === 'rejected' ? … instanceof Error …`
 * ternaries in the loader.
 */

export function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

export function settledError(
  result: PromiseSettledResult<unknown>,
  fallbackMessage: string,
): string | null {
  if (result.status !== 'rejected') {
    return null;
  }
  return result.reason instanceof Error ? result.reason.message : fallbackMessage;
}
