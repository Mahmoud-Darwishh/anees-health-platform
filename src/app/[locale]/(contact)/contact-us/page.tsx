import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { generateContactMetadata } from '@/lib/utils/metadata';
import { generateContactPageSchema, renderJsonLd } from '@/lib/utils/structured-data';

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

  // Generate ContactPage schema
  const contactPageSchema = generateContactPageSchema(locale);

  return (
    <>
      {/* Structured Data - ContactPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(contactPageSchema) }}
      />
      <Header />

      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      {/* Contact Us */}
      <section className="contact-section">
        <div className="container">
          <div className="row">
            {/* Left: Contact info cards */}
            <div className="col-lg-5 col-md-12">
              <div className="section-inner-header contact-inner-header">
                <h6>{t('get_in_touch_label')}</h6>
                <h2>{t('have_question_title')}</h2>
              </div>

              <div className="card contact-card">
                <div className="card-body">
                  <div className="contact-icon" aria-hidden="true">
                    <i className="isax isax-location5" />
                  </div>
                  <div className="contact-details">
                    <h4>{t('address_label')}</h4>
                    <p>{t('address_text')}</p>
                  </div>
                </div>
              </div>

              <div className="card contact-card">
                <div className="card-body">
                  <div className="contact-icon" aria-hidden="true">
                    <i className="isax isax-call5" />
                  </div>
                  <div className="contact-details">
                    <h4>{t('phone_label')}</h4>
                    <p>{t('phone_text')}</p>
                  </div>
                </div>
              </div>

              <div className="card contact-card">
                <div className="card-body">
                  <div className="contact-icon" aria-hidden="true">
                    <i className="isax isax-sms5" />
                  </div>
                  <div className="contact-details">
                    <h4>{t('email_label')}</h4>
                    <p>{t('email_text')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact form */}
            <div className="col-lg-7 col-md-12 d-flex">
              <div className="card contact-form-card w-100">
                <div className="card-body">
                  <form action="#" aria-label={t('form_aria')}>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="name">{t('form_name')}</label>
                          <input id="name" name="name" type="text" className="form-control" required />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="email">{t('form_email')}</label>
                          <input id="email" name="email" type="email" className="form-control" required />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="phone">{t('form_phone')}</label>
                          <input id="phone" name="phone" type="tel" className="form-control" />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="services">{t('form_services')}</label>
                          <input id="services" name="services" type="text" className="form-control" />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="message">{t('form_message')}</label>
                          <textarea id="message" name="message" className="form-control" rows={6}></textarea>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="form-group-btn mb-0">
                          <button type="submit" className="btn btn-primary">{t('form_submit')}</button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Map */}
      {/*}
      <div className="contact-map d-flex">
        <iframe
          src="https://www.google.com/maps/d/embed?mid=1zgHh2F2O08UqVqWdsxbPUi5CHKqlHjw&ehbc=2E312F&noprof=1"
          width="640"
          height="480"
          style={{ border: 0, width: '100%', maxWidth: '100%' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={t('map_title')}
        />
      </div> */}

      <Footer />
    </>
  );
}
