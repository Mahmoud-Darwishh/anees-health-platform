/**
 * Human-readable byte size formatter.
 *
 *   formatBytes(0)        → '0 B'
 *   formatBytes(1024)     → '1.0 KB'
 *   formatBytes(1536)     → '1.5 KB'
 *   formatBytes(2_000_000) → '1.9 MB'
 */
export function formatBytes(bytes: number | null | undefined, fractionDigits = 1): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : fractionDigits)} ${units[exp]}`;
}
