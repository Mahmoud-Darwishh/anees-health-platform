/**
 * Centralised page metadata builders for Anees Health.
 *
 * This is the single source of page metadata — import builders from here.
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

  // Title hygiene: strip any brand suffix a caller appended, then add the
  // locale-correct brand back exactly once — skipping it entirely when the
  // title already references the brand (home, doctors hub, service taglines).
  // `{ absolute }` bypasses the root layout's `%s | Anees Health` template,
  // which would otherwise DOUBLE the brand on every page (and force the English
  // brand onto Arabic titles).
  const brand = input.locale === 'ar' ? 'أنيس هيلث' : 'Anees Health';
  const baseTitle = input.title.replace(/\s*\|\s*(?:Anees Health|أنيس هيلث)\s*$/u, '').trim();
  const fullTitle = /(?:Anees|أنيس)/u.test(baseTitle) ? baseTitle : `${baseTitle} | ${brand}`;

  return {
    title: { absolute: fullTitle },
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
      title: fullTitle,
      description: input.description,
      locale: bcp47(input.locale),
      alternateLocale: [bcp47(altLocale)],
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
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
        title: 'أطباء الزيارات المنزلية في مصر حسب التخصص',
        description: 'تصفح أطباء أنيس هيلث المرخصين للزيارات المنزلية والاستشارات في القاهرة الكبرى. تخصصات متعددة، رعاية في المنزل، حجز فوري.',
      }
    : {
        title: 'Home-Visit Doctors in Egypt by Specialty',
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

/* ───────────────────────────────── FAQ ──────────────────────────── */

export function buildFaqMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/faq`,
    title: locale === 'ar'
      ? 'أسئلة شائعة عن الرعاية الصحية المنزلية في مصر'
      : 'Home Healthcare FAQs in Egypt',
    description: locale === 'ar'
      ? 'إجابات عن الأسئلة الشائعة حول الرعاية الصحية المنزلية في مصر مع أنيس هيلث: الخدمات، الأسعار، التغطية، التراخيص، الحجز والدفع، والخصوصية.'
      : 'Answers to common questions about home healthcare in Egypt with Anees Health: services, pricing, coverage, clinician licensing, booking, payment, and privacy.',
    keywords: locale === 'ar'
      ? ['أسئلة شائعة', 'رعاية صحية منزلية', 'أنيس هيلث', 'أسعار الرعاية المنزلية', 'مناطق التغطية']
      : ['home healthcare FAQ Egypt', 'Anees Health questions', 'home visit FAQ', 'home nursing FAQ', 'home care pricing Egypt'],
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

/* ──────────────────────────── Glossary ──────────────────────────── */

export function buildGlossaryMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/glossary`,
    title: locale === 'ar'
      ? 'قاموس مصطلحات الرعاية الصحية المنزلية | أنيس هيلث'
      : 'Home Healthcare Glossary | Anees Health',
    description: locale === 'ar'
      ? 'تعريفات واضحة لمصطلحات الرعاية الصحية المنزلية في مصر — التمريض المنزلي، الرعاية التلطيفية، العلاج الطبيعي، العناية بالجروح والمزيد.'
      : 'Clear definitions of home-healthcare terms in Egypt — home nursing, palliative care, physiotherapy, wound care, IV therapy and more.',
    keywords: locale === 'ar'
      ? ['مصطلحات الرعاية المنزلية', 'ما معنى التمريض المنزلي', 'تعريف الرعاية التلطيفية']
      : ['home healthcare glossary', 'what is home nursing', 'home care terms Egypt'],
  });
}

export function buildGlossaryTermMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  term: string;
  definition: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/glossary/${args.slug}`,
    title: args.locale === 'ar'
      ? `ما هو ${args.term}؟ | أنيس هيلث`
      : `What is ${args.term}? | Anees Health`,
    description: args.definition.slice(0, 300),
  });
}

/* ─────────────────────────── Conditions ─────────────────────────── */

export function buildConditionsMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/conditions`,
    title: locale === 'ar'
      ? 'الرعاية المنزلية حسب الحالة في مصر | أنيس هيلث'
      : 'Home Care by Condition in Egypt | Anees Health',
    description: locale === 'ar'
      ? 'كيف تُدار حالات شائعة في المنزل في مصر — تأهيل الجلطة، العناية بالجروح بعد الجراحة، القدم السكري، والوقاية من سقوط المسنين.'
      : 'How common conditions are managed at home in Egypt — stroke rehabilitation, post-surgery wound care, diabetic foot care, and elderly fall prevention.',
    keywords: locale === 'ar'
      ? ['رعاية منزلية حسب الحالة', 'تأهيل جلطة منزلي', 'عناية بالجروح في المنزل', 'القدم السكري']
      : ['home care by condition Egypt', 'stroke rehab at home', 'wound care at home', 'diabetic foot care'],
  });
}

export function buildConditionMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  title: string;
  description: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/conditions/${args.slug}`,
    title: `${args.title} | Anees Health`,
    description: args.description,
  });
}

/* ───────────────────────────── Guides ───────────────────────────── */

export function buildGuidesMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/guides`,
    title: locale === 'ar'
      ? 'أدلة الرعاية الصحية المنزلية في مصر | أنيس هيلث'
      : 'Home Healthcare Guides in Egypt | Anees Health',
    description: locale === 'ar'
      ? 'أدلة عملية حول الرعاية الصحية المنزلية في مصر — كيف تختار مزوّداً، الرعاية المنزلية أم دار المسنين، التكلفة، ورعاية كبار السن وما بعد العمليات.'
      : 'Practical guides to home healthcare in Egypt — how to choose a provider, home care vs. nursing home, costs, and caring for elderly and post-operative patients.',
    keywords: locale === 'ar'
      ? ['أدلة الرعاية المنزلية', 'كيف تختار تمريض منزلي', 'رعاية منزلية أم دار مسنين']
      : ['home healthcare guides Egypt', 'how to choose home nursing', 'home care vs nursing home'],
  });
}

