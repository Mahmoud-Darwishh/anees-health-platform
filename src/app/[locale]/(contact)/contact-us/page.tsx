import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { Reveal } from '@/components/common/Reveal';
import { generateContactMetadata } from '@/lib/utils/metadata';
import { generateContactPageSchema, renderJsonLd } from '@/lib/utils/structured-data';
import styles from './contact-us.module.scss';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return generateContactMetadata(locale);
}

export default function ContactUsPage() {
  const t = useTranslations('contactPage');
  const common = useTranslations('common');
  const locale = useLocale();

  const breadcrumbItems = [
    { label: common('home'), href: `/${locale}` },
    { label: t('title'), active: true },
  ];

  const contactPageSchema = generateContactPageSchema(locale);
  const whatsappMessage = encodeURIComponent(t('whatsapp_message'));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(contactPageSchema) }}
      />
      <Header />

      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      {/* ── Main contact section ── */}
      <Reveal as="section" className={styles.section}>
        <div className="container">
          {/* Section header */}
          <div className={styles.header}>
            <span className={styles.badge}>{t('get_in_touch_label')}</span>
            <h1 className={styles.heading}>{t('have_question_title')}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>

          <div className="row g-4">
            {/* ── Left column: Info + Quick Access + Hours ── */}
            <div className="col-lg-5 col-md-12">
              {/* Contact info cards */}
              <div className={styles.infoCards}>
                {/* Address */}
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon} aria-hidden="true">
                    <i className="isax isax-location5" />
                  </div>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>{t('address_label')}</p>
                    <p className={styles.infoValue}>{t('address_text')}</p>
                  </div>
                </div>

                {/* Phone — clickable */}
                <a
                  href={`tel:${t('phone_raw')}`}
                  className={styles.infoCardLink}
                  aria-label={`${t('phone_label')}: ${t('phone_text')}`}
                >
                  <div className={styles.infoIcon} aria-hidden="true">
                    <i className="isax isax-call5" />
                  </div>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>{t('phone_label')}</p>
                    <p className={styles.infoValue}>{t('phone_text')}</p>
                  </div>
                </a>

                {/* Email — clickable */}
                <a
                  href={`mailto:${t('email_text')}`}
                  className={styles.infoCardLink}
                  aria-label={`${t('email_label')}: ${t('email_text')}`}
                >
                  <div className={styles.infoIcon} aria-hidden="true">
                    <i className="isax isax-sms5" />
                  </div>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>{t('email_label')}</p>
                    <p className={styles.infoValue}>{t('email_text')}</p>
                  </div>
                </a>
              </div>

              {/* Quick access buttons */}
              <div className={styles.quickAccess}>
                <a
                  href={`https://wa.me/201055164595?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsappBtn}
                  aria-label={t('whatsapp_aria')}
                >
                  <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                  {t('whatsapp_btn')}
                </a>
                <a
                  href={`tel:${t('phone_raw')}`}
                  className={styles.callBtn}
                  aria-label={t('call_aria')}
                >
                  <i className="isax isax-call-calling" aria-hidden="true" />
                  {t('call_btn')}
                </a>
              </div>

              {/* Working hours */}
              <div className={styles.hoursCard}>
                <h3 className={styles.hoursTitle}>
                  <i className="isax isax-clock" aria-hidden="true" />
                  {t('hours_title')}
                </h3>
                <div className={styles.hoursRow}>
                  <span className={styles.hoursDay}>{t('hours_weekdays')}</span>
                  <span className={styles.hoursTime}>{t('hours_weekdays_time')}</span>
                </div>
                <div className={styles.hoursRow}>
                  <span className={styles.hoursDay}>{t('hours_weekend')}</span>
                  <span className={styles.hoursTime}>{t('hours_weekend_time')}</span>
                </div>
              </div>
            </div>

            {/* ── Right column: Form ── */}
            <div className="col-lg-7 col-md-12">
              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>{t('form_heading')}</h2>
                <p className={styles.formSubtitle}>{t('form_description')}</p>

                <form aria-label={t('form_aria')}>
                  <div className={styles.formGrid}>
                    {/* Name */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="contact-name">
                        {t('form_name')} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        className={styles.formInput}
                        placeholder={t('form_name_placeholder')}
                        required
                        autoComplete="name"
                      />
                    </div>

                    {/* Email */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="contact-email">
                        {t('form_email')} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        className={styles.formInput}
                        placeholder={t('form_email_placeholder')}
                        required
                        autoComplete="email"
                      />
                    </div>

                    {/* Phone */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="contact-phone">
                        {t('form_phone')}
                      </label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        className={styles.formInput}
                        placeholder={t('form_phone_placeholder')}
                        autoComplete="tel"
                      />
                    </div>

                    {/* Service selector */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="contact-service">
                        {t('form_services')}
                      </label>
                      <select
                        id="contact-service"
                        name="service"
                        className={styles.formSelect}
                        defaultValue=""
                      >
                        <option value="" disabled>{t('form_services_placeholder')}</option>
                        <option value="doctor-visit">{t('form_service_doctor')}</option>
                        <option value="nursing">{t('form_service_nursing')}</option>
                        <option value="physiotherapy">{t('form_service_physio')}</option>
                        <option value="telemedicine">{t('form_service_tele')}</option>
                        <option value="lab">{t('form_service_lab')}</option>
                        <option value="elderly">{t('form_service_elderly')}</option>
                        <option value="other">{t('form_service_other')}</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div className={`${styles.formGroup} ${styles.fieldFull}`}>
                      <label className={styles.formLabel} htmlFor="contact-message">
                        {t('form_message')}
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        className={styles.formTextarea}
                        rows={5}
                        placeholder={t('form_message_placeholder')}
                      />
                    </div>

                    {/* Submit */}
                    <div className={styles.fieldFull}>
                      <button type="submit" className={styles.submitBtn}>
                        {t('form_submit')}
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Footer />
    </>
  );
}
