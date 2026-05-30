/**
 * Centralised page metadata builders for Anees Health.
 *
 * Replaces the older `src/lib/utils/metadata.ts` (which still ships as a
 * thin re-export shim for legacy imports).
 *
 * Every builder returns a full Next.js {@link Metadata} object with:
 *   - bilingual EN/AR title & description
 *   - canonical URL
 *   - hreflang `alternates.languages` (en-US, ar-EG, x-default)
 *   - Open Graph (locale + alt-locale) and Twitter card
 *   - sensible defaults pulled from `@/lib/seo/site`
 *
 * Positioning: home-visit-first home healthcare in Egypt. Telemedicine is a
 * channel, never the headline.
 */

import type { Metadata } from 'next';
import { site, bcp47, brandLabel, buildHreflangMap, type SupportedLocale } from './site';

interface CommonInput {
  locale: SupportedLocale;
  /** Locale-prefixed path, e.g. `/en/doctors` */
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  /** Override the default OG image */
  ogImage?: string;
  /** Set to true to noindex (used for /booking, payment, etc.) */
  noIndex?: boolean;
}

function buildBaseMetadata(input: CommonInput): Metadata {
  const canonical = `${site.baseUrl}${input.path}`;
  const altLocale = input.locale === 'ar' ? 'en' : 'ar';
  const altPath = input.path.replace(/^\/(en|ar)/, `/${altLocale}`);
  const ogImage = input.ogImage || site.defaultOgImage;

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical,
      languages: buildHreflangMap(input.path),
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: brandLabel(input.locale),
      title: input.title,
      description: input.description,
      locale: bcp47(input.locale),
      alternateLocale: [bcp47(altLocale)],
      images: [{ url: ogImage, width: 1200, height: 630, alt: input.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
    robots: input.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    other: input.noIndex
      ? undefined
      : {
          'og:locale:alternate': bcp47(altLocale),
          'twitter:url': canonical,
        },
    ...(altPath !== input.path
      ? {
          // helper hint, leveraged by some social crawlers
        }
      : {}),
  };
}

/* ────────────────────────────── Root / Site ─────────────────────── */

/**
 * Site-wide default metadata. Applied in the root `app/layout.tsx`.
 * Per-route metadata overrides this.
 */
export function buildSiteMetadata(): Metadata {
  const title = 'Anees Health — Home Healthcare in Egypt';
  const description =
    'Anees Health is Egypt’s home healthcare platform. Book licensed doctor home visits, home nursing, home physiotherapy, lab tests at home, and chronic-care coordination across Greater Cairo. Bilingual (EN/AR), licensed clinicians, transparent pricing.';
  return {
    metadataBase: new URL(site.baseUrl),
    title: {
      default: title,
      template: '%s | Anees Health',
    },
    description,
    applicationName: 'Anees Health',
    keywords: [
      'home healthcare Egypt',
      'doctor home visit Egypt',
      'home nursing Cairo',
      'home physiotherapy Cairo',
      'lab tests at home Egypt',
      'elderly care Egypt',
      'palliative care home',
      'رعاية صحية منزلية',
      'زيارة طبيب منزلية',
      'تمريض منزلي',
      'علاج طبيعي منزلي',
      'تحاليل في المنزل',
      'رعاية المسنين في المنزل',
      'أنيس هيلث',
    ],
    authors: [{ name: site.name, url: site.baseUrl }],
    creator: site.name,
    publisher: site.name,
    formatDetection: { telephone: true, email: true, address: true },
    openGraph: {
      type: 'website',
      siteName: site.name,
      title,
      description,
      url: site.baseUrl,
      images: [{ url: site.defaultOgImage, width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [site.defaultOgImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

/* ─────────────────────────────── Home ───────────────────────────── */

export function buildHomeMetadata(locale: SupportedLocale): Metadata {
  const en = {
    title: 'Anees Health — Home Healthcare in Egypt',
    description:
      'Book licensed doctor home visits, home nursing, home physiotherapy, and lab tests at home across Greater Cairo. Egypt’s home healthcare platform — transparent pricing, bilingual coordinators, same-day visits.',
  };
  const ar = {
    title: 'أنيس هيلث — رعاية صحية منزلية في مصر',
    description:
      'احجز زيارات أطباء وتمريضاً وعلاجاً طبيعياً وتحاليل في المنزل في القاهرة الكبرى. منصة الرعاية الصحية المنزلية في مصر — أسعار شفافة، منسقون باللغتين، زيارات في نفس اليوم.',
  };
  const copy = locale === 'ar' ? ar : en;
  return buildBaseMetadata({
    locale,
    path: `/${locale}`,
    title: copy.title,
    description: copy.description,
    keywords: locale === 'ar'
      ? ['رعاية صحية منزلية', 'زيارة طبيب منزلية', 'تمريض منزلي', 'علاج طبيعي منزلي', 'تحاليل منزلية', 'رعاية المسنين', 'أنيس هيلث', 'القاهرة']
      : ['home healthcare Egypt', 'doctor home visit', 'home nursing Cairo', 'home physiotherapy', 'lab tests at home', 'elderly home care', 'Anees Health'],
  });
}

/* ───────────────────────────── Doctors ──────────────────────────── */

export function buildDoctorsMetadata(locale: SupportedLocale): Metadata {
  const copy = locale === 'ar'
    ? {
        title: 'أطباء أنيس هيلث للزيارات المنزلية',
        description: 'تصفح أطباء أنيس هيلث المرخصين للزيارات المنزلية والاستشارات في القاهرة الكبرى. تخصصات متعددة، رعاية في المنزل، حجز فوري.',
      }
    : {
        title: 'Anees Health Doctors for Home Visits | Licensed Egyptian Physicians',
        description: 'Browse licensed Anees Health doctors offering home visits and consultations across Greater Cairo. Multiple specialties, at-home care, instant booking.',
      };
  return buildBaseMetadata({
    locale,
    path: `/${locale}/doctors`,
    title: copy.title,
    description: copy.description,
    keywords: locale === 'ar'
      ? ['أطباء منزليون', 'طبيب زيارات منزلية', 'استشارة طبية في المنزل', 'أطباء أنيس']
      : ['home visit doctors Egypt', 'Cairo home doctors', 'licensed Egyptian doctors', 'Anees Health doctors'],
  });
}

export function buildDoctorProfileMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  name: string;
  speciality: string;
  bio: string;
  image?: string;
}): Metadata {
  const titleEn = `${args.name} — ${args.speciality} | Anees Health Home Visits`;
  const titleAr = `${args.name} — ${args.speciality} | زيارات منزلية عبر أنيس هيلث`;
  const descEn = `${args.name}, ${args.speciality}. Book a home visit or consultation on Anees Health — Egypt’s home healthcare platform. ${args.bio}`.trim();
  const descAr = `${args.name}، ${args.speciality}. احجز زيارة منزلية أو استشارة عبر أنيس هيلث — منصة الرعاية الصحية المنزلية في مصر. ${args.bio}`.trim();
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/doctors/${args.slug}`,
    title: args.locale === 'ar' ? titleAr : titleEn,
    description: (args.locale === 'ar' ? descAr : descEn).slice(0, 300),
    ogImage: args.image,
    keywords: args.locale === 'ar'
      ? [args.name, args.speciality, 'زيارة منزلية', 'أطباء أنيس', 'حجز طبيب']
      : [args.name, args.speciality, 'home visit', 'Anees doctor', 'book doctor Cairo'],
  });
}

/* ─────────────────────────────── Services ───────────────────────── */

export function buildServicesMetadata(locale: SupportedLocale): Metadata {
  const copy = locale === 'ar'
    ? {
        title: 'خدمات الرعاية الصحية المنزلية في مصر | أنيس هيلث',
        description: 'زيارات أطباء، تمريض، علاج طبيعي، تحاليل وأشعة في المنزل، رعاية ما بعد العمليات والمسنين، باقات الأمراض المزمنة. أسعار شفافة من قاعدة بيانات أنيس.',
      }
    : {
        title: 'Home Healthcare Services in Egypt | Anees Health',
        description: 'Doctor home visits, home nursing, home physiotherapy, lab tests and scans at home, post-operative and elderly care, chronic disease packages. Transparent pricing from the Anees catalog.',
      };
  return buildBaseMetadata({
    locale,
    path: `/${locale}/services`,
    title: copy.title,
    description: copy.description,
    keywords: locale === 'ar'
      ? ['خدمات صحية منزلية', 'تمريض منزلي', 'علاج طبيعي منزلي', 'تحاليل منزلية', 'أشعة بالمنزل', 'رعاية المسنين']
      : ['home healthcare services', 'home nursing Egypt', 'physiotherapy at home', 'lab tests at home', 'home radiology', 'elderly care'],
  });
}

export function buildServiceLandingMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  title: string;
  description: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/services/${args.slug}`,
    title: args.title,
    description: args.description,
  });
}

/* ───────────────────────────── Specialties ──────────────────────── */

export function buildSpecialtiesMetadata(locale: SupportedLocale): Metadata {
  const copy = locale === 'ar'
    ? {
        title: 'التخصصات الطبية | أنيس هيلث',
        description: 'تصفح التخصصات الطبية المتاحة للزيارات المنزلية والاستشارات عبر أنيس هيلث في مصر — جراحة، باطنة، أطفال، عظام، نساء، طب أسرة وأكثر.',
      }
    : {
        title: 'Medical Specialties | Anees Health',
        description: 'Browse medical specialties available for home visits and consultations on Anees Health in Egypt — surgery, internal medicine, paediatrics, orthopaedics, OB/GYN, family medicine and more.',
      };
  return buildBaseMetadata({
    locale,
    path: `/${locale}/specialties`,
    title: copy.title,
    description: copy.description,
  });
}

export function buildSpecialtyMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  name: string;
  description: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/specialties/${args.slug}`,
    title: args.locale === 'ar'
      ? `${args.name} — أطباء وزيارات منزلية | أنيس هيلث`
      : `${args.name} — Doctors & Home Visits | Anees Health`,
    description: args.description,
  });
}

/* ───────────────────────────── Booking ──────────────────────────── */

export function buildBookingMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/booking`,
    title: locale === 'ar' ? 'احجز زيارة منزلية | أنيس هيلث' : 'Book a Home Visit | Anees Health',
    description: locale === 'ar'
      ? 'احجز زيارة منزلية لطبيب أو ممرض أو متخصص علاج طبيعي مع أنيس هيلث في القاهرة الكبرى.'
      : 'Book a home visit with an Anees Health doctor, nurse, or physiotherapist across Greater Cairo.',
    noIndex: true,
  });
}

