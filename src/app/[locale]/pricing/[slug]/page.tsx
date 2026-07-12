/**
 * Per-service cost explainer — /[locale]/pricing/[slug]
 *
 * Targets the "how much does X cost in Egypt" query (distinct intent from the
 * service pages). Leads with a cost-first direct answer, shows the published
 * price anchor pulled from `pricing.ts` (single source — no drift) where one
 * exists, and emits WebPage + FAQ + Breadcrumb (+ AggregateOffer when priced).
 */
import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import ContentHero from '@/components/common/content/ContentHero';
import ArticleSections from '@/components/common/ArticleSections';
import { buildCostPageMetadata } from '@/lib/seo/metadata';
import {
  faqPageSchema,
  webPageSchema,
  breadcrumbSchema,
  aggregateOfferSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import {
  getCostExplainer,
  getAllCostExplainerSlugs,
} from '@/lib/seo/pricing-explainers';
import { getAllPackages, type PriceTier } from '@/lib/seo/pricing';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = getAllCostExplainerSlugs();
  const locales = config.locales.supported as ('en' | 'ar')[];
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const explainer = getCostExplainer(locale, slug);
  if (!explainer) {
    return {
      title: locale === 'ar' ? 'الصفحة غير موجودة' : 'Page not found',
      robots: { index: false, follow: true },
    };
  }
  return buildCostPageMetadata({ locale, slug, title: explainer.title, description: explainer.description });
}

export default async function CostExplainerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const explainer = getCostExplainer(locale, slug);
  if (!explainer) notFound();

  // Price anchor — pulled from pricing.ts (the single source) so figures here
  // can never drift from the /pricing packages page.
  const pkg = explainer.packageSlug
    ? getAllPackages(locale).find((p) => p.slug === explainer.packageSlug)
    : undefined;
  const tiers = pkg?.tiers ?? [];

  const num = (n: number) => n.toLocaleString('en-US');
  const tierPrice = (t: PriceTier) =>
    t.toEgp
      ? isAr
        ? `${num(t.fromEgp)}–${num(t.toEgp)} ج.م`
        : `EGP ${num(t.fromEgp)}–${num(t.toEgp)}`
      : isAr
        ? `من ${num(t.fromEgp)} ج.م`
        : `from EGP ${num(t.fromEgp)}`;

  const tierPricesEgp = tiers.flatMap((t) =>
    [t.fromEgp, t.toEgp].filter((v): v is number => typeof v === 'number' && v > 0)
  );
  const offerSchema = aggregateOfferSchema(locale, tierPricesEgp);

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: isAr ? 'الأسعار' : 'Pricing', url: `${site.baseUrl}/${locale}/pricing` },
    { name: explainer.title, url: `${site.baseUrl}/${locale}/pricing/${slug}` },
  ];
  const faq = faqPageSchema(explainer.faqs);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/pricing/${slug}`,
    name: explainer.title,
    description: explainer.description,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      {offerSchema && (
        <Script id="cost-offer-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(offerSchema) }} />
      )}
      <Script id="cost-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="cost-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="cost-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: isAr ? 'الأسعار' : 'Pricing', href: `/${locale}/pricing` },
          { label: explainer.title, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero title={explainer.title} lead={explainer.answer} />

        {/* Price box — real anchor from pricing.ts, or transparent-pricing note */}
        <section className="pt-5 pb-2">
          <div className="container">
            <div className="card border-0 shadow-sm" style={{ maxWidth: 640 }}>
              <div className="card-body">
                <h2 className="h5 mb-3">{isAr ? 'السعر الإرشادي' : 'Indicative price'}</h2>
                {tiers.length > 0 ? (
                  <ul className="list-unstyled mb-2">
                    {tiers.map((t, i) => (
                      <li key={i} className="d-flex justify-content-between border-bottom py-2">
                        <span>{t.label}</span>
                        <span className="fw-semibold">{tierPrice(t)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-2">
                    {isAr
                      ? 'يُحدَّد السعر بدقة قبل تأكيد الحجز، بحسب التفاصيل أدناه.'
                      : 'The exact price is confirmed before you book, based on the details below.'}
                  </p>
                )}
                <p className="text-muted small mb-3">
                  {isAr
                    ? 'الأسعار إرشادية؛ يظهر السعر النهائي دائماً قبل تأكيد الحجز.'
                    : 'Prices are indicative; the final price is always shown before you confirm.'}
                </p>
                <Link href={`/${locale}/services/${explainer.serviceSlug}`} className="me-3">
                  {isAr ? 'تفاصيل الخدمة' : 'Service details'}
                </Link>
                <Link href={`/${locale}/booking`}>{isAr ? 'احجز الآن' : 'Book now'}</Link>
              </div>
            </div>
          </div>
        </section>

        <article className="py-4">
          <div className="container">
            <div className="row">
              <div className="col-12 col-lg-9">
                <ArticleSections sections={explainer.sections} />
              </div>
            </div>
          </div>
        </article>

        <FaqSection
          heading={isAr ? 'أسئلة شائعة عن التكلفة' : 'Cost FAQ'}
          faqs={explainer.faqs}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/pricing`, label: isAr ? 'كل الأسعار والباقات' : 'All pricing & packages' },
          { href: `/${locale}/services/${explainer.serviceSlug}`, label: isAr ? 'تفاصيل الخدمة' : 'Service details' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
