/**
 * Pricing overview — /[locale]/pricing
 *
 * Package-based pricing. Offerings + tiers come from `@/lib/seo/pricing`
 * (owner-filled); offerings with no published tier show "request a quote"
 * rather than an invented figure. Emits AggregateOffer (when any price is set)
 * + FAQ + WebPage.
 */
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import ContentHero from '@/components/common/content/ContentHero';
import { buildPricingMetadata } from '@/lib/seo/metadata';
import { faqPageSchema, webPageSchema, breadcrumbSchema, aggregateOfferSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { bookingFaqs } from '@/lib/seo/faqs';
import { getAllPackages, allTierPricesEgp, type PriceTier } from '@/lib/seo/pricing';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPricingMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const packages = getAllPackages(locale);

  const num = (n: number) => n.toLocaleString('en-US');
  const tierPrice = (t: PriceTier) =>
    t.toEgp
      ? isAr
        ? `${num(t.fromEgp)}–${num(t.toEgp)} ج.م`
        : `EGP ${num(t.fromEgp)}–${num(t.toEgp)}`
      : isAr
        ? `من ${num(t.fromEgp)} ج.م`
        : `from EGP ${num(t.fromEgp)}`;
  const quote = isAr ? 'يُحدَّد قبل الحجز' : 'Confirmed before booking';

  const heroLead = isAr
    ? 'تعمل أنيس هيلث بأسعار شفافة: يظهر سعر كل خدمة أو باقة بوضوح قبل تأكيد الحجز، بلا رسوم مفاجئة عند الزيارة. تعتمد التكلفة على نوع الرعاية ومدتها والمنطقة.'
    : 'Anees Health works on transparent pricing: the price of every service and package is shown clearly before you confirm — no surprise fees at the door. Cost depends on the type of care, its duration, and the area.';

  // AggregateOffer — emitted only once at least one tier price is published.
  // Built via the shared aggregateOfferSchema builder so the schema and the
  // visible price table can't drift (returns null when no price is set).
  const offerSchema = aggregateOfferSchema(locale, allTierPricesEgp());

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: isAr ? 'الأسعار' : 'Pricing', url: `${site.baseUrl}/${locale}/pricing` },
  ];

  const faq = faqPageSchema(bookingFaqs[locale]);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/pricing`,
    name: isAr ? 'أسعار الرعاية الصحية المنزلية' : 'Home healthcare pricing',
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      {offerSchema && (
        <Script
          id="pricing-aggregateoffer-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(offerSchema) }}
        />
      )}
      <Script id="pricing-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="pricing-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="pricing-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: isAr ? 'الأسعار' : 'Pricing', active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={isAr ? 'أسعار شفافة' : 'Transparent pricing'}
          title={isAr ? 'أسعار الرعاية الصحية المنزلية في مصر' : 'Home Healthcare Prices in Egypt'}
          lead={heroLead}
        />

        <section className="pt-5 pb-0">
          <div className="container">
            <p className="lead mb-0">
              {isAr
                ? 'تُسعَّر الرعاية الصحية المنزلية في مصر مع أنيس هيلث بشفافية: ترى السعر الدقيق لكل خدمة أو باقة قبل تأكيد الحجز، بلا رسوم مفاجئة عند الباب. تتوفر الرعاية المستمرة كباقات شهرية وسنوية، وتُسعَّر زيارات الطبيب والتمريض والعلاج الطبيعي والتحاليل المنفردة بالزيارة. وتعتمد التكلفة على نوع الرعاية ومدتها والمنطقة.'
                : 'Home healthcare in Egypt with Anees Health is priced transparently: you see the exact price of every service or package before you confirm the booking, with no surprise fees at the door. Ongoing care is available as monthly and annual packages, while one-off doctor, nursing, physiotherapy, and lab visits are priced per visit. Cost depends on the type of care, its duration, and the area.'}
            </p>
          </div>
        </section>

        <section className="pt-5 pb-4">
          <div className="container">
            <h2 className="h4 mb-3">{isAr ? 'الباقات والخدمات' : 'Packages & services'}</h2>
            <div className="row g-4">
              {packages.map((pkg) => (
                <div key={pkg.slug} className="col-12 col-md-6">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <h3 className="h5 mb-2">{pkg.name}</h3>
                      <p className="text-muted">{pkg.description}</p>
                      {pkg.tiers.length > 0 ? (
                        <ul className="list-unstyled mb-3">
                          {pkg.tiers.map((t, i) => (
                            <li key={i} className="d-flex justify-content-between border-bottom py-2">
                              <span>{t.label}</span>
                              <span className="fw-semibold">{tierPrice(t)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted mb-3">{quote}</p>
                      )}
                      {pkg.serviceSlug ? (
                        <Link href={`/${locale}/services/${pkg.serviceSlug}`}>
                          {isAr ? 'تفاصيل الخدمة' : 'Service details'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted small mb-0 mt-3">
              {isAr
                ? 'الأسعار إرشادية وتبدأ من القيم الموضّحة؛ يظهر السعر النهائي دائماً قبل تأكيد الحجز.'
                : 'Prices are indicative and start from the values shown; the final price is always confirmed before you book.'}
            </p>
          </div>
        </section>

        <section className="pb-2">
          <div className="container">
            <h2 className="h4 mb-3">{isAr ? 'كيف تعمل أسعار أنيس' : 'How Anees pricing works'}</h2>
            <ul>
              <li>{isAr ? 'السعر يظهر بالكامل قبل تأكيد الحجز — بلا رسوم مفاجئة عند الزيارة.' : 'The full price is shown before you confirm — no surprise fees at the door.'}</li>
              <li>{isAr ? 'تتوفر باقات شهرية وسنوية للرعاية المستمرة، إضافة إلى زيارات مفردة.' : 'Monthly and annual packages are available for ongoing care, alongside one-off visits.'}</li>
              <li>{isAr ? 'تعتمد التكلفة على نوع الرعاية ومدتها والمنطقة وموعد الزيارة.' : 'Cost depends on the type of care, its duration, the area, and the time of the visit.'}</li>
              <li>{isAr ? 'قد تُضاف رسوم انتقال بسيطة للعناوين خارج النطاق، وتُوضَّح دائماً مسبقاً.' : 'A small travel surcharge may apply for out-of-zone addresses, always disclosed upfront.'}</li>
            </ul>
          </div>
        </section>

        <FaqSection
          heading={isAr ? 'أسئلة شائعة عن الأسعار والدفع' : 'Pricing & payment FAQ'}
          faqs={bookingFaqs[locale]}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/areas`, label: isAr ? 'مناطق التغطية' : 'Coverage areas' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
