import { useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    title: t('terms.title'),
    description: t('terms.intro_description', { default: t('terms.title') }),
  };
}

export default function TermsAndConditionsPage() {
  const t = useTranslations('terms');
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

      {/* Terms & Conditions */}
      <section className="terms-section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="terms-content pb-0 list-spaced">
                {/* Introduction */}
                <div className="terms-text">
                  <h6>{t('intro_title')}</h6>
                  <p>{t('intro_paragraph_1')}</p>
                  <p>{t('intro_paragraph_2')}</p>
                  <p className="text-muted small">
                    <strong>{t('effective_label')}</strong> {t('effective_date')}
                  </p>
                </div>

                {/* 1. Definitions */}
                <div className="terms-text">
                  <h6>{t('section_1_title')}</h6>
                  <ul>
                    <li>{t('section_1_item_1')}</li>
                    <li>{t('section_1_item_2')}</li>
                    <li>{t('section_1_item_3')}</li>
                    <li>{t('section_1_item_4')}</li>
                    <li>{t('section_1_item_5')}</li>
                  </ul>
                </div>

                {/* 2. Eligibility & Account Registration */}
                <div className="terms-text">
                  <h6>{t('section_2_title')}</h6>
                  <ul>
                    <li>{t('section_2_item_1')}</li>
                    <li>{t('section_2_item_2')}</li>
                    <li>{t('section_2_item_3')}</li>
                    <li>{t('section_2_item_4')}</li>
                    <li>{t('section_2_item_5')}</li>
                  </ul>
                </div>

                {/* 3. Services Provided */}
                <div className="terms-text">
                  <h6>{t('section_3_title')}</h6>
                  <h6 className="h6 mt-3">{t('section_3_1_title')}</h6>
                  <p>{t('section_3_1_intro')}</p>
                  <ul>
                    <li>{t('section_3_1_item_1')}</li>
                    <li>{t('section_3_1_item_2')}</li>
                    <li>{t('section_3_1_item_3')}</li>
                    <li>{t('section_3_1_item_4')}</li>
                    <li>{t('section_3_1_item_5')}</li>
                    <li>{t('section_3_1_item_6')}</li>
                    <li>{t('section_3_1_item_7')}</li>
                  </ul>

                  <h6 className="h6 mt-3">{t('section_3_2_title')}</h6>
                  <p>{t('section_3_2_intro')}</p>
                  <ul>
                    <li>{t('section_3_2_item_1')}</li>
                    <li>{t('section_3_2_item_2')}</li>
                    <li>{t('section_3_2_item_3')}</li>
                    <li>{t('section_3_2_item_4')}</li>
                    <li>{t('section_3_2_item_5')}</li>
                  </ul>
                  <p className="text-danger"><strong>{t('note_label')}</strong> {t('section_3_2_note')}</p>
                </div>

                {/* 4. Booking & Appointments */}
                <div className="terms-text">
                  <h6>{t('section_4_title')}</h6>
                  <ul>
                    <li>{t('section_4_item_1')}</li>
                    <li>{t('section_4_item_2')}</li>
                    <li>{t('section_4_item_3')}</li>
                    <li>
                      <strong>{t('section_4_item_4_title')}</strong>
                      <ul className="mt-2">
                        <li>{t('section_4_cancellation_item_1')}</li>
                        <li>{t('section_4_cancellation_item_2')}</li>
                        <li>{t('section_4_cancellation_item_3')}</li>
                      </ul>
                    </li>
                    <li>{t('section_4_item_5')}</li>
                    <li>{t('section_4_item_6')}</li>
                  </ul>
                </div>

                {/* 5. Payment & Fees */}
                <div className="terms-text">
                  <h6>{t('section_5_title')}</h6>
                  <ul>
                    <li>{t('section_5_item_1')}</li>
                    <li>{t('section_5_item_2')}</li>
                    <li>{t('section_5_item_3')}</li>
                    <li>
                      <strong>{t('section_5_item_4_title')}</strong>
                      <ul className="mt-2">
                        <li>{t('section_5_additional_item_1')}</li>
                        <li>{t('section_5_additional_item_2')}</li>
                        <li>{t('section_5_additional_item_3')}</li>
                        <li>{t('section_5_additional_item_4')}</li>
                      </ul>
                    </li>
                    <li>{t('section_5_item_5')}</li>
                    <li>{t('section_5_item_6')}</li>
                  </ul>
                </div>

                {/* 6. Healthcare Provider Qualifications */}
                <div className="terms-text">
                  <h6>{t('section_6_title')}</h6>
                  <p>{t('section_6_intro')}</p>
                  <ul>
                    <li>{t('section_6_item_1')}</li>
                    <li>{t('section_6_item_2')}</li>
                    <li>{t('section_6_item_3')}</li>
                    <li>{t('section_6_item_4')}</li>
                    <li>{t('section_6_item_5')}</li>
                  </ul>
                  <p className="mt-2"><strong>{t('section_6_provider_independence')}</strong></p>
                </div>

                {/* 7. Medical Disclaimer & Limitations */}
                <div className="terms-text">
                  <h6>{t('section_7_title')}</h6>
                  <ul>
                    <li>{t('section_7_item_1')}</li>
                    <li>{t('section_7_item_2')}</li>
                    <li>{t('section_7_item_3')}</li>
                    <li>{t('section_7_item_4')}</li>
                    <li>{t('section_7_item_5')}</li>
                    <li>{t('section_7_item_6')}</li>
                  </ul>
                </div>

                {/* 8. Liability & Indemnification */}
                <div className="terms-text">
                  <h6>{t('section_8_title')}</h6>
                  <ul>
                    <li>{t('section_8_item_1')}</li>
                    <li>{t('section_8_item_2')}</li>
                    <li>{t('section_8_item_3')}</li>
                    <li>
                      <strong>{t('section_8_item_4_title')}</strong>
                      <ul className="mt-2">
                        <li>{t('section_8_indemn_item_1')}</li>
                        <li>{t('section_8_indemn_item_2')}</li>
                        <li>{t('section_8_indemn_item_3')}</li>
                        <li>{t('section_8_indemn_item_4')}</li>
                      </ul>
                    </li>
                    <li>{t('section_8_item_5')}</li>
                  </ul>
                </div>

                {/* 9. Patient Rights & Responsibilities */}
                <div className="terms-text">
                  <h6>{t('section_9_title')}</h6>
                  <h6 className="h6 mt-3">{t('section_9_1_title')}</h6>
                  <ul>
                    <li>{t('section_9_1_item_1')}</li>
                    <li>{t('section_9_1_item_2')}</li>
                    <li>{t('section_9_1_item_3')}</li>
                    <li>{t('section_9_1_item_4')}</li>
                    <li>{t('section_9_1_item_5')}</li>
                    <li>{t('section_9_1_item_6')}</li>
                    <li>{t('section_9_1_item_7')}</li>
                  </ul>

                  <h6 className="h6 mt-3">{t('section_9_2_title')}</h6>
                  <ul>
                    <li>{t('section_9_2_item_1')}</li>
                    <li>{t('section_9_2_item_2')}</li>
                    <li>{t('section_9_2_item_3')}</li>
                    <li>{t('section_9_2_item_4')}</li>
                    <li>{t('section_9_2_item_5')}</li>
                    <li>{t('section_9_2_item_6')}</li>
                  </ul>
                </div>

                {/* 10. Intellectual Property */}
                <div className="terms-text">
                  <h6>{t('section_10_title')}</h6>
                  <ul>
                    <li>{t('section_10_item_1')}</li>
                    <li>{t('section_10_item_2')}</li>
                    <li>{t('section_10_item_3')}</li>
                    <li>{t('section_10_item_4')}</li>
                  </ul>
                </div>

                {/* 11. Data Privacy & Security */}
                <div className="terms-text">
                  <h6>{t('section_11_title')}</h6>
                  <p>
                    {t('section_11_intro_1')}{' '}
                    <a href={`/${locale}/privacy-policy`} className="text-primary">{t('privacy_link_label')}</a>{' '}
                    {t('section_11_intro_2')}
                  </p>
                  <ul>
                    <li>{t('section_11_item_1')}</li>
                    <li>{t('section_11_item_2')}</li>
                    <li>{t('section_11_item_3')}</li>
                    <li>{t('section_11_item_4')}</li>
                  </ul>
                </div>

                {/* 12. Complaints & Dispute Resolution */}
                <div className="terms-text">
                  <h6>{t('section_12_title')}</h6>
                  <ul>
                    <li>{t('section_12_item_1')}</li>
                    <li>{t('section_12_item_2')}</li>
                    <li>{t('section_12_item_3')}</li>
                    <li>{t('section_12_item_4')}</li>
                    <li>{t('section_12_item_5')}</li>
                    <li>{t('section_12_item_6')}</li>
                  </ul>
                </div>

                {/* 13. Prohibited Conduct */}
                <div className="terms-text">
                  <h6>{t('section_13_title')}</h6>
                  <p>{t('section_13_intro')}</p>
                  <ul>
                    <li>{t('section_13_item_1')}</li>
                    <li>{t('section_13_item_2')}</li>
                    <li>{t('section_13_item_3')}</li>
                    <li>{t('section_13_item_4')}</li>
                    <li>{t('section_13_item_5')}</li>
                    <li>{t('section_13_item_6')}</li>
                    <li>{t('section_13_item_7')}</li>
                  </ul>
                  <p className="mt-2 text-danger"><strong>{t('section_13_warning')}</strong></p>
                </div>

                {/* 14. Modifications to Terms */}
                <div className="terms-text">
                  <h6>{t('section_14_title')}</h6>
                  <p>{t('section_14_intro')}</p>
                </div>

                {/* 15. Service Availability */}
                <div className="terms-text">
                  <h6>{t('section_15_title')}</h6>
                  <ul>
                    <li>{t('section_15_item_1')}</li>
                    <li>{t('section_15_item_2')}</li>
                    <li>{t('section_15_item_3')}</li>
                    <li>{t('section_15_item_4')}</li>
                  </ul>
                </div>

                {/* 16. Contact Information */}
                <div className="terms-text">
                  <h6>{t('section_16_title')}</h6>
                  <p>{t('section_16_intro')}</p>
                  <ul className="list-unstyled">
                    <li><strong>{t('section_16_item_1_label')}</strong> {t('section_16_item_1')}</li>
                    <li><strong>{t('section_16_item_2_label')}</strong> {t('section_16_item_2')}</li>
                    <li><strong>{t('section_16_item_3_label')}</strong> {t('section_16_item_3')}</li>
                    <li><strong>{t('section_16_item_4_label')}</strong> {t('section_16_item_4')}</li>
                    <li><strong>{t('section_16_item_5_label')}</strong> {t('section_16_item_5')}</li>
                    <li><strong>{t('section_16_item_6_label')}</strong> {t('section_16_item_6')}</li>
                  </ul>
                </div>

                {/* 17. Regulatory Compliance */}
                <div className="terms-text">
                  <h6>{t('section_17_title')}</h6>
                  <p>{t('section_17_intro')}</p>
                  <ul>
                    <li>{t('section_17_item_1')}</li>
                    <li>{t('section_17_item_2')}</li>
                    <li>{t('section_17_item_3')}</li>
                    <li>{t('section_17_item_4')}</li>
                    <li>{t('section_17_item_5')}</li>
                    <li>{t('section_17_item_6')}</li>
                  </ul>
                </div>

                {/* Important notice */}
                <div className="alert alert-warning mt-4" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>{t('important_notice_label')}</strong> {t('important_notice_text')}
                </div>

                <div className="text-center mt-4">
                  <p className="text-muted small">
                    <strong>{t('document_version_label')}</strong> {t('document_version')} | <strong>{t('last_updated_label')}</strong> {t('last_updated_date')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* /Terms & Conditions */}

      <Footer />
    </>
  );
}