/* ───────────────────────────── Coverage ─────────────────────────── */

export function buildCoverageMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/coverage`,
    title: locale === 'ar' ? 'مناطق التغطية في مصر | أنيس هيلث' : 'Service Coverage Areas in Egypt | Anees Health',
    description: locale === 'ar'
      ? 'تحقق من تغطية أنيس هيلث لزيارات منزلية في عنوانك. خريطة مباشرة للمناطق المغطاة في القاهرة الكبرى ومحيطها.'
      : 'Check whether Anees Health covers your address for home visits. Live map of covered areas across Greater Cairo and beyond.',
    keywords: locale === 'ar'
      ? ['مناطق التغطية', 'القاهرة الكبرى', 'الجيزة', 'زيارات منزلية في مصر']
      : ['coverage areas Egypt', 'Greater Cairo home visits', 'Giza home visits', 'Anees coverage'],
  });
}

/* ────────────────────────────── About / Contact / Legal ─────────── */

export function buildAboutMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/about-us`,
    title: locale === 'ar' ? 'من نحن | أنيس هيلث' : 'About Us | Anees Health',
    description: locale === 'ar'
      ? 'تعرف على أنيس هيلث، منصة الرعاية الصحية المنزلية في مصر. مؤسسون أطباء، كادر طبي مرخص، تركيز على كبار السن ومرضى ما بعد العمليات.'
      : 'Learn about Anees Health, Egypt’s home healthcare platform. Doctor-founded, licensed clinicians, focused on elderly and post-operative care at home.',
  });
}