export function buildGuideMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  title: string;
  description: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/guides/${args.slug}`,
    title: `${args.title} | Anees Health`,
    description: args.description,
  });
}

/* ───────────────────────────── Blog ─────────────────────────────── */

export function buildBlogMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/blog`,
    title: locale === 'ar'
      ? 'مدونة الرعاية الصحية المنزلية | أنيس هيلث'
      : 'Home Healthcare Blog | Anees Health',
    description: locale === 'ar'
      ? 'مقالات توعوية وموسمية عن الرعاية الصحية المنزلية في مصر — علامات حاجة كبار السن للرعاية، ماذا تتوقع في الزيارة المنزلية، والحفاظ على المسنين في حرّ الصيف.'
      : 'Awareness and seasonal articles on home healthcare in Egypt — signs an elderly parent needs care, what to expect from a home visit, and keeping seniors safe in the summer heat.',
    keywords: locale === 'ar'
      ? ['مدونة الرعاية المنزلية', 'علامات حاجة كبار السن للرعاية', 'رعاية المسنين في الصيف']
      : ['home healthcare blog Egypt', 'signs elderly parent needs care', 'elderly summer heat care'],
  });
}

export function buildBlogPostMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  title: string;
  description: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/blog/${args.slug}`,
    title: `${args.title} | Anees Health`,
    description: args.description,
  });
}

/* ───────────────────────────── Pricing ──────────────────────────── */

export function buildPricingMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/pricing`,
    title: locale === 'ar'
      ? 'أسعار الرعاية الصحية المنزلية في مصر (2026)'
      : 'Home Healthcare Prices in Egypt (2026)',
    description: locale === 'ar'
      ? 'كيف تعمل أسعار أنيس هيلث: السعر يظهر بوضوح قبل تأكيد الحجز، بلا رسوم مفاجئة. تعرّف على نطاقات أسعار زيارات الأطباء والتمريض والعلاج الطبيعي والتحاليل في المنزل.'
      : 'How Anees Health pricing works: the price is shown before you confirm — no surprise fees. See indicative price ranges for doctor home visits, nursing, physiotherapy, and lab tests at home.',
    keywords: locale === 'ar'
      ? ['أسعار الرعاية المنزلية مصر', 'سعر زيارة طبيب منزلية', 'أسعار التمريض المنزلي', 'تكلفة علاج طبيعي منزلي']
      : ['home healthcare cost Egypt', 'doctor home visit price Egypt', 'home nursing cost Cairo', 'physiotherapy at home price'],
  });
}

export function buildCostPageMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  title: string;
  description: string;
}): Metadata {
  return buildBaseMetadata({
    locale: args.locale,
    path: `/${args.locale}/pricing/${args.slug}`,
    title: `${args.title} | Anees Health`,
    description: args.description,
  });
}

/* ───────────────────────────── Areas (local) ────────────────────── */

export function buildAreasMetadata(locale: SupportedLocale): Metadata {
  return buildBaseMetadata({
    locale,
    path: `/${locale}/areas`,
    title: locale === 'ar'
      ? 'مناطق الرعاية الصحية المنزلية في القاهرة الكبرى | أنيس هيلث'
      : 'Home Healthcare Areas in Greater Cairo | Anees Health',
    description: locale === 'ar'
      ? 'تصفّح المناطق التي تخدمها أنيس هيلث للزيارات المنزلية في القاهرة الكبرى — المعادي، التجمع الخامس، الزمالك، مصر الجديدة، المهندسين والمزيد.'
      : 'Browse the Greater Cairo areas Anees Health serves for home visits — Maadi, New Cairo, Zamalek, Heliopolis, Mohandessin and more.',
    keywords: locale === 'ar'
      ? ['مناطق الرعاية المنزلية', 'القاهرة الكبرى', 'تمريض منزلي القاهرة', 'زيارة طبيب منزلية']
      : ['home healthcare areas Cairo', 'home visit areas Greater Cairo', 'home nursing by area Egypt'],
  });
}

export function buildAreaMetadata(args: {
  locale: SupportedLocale;
  slug: string;
  name: string;
  governorate: string;
}): Metadata {
  const { locale, slug, name } = args;
  return buildBaseMetadata({
    locale,
    path: `/${locale}/areas/${slug}`,
    title: locale === 'ar'
      ? `رعاية صحية منزلية في ${name} — طبيب وتمريض`
      : `Home Healthcare in ${name} — Doctor & Nursing`,
    description: locale === 'ar'
      ? `احجز زيارات أطباء وتمريضاً وعلاجاً طبيعياً وتحاليل في المنزل في ${name} مع أنيس هيلث — كادر مرخّص وأسعار واضحة قبل الزيارة.`
      : `Book doctor home visits, home nursing, physiotherapy, and lab tests at home in ${name} with Anees Health — licensed clinicians and prices shown before the visit.`,
    keywords: locale === 'ar'
      ? [`رعاية منزلية ${name}`, `طبيب منزلي ${name}`, `تمريض منزلي ${name}`, 'أنيس هيلث']
      : [`home healthcare ${name}`, `doctor home visit ${name}`, `home nursing ${name}`, 'Anees Health'],
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
