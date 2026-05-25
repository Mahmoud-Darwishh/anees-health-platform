/**
 * Booking-related WhatsApp message builders.
 *
 * NEVER log the rendered text — bodies contain PHI (names, phones, amounts).
 */

interface PaymentConfirmationInput {
  fullName: string;
  bookingRef: string;
  amountEgp: number;
  currency: string;
  discountEgp?: number;
  promocode?: string | null;
}

const NUMBER_FMT_EN = new Intl.NumberFormat('en-US');
const NUMBER_FMT_AR = new Intl.NumberFormat('ar-EG');

function formatAmount(amount: number, locale: 'en' | 'ar'): string {
  const fmt = locale === 'ar' ? NUMBER_FMT_AR : NUMBER_FMT_EN;
  return fmt.format(Math.round(amount));
}

export function buildPaymentConfirmationMessage(
  input: PaymentConfirmationInput,
  locale: 'en' | 'ar',
): string {
  const amount = formatAmount(input.amountEgp, locale);
  const discount = input.discountEgp && input.discountEgp > 0
    ? formatAmount(input.discountEgp, locale)
    : null;

  if (locale === 'ar') {
    const lines = [
      `مرحباً ${input.fullName} 👋`,
      '',
      'تم تأكيد دفع حجزك في *أنيس هيلث* بنجاح ✅',
      '',
      `📄 رقم الحجز: ${input.bookingRef}`,
      `💳 المبلغ المدفوع: ${amount} ${input.currency}`,
    ];
    if (discount && input.promocode) {
      lines.push(`🎟️ كود الخصم: ${input.promocode} (وفرت ${discount} جنيه)`);
    }
    lines.push(
      '',
      'سيتواصل معك فريق الرعاية قريباً لتأكيد التفاصيل.',
      '',
      'شكراً لثقتك بنا ❤️',
    );
    return lines.join('\n');
  }

  const lines = [
    `Hi ${input.fullName} 👋`,
    '',
    'Your *Anees Health* booking payment is confirmed ✅',
    '',
    `📄 Booking Ref: ${input.bookingRef}`,
    `💳 Amount Paid: ${amount} ${input.currency}`,
  ];
  if (discount && input.promocode) {
    lines.push(`🎟️ Promo: ${input.promocode} (saved ${discount} EGP)`);
  }
  lines.push(
    '',
    'Our care team will contact you shortly to confirm the details.',
    '',
    'Thank you for choosing Anees ❤️',
  );
  return lines.join('\n');
}
