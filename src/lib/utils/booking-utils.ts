import {
  BookingFormState,
  getPackageEntry,
} from '@/lib/models/booking.types';

/** Generate a formatted booking message for WhatsApp */
export function generateBookingMessage(
  formState: BookingFormState,
  totalPrice: number,
  locale: string
): string {
  const isArabic = locale === 'ar';
  const lines = isArabic
    ? buildArabicLines(formState, totalPrice)
    : buildEnglishLines(formState, totalPrice);

  return lines.join('\n');
}

function buildEnglishLines(s: BookingFormState, total: number): string[] {
  return [
    'Hello Anees Health! 👋',
    '',
    'I would like to book a service with the following details:',
    '',
    `📋 Name: ${s.fullName}`,
    `📱 Phone: +${s.countryCode} ${s.phoneNumber}`,
    `🏥 Service: ${describeServiceEn(s)}`,
    '',
    `💰 Total: ${total} EGP`,
    '',
    'Please confirm my booking and provide the next steps.',
    '',
    'Thank you! ❤️',
  ];
}

function buildArabicLines(s: BookingFormState, total: number): string[] {
  return [
    'مرحباً بك في أنيس هيلث! 👋',
    '',
    'أود حجز خدمة بالتفاصيل التالية:',
    '',
    `📋 الاسم: ${s.fullName}`,
    `📱 الهاتف: +${s.countryCode} ${s.phoneNumber}`,
    `🏥 الخدمة: ${describeServiceAr(s)}`,
    '',
    `💰 الإجمالي: ${total} جنيه مصري`,
    '',
    'الرجاء تأكيد حجزي وتقديم الخطوات التالية.',
    '',
    'شكراً لك! ❤️',
  ];
}

const PACKAGE_NAMES_EN: Record<string, string> = {
  haraka: 'Haraka — Joint & Arthritis Care',
  wai: 'Wai — Cognitive & Dementia Care',
  amal: 'Amal — Stroke Recovery',
  sanad: 'Sanad — Continuous Care',
};

const PACKAGE_NAMES_AR: Record<string, string> = {
  haraka: 'حركة — رعاية المفاصل والتهاباتها',
  wai: 'وعي — رعاية الإدراك والخرف',
  amal: 'أمل — التعافي من السكتة الدماغية',
  sanad: 'سَنَد — الرعاية المستمرة',
};

function describeServiceEn(s: BookingFormState): string {
  if (s.visitType === 'telemedicine') return 'Telemedicine Consultation';
  if (s.visitType === 'package') {
    const entry = getPackageEntry(s.packageType);
    if (!entry) return 'Package';
    const name = PACKAGE_NAMES_EN[entry.value] ?? 'Package';
    const duration = s.packageDuration === '1y' ? '1 Year' : '3 Months';
    return entry.durations.length > 1 ? `${name} — ${duration}` : `${name} (3 Months)`;
  }
  return '';
}

function describeServiceAr(s: BookingFormState): string {
  if (s.visitType === 'telemedicine') return 'استشارة عن بُعد';
  if (s.visitType === 'package') {
    const entry = getPackageEntry(s.packageType);
    if (!entry) return 'باقة';
    const name = PACKAGE_NAMES_AR[entry.value] ?? 'باقة';
    const duration = s.packageDuration === '1y' ? 'سنة كاملة' : 'ثلاثة أشهر';
    return entry.durations.length > 1 ? `${name} — ${duration}` : `${name} (ثلاثة أشهر)`;
  }
  return '';
}

/** Encode message for URL encoding in WhatsApp links */
export function encodeWhatsAppMessage(message: string): string {
  return encodeURIComponent(message);
}
