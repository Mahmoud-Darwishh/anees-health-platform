/**
 * Anees Health WhatsApp utilities.
 *
 * Single source of truth for the public WhatsApp number and deep-link URL
 * builder. We intentionally use `wa.me` deep links (not the WhatsApp Business
 * Cloud API) — every message reaches a real human operator.
 *
 * If we ever move to the WhatsApp Business API, this is the only place
 * callers will need to swap.
 */

/** WhatsApp number in E.164 form, no `+`, no spaces — required by `wa.me`. */
export const ANEES_WHATSAPP_PHONE = '201055164595';

/** Pretty / display variant for UI surfaces ("+20 10 5516 4595"). */
export const ANEES_WHATSAPP_DISPLAY = '+20 10 5516 4595';

/**
 * Build a `https://wa.me/<phone>?text=<message>` URL with the message
 * properly percent-encoded.
 *
 * @param message  Plain-text body. Newlines are preserved.
 */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${ANEES_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
