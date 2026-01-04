import { useLocale, useTranslations } from 'next-intl';
import Script from 'next/script';
import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { generateAboutMetadata } from '@/lib/utils/metadata';
import {
  generateBreadcrumbSchema,
  generateArticleSchema,
  renderJsonLd,
} from '@/lib/utils/structured-data';
import { config } from '@/lib/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return generateAboutMetadata(locale);
}

export default function AboutUsPage() {
  const t = useTranslations('aboutPage');
  const common = useTranslations('common');
  const locale = useLocale();
  const baseUrl = config.api.baseUrl;

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
      description: t('headline'),
      datePublished: '2024-01-01',
      author: 'Anees Health',
    },
    locale,
    `${baseUrl}/${locale}/about-us`
  );

  return (
    <>
      {/* Structured Data */}
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

      {/* About Us */}
      <section className="about-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 col-md-12">
              <div className="section-inner-header about-inner-header">
                <h6>{t('about_company_label')}</h6>
                <h2>{t('headline')}</h2>
              </div>
              <div className="about-content">
                <div className="about-content-details">
                  <p>{t('paragraph_1')}</p>
                  <p>{t('paragraph_2')}</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6 col-md-12">
              <div className="about-img-info">
                <div className="row">
                  <div className="col-md-6">
                    <div className="about-inner-img">
                      <div className="about-img">
                        <img src="/assets/img/about-img1.png" className="img-fluid" alt="Home healthcare service" />
                      </div>
                      <div className="about-img">
                        <img src="/assets/img/about-img2.png" className="img-fluid" alt="Telemedicine consultation" />
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="about-inner-img">
                      <div className="about-box">
                        <h4>{t('years_experience')}</h4>
                      </div>
                      <div className="about-img">
                        <img src="/assets/img/about-img3.png" className="img-fluid" alt="Experienced care providers" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-choose-section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="section-inner-header text-center">
                <h2>{t('why_title')}</h2>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card why-choose-card w-100">
                <div className="card-body">
                  <div className="why-choose-icon"><span><img src="/assets/img/icons/choose-01.svg" alt="Experienced professionals" /></span></div>
                  <div className="why-choose-content">
                    <h4>{t('why_item_1_title')}</h4>
                    <p>{t('why_item_1_text')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card why-choose-card w-100">
                <div className="card-body">
                  <div className="why-choose-icon"><span><img src="/assets/img/icons/choose-02.svg" alt="Available 24/7" /></span></div>
                  <div className="why-choose-content">
                    <h4>{t('why_item_2_title')}</h4>
                    <p>{t('why_item_2_text')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card why-choose-card w-100">
                <div className="card-body">
                  <div className="why-choose-icon"><span><img src="/assets/img/icons/choose-03.svg" alt="Quality assurance" /></span></div>
                  <div className="why-choose-content">
                    <h4>{t('why_item_3_title')}</h4>
                    <p>{t('why_item_3_text')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card why-choose-card w-100">
                <div className="card-body">
                  <div className="why-choose-icon"><span><img src="/assets/img/icons/choose-04.svg" alt="Compassionate nursing" /></span></div>
                  <div className="why-choose-content">
                    <h4>{t('why_item_4_title')}</h4>
                    <p>{t('why_item_4_text')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="way-section">
        <div className="container">
          <div className="way-bg">
            <div className="row align-items-end">
              <div className="col-lg-7 col-md-12">
                <div className="section-inner-header way-inner-header mb-0">
                  <h2>{t('cta_title')}</h2>
                  <p>{t('cta_text')}</p>
                  <a href={`/${locale}`} className="btn btn-primary">
                    {t('cta_button')}
                  </a>
                </div>
              </div>
              <div className="col-lg-5 col-md-12">
                <div className="way-img">
                  <img src="/assets/img/way-img.png" className="img-fluid" alt="Get in touch with Anees" />
                </div>
              </div>
            </div>
            {/* Decorative shapes */}
            <div className="way-shapes-img">
              <div className="way-shapes-left">
                <img src="/assets/img/shape-06.png" alt="shape" />
              </div>
              <div className="way-shapes-right">
                <img src="/assets/img/shape-07.png" alt="shape" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
