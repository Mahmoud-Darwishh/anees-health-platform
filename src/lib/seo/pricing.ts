/**
 * Care-package & service pricing for the /pricing page (package-based model).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  OWNER: each offering has one or more price tiers — a single "from" price │
 * │  (`fromEgp`) or a range (`fromEgp` + `toEgp`). Leave `tiers: []` to show   │
 * │  an offering WITHOUT a number (the page renders "Confirmed before          │
 * │  booking"). These are indicative anchors only; the exact price is always   │
 * │  shown in the booking flow before the customer confirms.                  │
 * │                                                                            │
 * │  ⚠️ CONFIRM BEFORE DEPLOY: the Sanad monthly/annual figures and the        │
 * │  package names/descriptions below are seeded from owner notes (2026-06-25) │
 * │  — review the wording and fill the empty tiers for the rest.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
import type { SupportedLocale } from './site';

export interface PriceTier {
  /** Localized tier label, e.g. "Monthly", "Annual", "12-session program". */
  label: string;
  fromEgp: number;
  /** When set, the tier is a range (fromEgp–toEgp). */
  toEgp?: number;
}

export interface CarePackage {
  slug: string;
  name: string;
  description: string;
  /** Optional link to the matching /services/[slug] page. */
  serviceSlug?: string;
  tiers: PriceTier[];
}

const EN: CarePackage[] = [
  {
    slug: 'sanad-care',
    name: 'Sanad — Ongoing Home Care',
    description:
      'A comprehensive ongoing home-care subscription: scheduled nursing, doctor follow-ups, physiotherapy, and one coordinator managing the whole case — built for elderly and chronic-disease patients.',
    serviceSlug: 'elderly-care-at-home',
    tiers: [
      { label: 'Monthly', fromEgp: 19500 },
      { label: 'Annual', fromEgp: 60000 },
    ],
  },
  {
    slug: 'home-physiotherapy-program',
    name: 'Home Physiotherapy Program (12 sessions)',
    description:
      'A structured 12-session home physiotherapy program for post-operative, stroke, orthopedic, and mobility rehabilitation, delivered by a licensed physiotherapist at home.',
    serviceSlug: 'physiotherapy-at-home',
    tiers: [{ label: '12-session program', fromEgp: 8000, toEgp: 12000 }],
  },
  {
    slug: 'home-nursing',
    name: 'Home Nursing',
    description:
      'Skilled home nursing — wound care, injections, IV therapy, catheter and tube care, and vitals — by the visit, by the shift, or as a monthly package.',
    serviceSlug: 'home-nursing',
    tiers: [],
  },
  {
    slug: 'doctor-home-visit',
    name: 'Doctor Home Visit',
    description: 'A licensed doctor visits the patient at home, across specialties.',
    serviceSlug: 'doctor-at-home',
    tiers: [],
  },
  {
    slug: 'lab-tests-at-home',
    name: 'Lab Tests at Home',
    description: 'Home blood draw and sample collection, processed by accredited laboratories.',
    serviceSlug: 'lab-tests-at-home',
    tiers: [],
  },
  {
    slug: 'post-operative-care',
    name: 'Post-Operative Care',
    description: 'Wound and drain care, pain management, nursing, and physiotherapy after surgery.',
    serviceSlug: 'post-operative-care',
    tiers: [],
  },
];

const AR: CarePackage[] = [
  {
    slug: 'sanad-care',
    name: 'سند — رعاية منزلية مستمرة',
    description:
      'اشتراك رعاية منزلية شامل: تمريض مجدول، ومتابعة طبية، وعلاج طبيعي، ومنسق واحد يدير الحالة بالكامل — مصمم لكبار السن ومرضى الأمراض المزمنة.',
    serviceSlug: 'elderly-care-at-home',
    tiers: [
      { label: 'شهري', fromEgp: 19500 },
      { label: 'سنوي', fromEgp: 60000 },
    ],
  },
  {
    slug: 'home-physiotherapy-program',
    name: 'برنامج العلاج الطبيعي المنزلي (12 جلسة)',
    description:
      'برنامج علاج طبيعي منزلي من 12 جلسة للتأهيل بعد العمليات والجلطات وإصابات العظام واستعادة الحركة، يقدمه أخصائي مرخّص في المنزل.',
    serviceSlug: 'physiotherapy-at-home',
    tiers: [{ label: 'برنامج 12 جلسة', fromEgp: 8000, toEgp: 12000 }],
  },
  {
    slug: 'home-nursing',
    name: 'التمريض المنزلي',
    description:
      'تمريض منزلي متخصص — عناية بالجروح، وحقن، ومحاليل وريدية، وقساطر وأنابيب، ومتابعة علامات حيوية — بالزيارة أو بالوردية أو بباقة شهرية.',
    serviceSlug: 'home-nursing',
    tiers: [],
  },
  {
    slug: 'doctor-home-visit',
    name: 'زيارة طبيب منزلية',
    description: 'طبيب مرخّص يزور المريض في المنزل في مختلف التخصصات.',
    serviceSlug: 'doctor-at-home',
    tiers: [],
  },
  {
    slug: 'lab-tests-at-home',
    name: 'تحاليل في المنزل',
    description: 'سحب دم وعينات في المنزل، تُحلَّل في معامل معتمدة.',
    serviceSlug: 'lab-tests-at-home',
    tiers: [],
  },
  {
    slug: 'post-operative-care',
    name: 'الرعاية بعد العمليات',
    description: 'عناية بالجروح والأنابيب، وإدارة الألم، وتمريض، وعلاج طبيعي بعد الجراحة.',
    serviceSlug: 'post-operative-care',
    tiers: [],
  },
];

const PACKAGES: Record<SupportedLocale, CarePackage[]> = { en: EN, ar: AR };

export function getAllPackages(locale: SupportedLocale): CarePackage[] {
  return PACKAGES[locale];
}

/** All published tier prices (for AggregateOffer min/max). Locale-independent. */
export function allTierPricesEgp(): number[] {
  const out: number[] = [];
  for (const pkg of EN) {
    for (const tier of pkg.tiers) {
      if (tier.fromEgp > 0) out.push(tier.fromEgp);
      if (typeof tier.toEgp === 'number' && tier.toEgp > 0) out.push(tier.toEgp);
    }
  }
  return out;
}
