type SupportedLocale = 'en' | 'ar';

type SpecialityCategory = {
  key: string;
  en: string;
  ar: string;
  patterns: RegExp[];
};

const SPECIALITY_CATEGORIES: SpecialityCategory[] = [
  {
    key: 'physio-rehab',
    en: 'Physio and Rehab',
    ar: 'العلاج الطبيعي والتأهيل',
    patterns: [
      /physio/i,
      /physiotherapy/i,
      /physical\s*therapy/i,
      /rehab/i,
      /rehabilitation/i,
      /علاج\s*طبيعي/i,
      /تأهيل/i,
    ],
  },
  {
    key: 'neuro-care',
    en: 'Neurology and Neuropsychiatry',
    ar: 'الأعصاب والطب النفسي العصبي',
    patterns: [
      /neurology/i,
      /neurologist/i,
      /neuropsychiat/i,
      /neuro\s*psychiat/i,
      /neuropsychiatry/i,
      /اعصاب/i,
      /أعصاب/i,
      /نفسي\s*عصبي/i,
    ],
  },
  {
    key: 'geriatrics',
    en: 'Geriatrics',
    ar: 'طب الشيخوخة',
    patterns: [/geriatric/i, /elderly/i, /شيخوخة/i, /مسنين/i],
  },
  {
    key: 'orthopedics',
    en: 'Orthopedics',
    ar: 'جراحة العظام',
    patterns: [/orthopedic/i, /orthopaedic/i, /عظام/i],
  },
  {
    key: 'cardiology',
    en: 'Cardiology',
    ar: 'أمراض القلب',
    patterns: [/cardio/i, /قلب/i],
  },
  {
    key: 'internal-medicine',
    en: 'Internal Medicine',
    ar: 'الباطنة',
    patterns: [/internal\s*medicine/i, /internist/i, /باطنة/i],
  },
  {
    key: 'pediatrics',
    en: 'Pediatrics',
    ar: 'طب الأطفال',
    patterns: [/pediatric/i, /paediatric/i, /اطفال/i, /أطفال/i],
  },
  {
    key: 'psychiatry',
    en: 'Psychiatry',
    ar: 'الطب النفسي',
    patterns: [/psychiatry/i, /psychiatrist/i, /نفسي/i],
  },
];

const FALLBACK_ARABIC_PATTERN = /[\u0600-\u06FF]/;

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const getDoctorSpecialityLabel = (speciality: string, locale: SupportedLocale): string => {
  const normalized = normalizeWhitespace(speciality);
  const found = SPECIALITY_CATEGORIES.find((category) =>
    category.patterns.some((pattern) => pattern.test(normalized))
  );

  if (found) {
    return locale === 'ar' ? found.ar : found.en;
  }

  if (locale === 'ar' || FALLBACK_ARABIC_PATTERN.test(normalized)) {
    return normalized;
  }

  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};
