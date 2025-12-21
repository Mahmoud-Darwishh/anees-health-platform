import { useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  
  return {
    title: t('privacy.title'),
    description: t('privacy.intro_description'),
  };
}

export default function PrivacyPolicyPage() {
  const t = useTranslations('privacy');
  const common = useTranslations('common');
  const locale = useLocale();

  const breadcrumbItems = [
    { label: common('home'), href: `/${locale}` },
    { label: t('title'), active: true },
  ];

  return (
    <>
      <Header />

      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      {/* Privacy Policy */}
      <section className="terms-section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="terms-content pb-0 list-spaced">
                <div className="terms-text">
                  <h6>{t('intro_title')}</h6>
                  <p>{t('intro_paragraph_1')}</p>
                  <p>{t('intro_paragraph_2')}</p>
                  <p className="text-muted small">
                    <strong>{t('last_updated_label')}</strong> {t('last_updated_date')}
                  </p>
                </div>

                <div className="terms-text">
                  <h6>{t('section_1_title')}</h6>
                  
                  <h6 className="h6 mt-3">{t('section_1_1_title')}</h6>
                  <ul>
                    <li>{t('section_1_1_item_1')}</li>
                    <li>{t('section_1_1_item_2')}</li>
                    <li>{t('section_1_1_item_3')}</li>
                    <li>{t('section_1_1_item_4')}</li>
                  </ul>

                  <h6 className="h6 mt-3">{t('section_1_2_title')}</h6>
                  <ul>
                    <li>{t('section_1_2_item_1')}</li>
                    <li>{t('section_1_2_item_2')}</li>
                    <li>{t('section_1_2_item_3')}</li>
                    <li>{t('section_1_2_item_4')}</li>
                    <li>{t('section_1_2_item_5')}</li>
                  </ul>

                  <h6 className="h6 mt-3">{t('section_1_3_title')}</h6>
                  <ul>
                    <li>{t('section_1_3_item_1')}</li>
                    <li>{t('section_1_3_item_2')}</li>
                    <li>{t('section_1_3_item_3')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_2_title')}</h6>
                  <p>{t('section_2_intro')}</p>
                  <ul>
                    <li><strong>{t('section_2_item_1_title')}</strong> {t('section_2_item_1_text')}</li>
                    <li><strong>{t('section_2_item_2_title')}</strong> {t('section_2_item_2_text')}</li>
                    <li><strong>{t('section_2_item_3_title')}</strong> {t('section_2_item_3_text')}</li>
                    <li><strong>{t('section_2_item_4_title')}</strong> {t('section_2_item_4_text')}</li>
                    <li><strong>{t('section_2_item_5_title')}</strong> {t('section_2_item_5_text')}</li>
                    <li><strong>{t('section_2_item_6_title')}</strong> {t('section_2_item_6_text')}</li>
                    <li><strong>{t('section_2_item_7_title')}</strong> {t('section_2_item_7_text')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_3_title')}</h6>
                  <p>{t('section_3_intro')}</p>
                  <ul>
                    <li><strong>{t('section_3_item_1_title')}</strong> {t('section_3_item_1_text')}</li>
                    <li><strong>{t('section_3_item_2_title')}</strong> {t('section_3_item_2_text')}</li>
                    <li><strong>{t('section_3_item_3_title')}</strong> {t('section_3_item_3_text')}</li>
                    <li><strong>{t('section_3_item_4_title')}</strong> {t('section_3_item_4_text')}</li>
                    <li><strong>{t('section_3_item_5_title')}</strong> {t('section_3_item_5_text')}</li>
                    <li><strong>{t('section_3_item_6_title')}</strong> {t('section_3_item_6_text')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_4_title')}</h6>
                  <p>{t('section_4_intro')}</p>
                  <ul>
                    <li><strong>{t('section_4_item_1_title')}</strong> {t('section_4_item_1_text')}</li>
                    <li><strong>{t('section_4_item_2_title')}</strong> {t('section_4_item_2_text')}</li>
                    <li><strong>{t('section_4_item_3_title')}</strong> {t('section_4_item_3_text')}</li>
                    <li><strong>{t('section_4_item_4_title')}</strong> {t('section_4_item_4_text')}</li>
                    <li><strong>{t('section_4_item_5_title')}</strong> {t('section_4_item_5_text')}</li>
                    <li><strong>{t('section_4_item_6_title')}</strong> {t('section_4_item_6_text')}</li>
                  </ul>
                  <p className="mt-2"><strong>{t('section_4_never_sell')}</strong></p>
                </div>

                <div className="terms-text">
                  <h6>{t('section_5_title')}</h6>
                  <p>{t('section_5_intro')}</p>
                  <ul>
                    <li><strong>{t('section_5_item_1_title')}</strong> {t('section_5_item_1_text')}</li>
                    <li><strong>{t('section_5_item_2_title')}</strong> {t('section_5_item_2_text')}</li>
                    <li><strong>{t('section_5_item_3_title')}</strong> {t('section_5_item_3_text')}</li>
                    <li><strong>{t('section_5_item_4_title')}</strong> {t('section_5_item_4_text')}</li>
                    <li><strong>{t('section_5_item_5_title')}</strong> {t('section_5_item_5_text')}</li>
                    <li><strong>{t('section_5_item_6_title')}</strong> {t('section_5_item_6_text')}</li>
                    <li><strong>{t('section_5_item_7_title')}</strong> {t('section_5_item_7_text')}</li>
                  </ul>
                  <p className="mt-2">{t('section_5_contact_text')} <strong>{t('contact_email')}</strong></p>
                </div>

                <div className="terms-text">
                  <h6>{t('section_6_title')}</h6>
                  <p>{t('section_6_intro')}</p>
                  <ul>
                    <li><strong>{t('section_6_item_1_title')}</strong> {t('section_6_item_1_text')}</li>
                    <li><strong>{t('section_6_item_2_title')}</strong> {t('section_6_item_2_text')}</li>
                    <li><strong>{t('section_6_item_3_title')}</strong> {t('section_6_item_3_text')}</li>
                    <li><strong>{t('section_6_item_4_title')}</strong> {t('section_6_item_4_text')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_7_title')}</h6>
                  <p>{t('section_7_intro')}</p>
                </div>

                <div className="terms-text">
                  <h6>{t('section_8_title')}</h6>
                  <p>{t('section_8_intro')}</p>
                  <ul>
                    <li>{t('section_8_item_1')}</li>
                    <li>{t('section_8_item_2')}</li>
                    <li>{t('section_8_item_3')}</li>
                    <li>{t('section_8_item_4')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_9_title')}</h6>
                  <p>{t('section_9_intro')}</p>
                  <ul>
                    <li>{t('section_9_item_1')}</li>
                    <li>{t('section_9_item_2')}</li>
                    <li>{t('section_9_item_3')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_10_title')}</h6>
                  <p>{t('section_10_intro')}</p>
                </div>

                <div className="terms-text">
                  <h6>{t('section_11_title')}</h6>
                  <p>{t('section_11_intro')}</p>
                  <ul className="list-unstyled">
                    <li><strong>{t('contact_email_label')}</strong> {t('contact_email')}</li>
                    <li><strong>{t('contact_phone_label')}</strong> {t('contact_phone')}</li>
                    <li><strong>{t('contact_address_label')}</strong> {t('contact_address')}</li>
                    <li><strong>{t('contact_dpo_label')}</strong> {t('contact_dpo')}</li>
                  </ul>
                </div>

                <div className="terms-text">
                  <h6>{t('section_12_title')}</h6>
                  <p>{t('section_12_intro')}</p>
                  <ul>
                    <li>{t('section_12_item_1')}</li>
                    <li>{t('section_12_item_2')}</li>
                    <li>{t('section_12_item_3')}</li>
                    <li>{t('section_12_item_4')}</li>
                    <li>{t('section_12_item_5')}</li>
                    <li>{t('section_12_item_6')}</li>
                  </ul>
                </div>

                <div className="alert alert-info mt-4" role="alert">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>{t('important_label')}</strong> {t('important_text')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* /Privacy Policy */}

      <Footer />
    </>
  );
}
