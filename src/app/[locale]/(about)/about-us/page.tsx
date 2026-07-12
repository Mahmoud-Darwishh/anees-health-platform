import { use } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { Reveal } from '@/components/common/Reveal';
import { buildAboutMetadata } from '@/lib/seo/metadata';
import { generateDoctorSlug } from '@/lib/utils/slug';
import {
  breadcrumbSchema,
  articleSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp';
import styles from './about-us.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

const CAREERS_EMAIL = 'careers@aneeshealth.com';

type TrustMark =
  | {
      key: string;
      label: string;
      caption: string;
    }
  | {
      key: string;
      label: string;
      logo: string;
      width: number;
      height: number;
    };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildAboutMetadata((locale === 'ar' ? 'ar' : 'en') as SupportedLocale);
}

export default function AboutUsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = use(params);
  setRequestLocale(rawLocale);

  const t = useTranslations('aboutPage');
  const common = useTranslations('common');
  const locale = useLocale();
  const loc = (locale === 'ar' ? 'ar' : 'en') as SupportedLocale;
  const baseUrl = site.baseUrl;
  const isArabic = locale === 'ar';

  const founder1Slug = generateDoctorSlug('Dr. Mahmoud Darwish');
  const founder2Slug = generateDoctorSlug('Dr. Ahmed Oraby');
  const founder1Url = `${baseUrl}/en/doctors/${founder1Slug}`;
  const founder2Url = `${baseUrl}/en/doctors/${founder2Slug}`;

  const whatsappHref = buildWhatsAppUrl(t('cta_whatsapp_message'));

  const pillars = [
    { title: t('pillar_1_title'), text: t('pillar_1_text') },
    { title: t('pillar_2_title'), text: t('pillar_2_text') },
    { title: t('pillar_3_title'), text: t('pillar_3_text') },
    { title: t('pillar_4_title'), text: t('pillar_4_text') },
  ];

  const notDo = [
    { title: t('notdo_1_title'), text: t('notdo_1_text') },
    { title: t('notdo_2_title'), text: t('notdo_2_text') },
    { title: t('notdo_3_title'), text: t('notdo_3_text') },
  ];

  const ops = [
    { value: t('ops_1_value'), title: t('ops_1_title'), text: t('ops_1_text') },
    { value: t('ops_2_value'), title: t('ops_2_title'), text: t('ops_2_text') },
    { value: t('ops_3_value'), title: t('ops_3_title'), text: t('ops_3_text') },
  ];

  const stats = [
    { value: t('stat_1_value'), label: t('stat_1_label') },
    { value: t('stat_2_value'), label: t('stat_2_label') },
    { value: t('stat_3_value'), label: t('stat_3_label') },
    { value: t('stat_4_value'), label: t('stat_4_label') },
  ];

  const trustMarks: TrustMark[] = [
    {
      key: 'licensed',
      label: t('trust_licensing_label'),
      caption: t('trust_licensing_text'),
    },
    {
      key: 'onc',
      label: 'ONC (+ HTI-4)',
      logo: '/assets/img/compliance/onc-certified-healthit.png',
      width: 460,
      height: 115,
    },
    {
      key: 'soc',
      label: 'SOC 2 Type II',
      logo: '/assets/img/compliance/soc.png',
      width: 224,
      height: 240,
    },
    {
      key: 'hitrust',
      label: 'HITRUST e1',
      logo: '/assets/img/compliance/hitrust-e1-badge.svg',
      width: 127,
      height: 75,
    },
    {
      key: 'hipaa',
      label: 'HIPAA',
      logo: '/assets/img/compliance/hipaa-asclepius.svg',
      width: 120,
      height: 120,
    },
    {
      key: 'cfr',
      label: 'CFR Part 11',
      logo: '/assets/img/compliance/fda.svg',
      width: 120,
      height: 120,
    },
    {
      key: 'epcs',
      label: 'EPCS',
      logo: '/assets/img/compliance/drummond-epcs.png',
      width: 1024,
      height: 1024,
    },
  ];

  const breadcrumbItems = [
    { label: common('home'), href: `/${locale}` },
    { label: t('title'), active: true },
  ];

  const crumbsLd = breadcrumbSchema([
    { name: site.labels.home[loc], url: `${baseUrl}/${locale}` },
    { name: t('title'), url: `${baseUrl}/${locale}/about-us` },
  ]);

  const articleLd = articleSchema(
    {
      title: t('title'),
      description: t('hero_subtitle'),
      datePublished: '2024-01-01',
      dateModified: '2026-01-01',
      author: site.name,
    },
    loc,
    `${baseUrl}/${locale}/about-us`
  );

  return (
    <>
      <Script
        id="about-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbsLd) }}
      />
      <Script
        id="about-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(articleLd) }}
      />

      <Header />
      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      <main className={styles.page}>
        {/* 1 ─── Hero ──────────────────────────────────────────── */}
        <Reveal as="section" className={styles.hero} aria-labelledby="about-hero-title">
          <div className="container">
            <span className={styles.heroEyebrow}>{t('hero_badge')}</span>
            <h1 id="about-hero-title" className={styles.heroTitle}>
              {t('hero_title')}
            </h1>
            <p className={styles.heroSubtitle}>{t('hero_subtitle')}</p>

            <div className={styles.heroCtaRow}>
              <a
                href={whatsappHref}
                className={styles.btnPrimary}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LucideIcon iconClass="fa-solid fa-comment-dots" aria-hidden="true" />
                {t('hero_cta_primary')}
              </a>
              <Link href={`/${locale}/contact-us`} className={styles.btnGhost}>
                {t('hero_cta_secondary')}
              </Link>
            </div>

            <div className={styles.heroFoundedChip}>
              <span className={styles.heroFoundedChip__pin} aria-hidden="true">
                <LucideIcon iconClass="fa-solid fa-shield-halved" />
              </span>
              <span className={styles.heroFoundedChip__text}>
                <span className={styles.heroFoundedChip__label}>{t('hero_founded_label')}</span>
                <span className={styles.heroFoundedChip__value}>{t('hero_founded_value')}</span>
              </span>
            </div>
          </div>
        </Reveal>

        {/* 2 ─── Trust band ───────────────────────────────────── */}
        <Reveal as="section" className={styles.trust} aria-label={t('trust_aria')}>
          <div className="container">
            <header className={styles.trustHeader}>
              <h2 className={styles.trustTitle}>
                {isArabic ? 'موثوق، آمن، ومنظم' : 'Certified, compliant & secure'}
              </h2>
            </header>

            <div className={styles.trustMarkGrid}>
              {trustMarks.map((mark) => (
                <article
                  key={mark.key}
                  className={`${styles.trustMarkCard} ${
                    mark.key === 'licensed' ? styles.trustMarkCardFeatured : ''
                  }`}
                >
                  <div
                    className={`${styles.trustMarkLogo} ${
                      mark.key === 'licensed' ? styles.trustMarkLogo_licensed : ''
                    }`}
                  >
                    {'logo' in mark ? (
                      <Image
                        src={mark.logo}
                        alt={mark.label}
                        width={mark.width}
                        height={mark.height}
                        className={[
                          styles.trustMarkImage,
                          styles[`trustMarkImage_${mark.key}`],
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    ) : (
                      <>
                        <LucideIcon iconClass="fa-solid fa-shield-halved" aria-hidden="true" />
                        <span>MOH</span>
                      </>
                    )}
                  </div>
                  <div className={styles.trustMarkText}>
                    <strong>{mark.label}</strong>
                    {'caption' in mark && <span>{mark.caption}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 3 ─── Story ────────────────────────────────────────── */}
        <Reveal as="section" className={styles.story} aria-labelledby="about-story-title">
          <div className="container">
            <div className={styles.storyGrid}>
              <article className={styles.storyBody}>
                <span className={styles.eyebrow}>{t('story_eyebrow')}</span>
                <h2 id="about-story-title" className={styles.storyTitle}>
                  {t('story_title')}
                </h2>
                <p className={styles.storyParagraph}>{t('story_paragraph_1')}</p>
                <p className={styles.storyParagraph}>{t('story_paragraph_2')}</p>
              </article>
              <aside className={styles.storyPull}>{t('story_pull')}</aside>
            </div>
          </div>
        </Reveal>

        {/* 5 ─── Pillars ──────────────────────────────────────── */}
        <Reveal as="section" className={styles.pillars} aria-labelledby="about-pillars-title">
          <div className="container">
            <header className={styles.header}>
              <span className={styles.eyebrow}>{t('pillars_eyebrow')}</span>
              <h2 id="about-pillars-title" className={styles.title}>{t('pillars_title')}</h2>
              <p className={styles.subtitle}>{t('pillars_subtitle')}</p>
            </header>

            <div className={styles.pillarsGrid}>
              {pillars.map((p, i) => (
                <article key={p.title} className={styles.pillarCard}>
                  <span className={styles.pillarIndex} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className={styles.pillarTitle}>{p.title}</h3>
                  <p className={styles.pillarText}>{p.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 6 ─── What we don't do ─────────────────────────────── */}
        <Reveal as="section" className={styles.notDo} aria-labelledby="about-notdo-title">
          <div className="container">
            <header className={styles.header}>
              <span className={styles.eyebrow}>{t('notdo_eyebrow')}</span>
              <h2 id="about-notdo-title" className={styles.title}>{t('notdo_title')}</h2>
              <p className={styles.subtitle}>{t('notdo_subtitle')}</p>
            </header>

            <div className={styles.notDoGrid}>
              {notDo.map((n) => (
                <article key={n.title} className={styles.notDoCard}>
                  <span className={styles.notDoMark} aria-hidden="true">
                    <LucideIcon iconClass="fa-solid fa-xmark" />
                  </span>
                  <h3 className={styles.notDoTitle}>{n.title}</h3>
                  <p className={styles.notDoText}>{n.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 7 ─── Operations promises ───────────────────────────── */}
        <Reveal as="section" className={styles.ops} aria-labelledby="about-ops-title">
          <div className="container">
            <header className={styles.header}>
              <span className={styles.eyebrow}>{t('ops_eyebrow')}</span>
              <h2 id="about-ops-title" className={styles.title}>{t('ops_title')}</h2>
              <p className={styles.subtitle}>{t('ops_subtitle')}</p>
            </header>

            <div className={styles.opsGrid}>
              {ops.map((o) => (
                <article key={o.title} className={styles.opsCard}>
                  <span className={styles.opsValue}>{o.value}</span>
                  <div>
                    <h3 className={styles.opsTitle}>{o.title}</h3>
                    <p className={styles.opsText}>{o.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 8 ─── Coverage teaser ──────────────────────────────── */}
        <Reveal as="section" className={styles.coverage} aria-labelledby="about-coverage-title">
          <div className="container">
            <article className={styles.coverageCard}>
              <div className={styles.coverageBody}>
                <span className={styles.coverageEyebrow}>{t('coverage_eyebrow')}</span>
                <h2 id="about-coverage-title" className={styles.coverageTitle}>
                  {t('coverage_title')}
                </h2>
                <p className={styles.coverageText}>{t('coverage_text')}</p>
              </div>
              <Link href={`/${locale}/coverage`} className={styles.coverageLink}>
                {t('coverage_link')}
                <LucideIcon iconClass="fa-solid fa-arrow-right" aria-hidden="true" />
              </Link>
            </article>
          </div>
        </Reveal>

        {/* 10 ─── Stats strip ──────────────────────────────────── */}
        <Reveal as="section" className={styles.stats} aria-label={t('stats_aria')}>
          <div className="container">
            <ul className={styles.statsGrid} role="list">
              {stats.map((s) => (
                <li key={s.label} className={styles.statItem}>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* 11 ─── Privacy + Careers band ───────────────────────── */}
        <Reveal as="section" className={styles.band} aria-label={t('band_aria')}>
          <div className="container">
            <div className={styles.bandGrid}>
              <Link href={`/${locale}/privacy-policy`} className={styles.bandCard}>
                <span className={styles.bandIcon} aria-hidden="true">
                  <LucideIcon iconClass="fa-solid fa-lock" />
                </span>
                <div className={styles.bandBody}>
                  <span className={styles.bandLabel}>{t('privacy_label')}</span>
                  <h3 className={styles.bandTitle}>{t('privacy_title')}</h3>
                  <p className={styles.bandText}>{t('privacy_text')}</p>
                  <span className={styles.bandLink}>
                    {t('privacy_link')}
                    <LucideIcon iconClass="fa-solid fa-arrow-right" aria-hidden="true" />
                  </span>
                </div>
              </Link>

              <a
                href={`mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(t('careers_email_subject'))}`}
                className={styles.bandCard}
              >
                <span className={styles.bandIcon} aria-hidden="true">
                  <LucideIcon iconClass="fa-solid fa-briefcase" />
                </span>
                <div className={styles.bandBody}>
                  <span className={styles.bandLabel}>{t('careers_label')}</span>
                  <h3 className={styles.bandTitle}>{t('careers_title')}</h3>
                  <p className={styles.bandText}>{t('careers_text')}</p>
                  <span className={styles.bandLink}>
                    {t('careers_link')}
                    <LucideIcon iconClass="fa-solid fa-arrow-right" aria-hidden="true" />
                  </span>
                </div>
              </a>
            </div>
          </div>
        </Reveal>

        {/* 12 ─── CTA ──────────────────────────────────────────── */}
        <Reveal as="section" className={styles.cta} aria-labelledby="about-cta-title">
          <div className="container">
            <div className={styles.ctaCard}>
              <div>
                <h2 id="about-cta-title" className={styles.ctaTitle}>{t('cta_title')}</h2>
                <p className={styles.ctaText}>{t('cta_text')}</p>
              </div>
              <div className={styles.ctaActions}>
                <a
                  href={whatsappHref}
                  className={styles.btnPrimary}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LucideIcon iconClass="fa-solid fa-comment-dots" aria-hidden="true" />
                  {t('cta_primary')}
                </a>
                <Link href={`/${locale}/contact-us`} className={styles.btnOutlineLight}>
                  {t('cta_secondary')}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </main>

      <Script
        id="about-organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: renderJsonLd({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            inLanguage: isArabic ? 'ar-EG' : 'en-US',
            name: t('title'),
            mainEntity: {
              '@type': 'MedicalOrganization',
              // Must match orgId() in jsonld.ts exactly (note the slash before
              // the hash) so this resolves to the SAME entity node emitted
              // site-wide, instead of forking a second Organization in the graph.
              '@id': `${baseUrl}/#organization`,
              name: 'Anees Health',
              description: t('founders_search_statement'),
              url: `${baseUrl}/${locale}`,
              areaServed: {
                '@type': 'AdministrativeArea',
                name: isArabic ? 'القاهرة الكبرى' : 'Greater Cairo',
              },
              founder: [
                {
                  '@type': 'Person',
                  '@id': `${founder1Url}#person`,
                  name: t('founder_1_name'),
                  url: founder1Url,
                  description: t('founder_1_credentials'),
                  jobTitle: isArabic ? 'مؤسس مشارك' : 'Co-Founder',
                },
                {
                  '@type': 'Person',
                  '@id': `${founder2Url}#person`,
                  name: t('founder_2_name'),
                  url: founder2Url,
                  description: t('founder_2_credentials'),
                  jobTitle: isArabic ? 'مؤسس مشارك' : 'Co-Founder',
                },
              ],
              // sameAs is for the ORG's own canonical profiles (social), not the
              // founders — the founders are already linked via `founder[]` above.
              sameAs: [...site.sameAs],
            },
          }),
        }}
      />

      <Footer />
    </>
  );
}