export function buildContactMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/contact-us`,
    title: locale === 'ar' ? 'تواصل معنا | أنيس هيلث' : 'Contact Us | Anees Health',
    description: locale === 'ar'
      ? 'تواصل مع فريق أنيس هيلث لحجز زيارة منزلية أو الاستفسار عن خدماتنا في القاهرة الكبرى.'
      : 'Contact the Anees Health team to book a home visit or ask about our home healthcare services across Greater Cairo.',
  });
}

export function buildLegalMetadata(args: {
  locale: SupportedLocale;
  kind: 'privacy' | 'terms';
}): Metadata {
  const isPrivacy = args.kind === 'privacy';
  const path = isPrivacy ? `/${args.locale}/privacy-policy` : `/${args.locale}/terms-and-conditions`;
  return buildBaseMetadata({
    locale: args.locale,
    path,
    title: isPrivacy
      ? args.locale === 'ar' ? 'سياسة الخصوصية | أنيس هيلث' : 'Privacy Policy | Anees Health'
      : args.locale === 'ar' ? 'الشروط والأحكام | أنيس هيلث' : 'Terms and Conditions | Anees Health',
    description: isPrivacy
      ? args.locale === 'ar' ? 'سياسة الخصوصية لمنصة أنيس هيلث للرعاية الصحية المنزلية في مصر.' : 'Privacy policy for Anees Health, Egypt’s home healthcare platform.'
      : args.locale === 'ar' ? 'الشروط والأحكام لاستخدام خدمات أنيس هيلث للرعاية الصحية المنزلية.' : 'Terms and conditions for using Anees Health home healthcare services.',
  });
}
