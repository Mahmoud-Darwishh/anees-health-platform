import { useLocale, useTranslations } from 'next-intl';
import Script from 'next/script';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { Reveal } from '@/components/common/Reveal';
import { generateAboutMetadata } from '@/lib/utils/metadata';
import { generateDoctorSlug } from '@/lib/utils/slug';
import {
  generateBreadcrumbSchema,
  generateArticleSchema,
  renderJsonLd,
} from '@/lib/utils/structured-data';
import { config } from '@/lib/config';
import styles from './about-us.module.scss';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return generateAboutMetadata(locale);
}

export default function AboutUsPage() {
  const t = useTranslations('aboutPage');
  const common = useTranslations('common');
  const locale = useLocale();
  const baseUrl = config.api.baseUrl;
  const isArabic = locale === 'ar';
  const founder1Slug = generateDoctorSlug('Dr. Mahmoud Darwish');
  const founder2Slug = generateDoctorSlug('Dr. Ahmed Oraby');
  const founder1Url = `${baseUrl}/en/doctors/${founder1Slug}`;
  const founder2Url = `${baseUrl}/en/doctors/${founder2Slug}`;

  const pillars = [
    { title: t('pillar_1_title'), text: t('pillar_1_text') },
    { title: t('pillar_2_title'), text: t('pillar_2_text') },
    { title: t('pillar_3_title'), text: t('pillar_3_text') },
    { title: t('pillar_4_title'), text: t('pillar_4_text') },
  ];

  const stats = [
    { value: t('stat_1_value'), label: t('stat_1_label') },
    { value: t('stat_2_value'), label: t('stat_2_label') },
    { value: t('stat_3_value'), label: t('stat_3_label') },
    { value: t('stat_4_value'), label: t('stat_4_label') },
  ];

  const breadcrumbItems = [
    { label: common('home'), href: `/${locale}` },
    { label: t('title'), active: true },
  ];

  // Structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: locale === 'ar' ? 'الرئيسية' : 'Home', url: `${baseUrl}/${locale}` },
    { name: t('title'), url: `${baseUrl}/${locale}/about-us` },
  ]);

  const articleSchema = generateArticleSchema(
    {
      title: t('title'),
      description: t('hero_subtitle'),
      datePublished: '2024-01-01',
      author: 'Anees Health',
    },
    locale,
    `${baseUrl}/${locale}/about-us`
  );

  return (
    <>
      <Script
        id="about-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbSchema) }}
      />
      <Script
        id="about-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(articleSchema) }}
      />

      <Header />

      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      <div className={styles.aboutPage}>
        <Reveal as="section" className={styles.heroSection}>
          <div className="container">
            <div className="row align-items-center g-4">
              <div className="col-lg-7">
                <span className={styles.heroBadge}>{t('hero_badge')}</span>
                <h1 className={styles.heroTitle}>{t('hero_title')}</h1>
                <p className={styles.heroSubtitle}>{t('hero_subtitle')}</p>

                <div className={styles.foundedByCard}>
                  <p className={styles.foundedLabel}>{t('founded_label')}</p>
                  <p className={styles.foundedValue}>{t('founded_value')}</p>
                </div>

                <div className="d-flex flex-wrap gap-2">
                  <span className={styles.heroPill}>{t('hero_pill_1')}</span>
                  <span className={styles.heroPill}>{t('hero_pill_2')}</span>
                  <span className={styles.heroPill}>{t('hero_pill_3')}</span>
                  <span className={styles.heroPill}>{t('hero_pill_4')}</span>
                </div>

                <div className={styles.trustScoreWrap} aria-label={t('trust_aria')}>
                  <span className={styles.trustStars} aria-hidden="true">★★★★☆</span>
                  <span className={styles.trustValue}>{t('trust_value')}</span>
                  <span className={styles.trustDivider}>|</span>
                  <span className={styles.trustText}>{t('trust_text')}</span>
                </div>
              </div>

              <div className="col-lg-5">
                <div className={styles.heroMedia}>
                  <div className={styles.imageStack}>
                    <img
                      src="/assets/img/about-img1.png"
                      alt={t('hero_img_1_alt')}
                      className={styles.heroImagePrimary}
                    />
                    <img
                      src="/assets/img/about-img2.png"
                      alt={t('hero_img_2_alt')}
                      className={styles.heroImageSecondary}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className={styles.storySection}>
          <div className="container">
            <div className="row g-4 align-items-stretch">
              <div className="col-lg-7">
                <article className={styles.storyCard}>
                  <h2>{t('story_title')}</h2>
                  <p>{t('story_paragraph_1')}</p>
                  <p>{t('story_paragraph_2')}</p>
                </article>
              </div>
              <div className="col-lg-5">
                <div className={styles.missionVisionWrap}>
                  <article className={styles.focusCard}>
                    <h3>{t('mission_title')}</h3>
                    <p>{t('mission_text')}</p>
                  </article>
                  <article className={styles.focusCard}>
                    <h3>{t('vision_title')}</h3>
                    <p>{t('vision_text')}</p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className={styles.leadershipSection}>
          <div className="container">
            <article className={styles.leadershipCard}>
              <div>
                <h2>{t('founders_title')}</h2>
                <p>{t('founders_subtitle')}</p>
                <p className={styles.leadershipSearchCopy}>{t('founders_search_statement')}</p>
              </div>
              <p className={styles.leadershipNames}>
                <Link href={`/${locale}/doctors/${founder1Slug}`} className={styles.founderLink}>
                  {t('founder_1_name')}
                </Link>
                <span className={styles.namesDivider} aria-hidden="true">•</span>
                <Link href={`/${locale}/doctors/${founder2Slug}`} className={styles.founderLink}>
                  {t('founder_2_name')}
                </Link>
              </p>
            </article>
          </div>
        </Reveal>

        <Reveal as="section" className={styles.pillarsSection}>
          <div className="container">
            <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
              <h2 className={styles.sectionTitle}>{t('pillars_title')}</h2>
              <span className={styles.sectionTag}>{t('pillars_tag')}</span>
            </div>
            <div className="row g-4">
              {pillars.map((pillar) => (
                <div className="col-lg-3 col-md-6" key={pillar.title}>
                  <article className={styles.pillarCard}>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.text}</p>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className={styles.statsSection}>
          <div className="container">
            <div className="row g-3">
              {stats.map((stat) => (
                <div className="col-lg-3 col-md-6" key={stat.label}>
                  <div className={styles.statCard}>
                    <h3>{stat.value}</h3>
                    <p>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className={styles.ctaSection}>
          <div className="container">
            <div className={styles.ctaCard}>
              <div>
                <h2>{t('cta_title')}</h2>
                <p>{t('cta_text')}</p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link href={`/${locale}/booking`} className={`btn btn-primary ${styles.ctaBtn}`}>
                  {t('cta_primary')}
                </Link>
                <Link href={`/${locale}/contact-us`} className={`btn btn-outline-primary ${styles.ctaBtnSecondary}`}>
                  {t('cta_secondary')}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

      </div>

      <Script
        id="about-founders-note"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: renderJsonLd({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            inLanguage: isArabic ? 'ar-EG' : 'en-US',
            name: t('title'),
            mainEntity: {
              '@type': 'Organization',
              '@id': `${baseUrl}#organization`,
              name: 'Anees Health',
              description: t('founders_search_statement'),
              url: `${baseUrl}/${locale}`,
              founder: [
                {
                  '@type': 'Person',
                  '@id': `${founder1Url}#person`,
                  name: t('founder_1_name'),
                  url: founder1Url,
                  description: t('founders_search_statement'),
                  jobTitle: isArabic ? 'مؤسس مشارك' : 'Co-Founder',
                },
                {
                  '@type': 'Person',
                  '@id': `${founder2Url}#person`,
                  name: t('founder_2_name'),
                  url: founder2Url,
                  description: t('founders_search_statement'),
                  jobTitle: isArabic ? 'مؤسس مشارك' : 'Co-Founder',
                },
              ],
              sameAs: [founder1Url, founder2Url],
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: t('trust_value'),
                bestRating: '5',
                ratingCount: '1500',
              },
            },
          }),
        }}
      />

      <Footer />
    </>
  );
}
