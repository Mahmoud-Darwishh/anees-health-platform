/**
 * Application-level logger for server-side use only.
 * Suppresses debug/info output in production to avoid leaking
 * implementation details. Only errors are always emitted.
 *
 * Usage:
 *   import { logger } from '@/lib/utils/app-logger';
 *   logger.info('Hash generated', { orderId });
 *   logger.error('Webhook failed', error);
 */

const isDev = process.env.NODE_ENV !== 'production';

function formatMessage(level: string, message: string, context?: unknown): string {
  const ts = new Date().toISOString();
  const ctx = context !== undefined ? ` ${JSON.stringify(context)}` : '';
  return `[${ts}] [${level}] ${message}${ctx}`;
}

export const logger = {
  /** Debug-level — dev only */
  debug(message: string, context?: unknown): void {
    if (isDev) {
      console.debug(formatMessage('DEBUG', message, context));
    }
  },

  /** Info-level — dev only */
  info(message: string, context?: unknown): void {
    if (isDev) {
      console.info(formatMessage('INFO', message, context));
    }
  },

  /** Warning — always emitted */
  warn(message: string, context?: unknown): void {
    console.warn(formatMessage('WARN', message, context));
  },

  /** Error — always emitted */
  error(message: string, context?: unknown): void {
    console.error(formatMessage('ERROR', message, context));
  },
};
