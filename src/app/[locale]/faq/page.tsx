/**
 * FAQ hub — /[locale]/faq
 *
 * Consolidates the bilingual FAQ catalog (`@/lib/seo/faqs`) into one indexable,
 * answer-engine-friendly destination grouped by theme. Emits FAQPage + WebPage
 * + Breadcrumb JSON-LD (the visible Q&A and the schema come from one source).
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import ContentHero from '@/components/common/content/ContentHero';
import { buildFaqMetadata } from '@/lib/seo/metadata';
import { faqPageSchema, webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { homeFaqs, servicesFaqs, bookingFaqs, coverageFaqs } from '@/lib/seo/faqs';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildFaqMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const groups = [
    { id: 'about', heading: isAr ? 'عن أنيس هيلث' : 'About Anees Health', faqs: homeFaqs[locale] },
    { id: 'services', heading: isAr ? 'الخدمات المنزلية' : 'Home healthcare services', faqs: servicesFaqs[locale] },
    { id: 'booking', heading: isAr ? 'الحجز والدفع' : 'Booking & payment', faqs: bookingFaqs[locale] },
    { id: 'coverage', heading: isAr ? 'مناطق التغطية' : 'Coverage areas', faqs: coverageFaqs[locale] },
  ];
  const allFaqs = groups.flatMap((g) => g.faqs);

  const faqLabel = isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions';
  const heroLead = isAr
    ? 'إجابات واضحة عن أكثر الأسئلة شيوعاً حول الرعاية الصحية المنزلية في مصر مع أنيس هيلث — الخدمات والأسعار والتغطية والتراخيص والحجز والدفع.'
    : 'Clear answers to the most common questions about home healthcare in Egypt with Anees Health — services, pricing, coverage, clinician licensing, booking, and payment.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: faqLabel, url: `${site.baseUrl}/${locale}/faq` },
  ];

  const faq = faqPageSchema(allFaqs);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/faq`,
    name: faqLabel,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="faq-page-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="faq-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="faq-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: faqLabel, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero eyebrow={isAr ? 'مساعدة' : 'Help'} title={faqLabel} lead={heroLead} />

        {groups.map((g) => (
          <FaqSection key={g.id} id={`faq-${g.id}`} heading={g.heading} faqs={g.faqs} />
        ))}
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/doctors`, label: isAr ? 'تصفّح الأطباء' : 'Browse doctors' },
          { href: `/${locale}/coverage`, label: isAr ? 'تحقّق من التغطية' : 'Check coverage' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
