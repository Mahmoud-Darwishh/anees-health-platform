import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { Reveal } from '@/components/common/Reveal';
import { buildContactMetadata } from '@/lib/seo/metadata';
import { contactPageSchema, renderJsonLd } from '@/lib/seo/jsonld';
import type { SupportedLocale } from '@/lib/seo/site';
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp';
import ContactForm from './contact-form';
import styles from './contact-us.module.scss';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildContactMetadata((locale === 'ar' ? 'ar' : 'en') as SupportedLocale);
}

export default function ContactUsPage() {
  const t = useTranslations('contactPage');
  const common = useTranslations('common');
  const locale = useLocale();

  const breadcrumbItems = [
    { label: common('home'), href: `/${locale}` },
    { label: t('title'), active: true },
  ];

  const loc = (locale === 'ar' ? 'ar' : 'en') as SupportedLocale;
  const contactLd = contactPageSchema(loc);

  const heroWhatsAppHref = buildWhatsAppUrl(t('hero_whatsapp_message'));
  const phoneRaw = t('phone_raw');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(contactLd) }}
      />
      <Header />

      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      {/* ─── 1. HERO ─────────────────────────────────────────────────── */}
      <Reveal as="section" className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>{t('hero_badge')}</span>
            <h1 className={styles.heroTitle}>{t('hero_title')}</h1>
            <p className={styles.heroSubtitle}>{t('hero_subtitle')}</p>

            <div className={styles.heroActions}>
              <a
                href={heroWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.heroCtaPrimary}
                aria-label={t('cta_whatsapp_aria')}
              >
                <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                <span>{t('cta_whatsapp')}</span>
              </a>
              <a
                href={`tel:${phoneRaw}`}
                className={styles.heroCtaCall}
                aria-label={t('cta_call_aria')}
              >
                <i className="isax isax-call-calling" aria-hidden="true" />
                <span>{t('cta_call')}</span>
              </a>
            </div>

            <p className={styles.heroResponseNote}>
              <i className="isax isax-tick-circle" aria-hidden="true" />
              {t('hero_response_note')}
            </p>
          </div>
        </div>
      </Reveal>

      {/* ─── 2. MAIN: INFO + FORM ────────────────────────────────────── */}
      <Reveal as="section" className={styles.main} aria-label={t('info_aria')}>
        <div className="container">
          <div className={styles.mainGrid}>
            {/* LEFT — Contact info stack */}
            <aside className={styles.infoStack}>
              <h2 className={styles.infoStackTitle}>{t('info_title')}</h2>

              <div className={styles.infoBlock}>
                <div className={styles.infoIcon} aria-hidden="true">
                  <i className="isax isax-location" />
                </div>
                <div className={styles.infoBody}>
                  <p className={styles.infoLabel}>{t('address_label')}</p>
                  <p className={styles.infoValue}>{t('address_text')}</p>
                </div>
              </div>

              <a
                href={`tel:${phoneRaw}`}
                className={`${styles.infoBlock} ${styles.infoBlockLink} ${styles.infoBlockPhone}`}
                aria-label={`${t('phone_label')}: ${t('phone_text')}`}
              >
                <div className={styles.infoIcon} aria-hidden="true">
                  <i className="isax isax-call-calling" />
                </div>
                <div className={styles.infoBody}>
                  <p className={styles.infoLabel}>{t('phone_label')}</p>
                  <p className={styles.infoValue}>{t('phone_text')}</p>
                </div>
              </a>

              <a
                href={`mailto:${t('email_text')}`}
                className={`${styles.infoBlock} ${styles.infoBlockLink}`}
                aria-label={`${t('email_label')}: ${t('email_text')}`}
              >
                <div className={styles.infoIcon} aria-hidden="true">
                  <i className="isax isax-message" />
                </div>
                <div className={styles.infoBody}>
                  <p className={styles.infoLabel}>{t('email_label')}</p>
                  <p className={styles.infoValue}>{t('email_text')}</p>
                </div>
              </a>

              <div className={styles.hours}>
                <h3 className={styles.hoursTitle}>
                  <i className="isax isax-clock" aria-hidden="true" />
                  <span>{t('hours_title')}</span>
                </h3>
                <div className={styles.hoursRow}>
                  <span className={styles.hoursDay}>{t('hours_weekdays_label')}</span>
                  <span className={styles.hoursTime}>{t('hours_weekdays_time')}</span>
                </div>
                <div className={styles.hoursRow}>
                  <span className={styles.hoursDay}>{t('hours_weekend_label')}</span>
                  <span className={styles.hoursTime}>{t('hours_weekend_time')}</span>
                </div>
              </div>
            </aside>

            {/* RIGHT — Form */}
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <span className={styles.formEyebrow}>{t('form_eyebrow')}</span>
                <h2 className={styles.formTitle}>{t('form_title')}</h2>
                <p className={styles.formSubtitle}>{t('form_subtitle')}</p>
              </div>
              <ContactForm />
            </div>
          </div>
        </div>
      </Reveal>

      <Footer />
    </>
  );
}
