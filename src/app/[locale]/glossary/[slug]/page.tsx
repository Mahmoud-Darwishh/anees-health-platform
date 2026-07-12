/**
 * Glossary term — /[locale]/glossary/[slug]
 *
 * A single definitional page (DefinedTerm schema) with the definition, when
 * it's needed, the related Anees service, and cross-links to other terms.
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
import ContentHero from '@/components/common/content/ContentHero';
import { buildGlossaryTermMetadata } from '@/lib/seo/metadata';
import {
  definedTermSchema,
  webPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { getGlossaryTerm, getAllGlossarySlugs, getAllGlossaryTerms } from '@/lib/seo/glossary';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = getAllGlossarySlugs();
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
  const entry = getGlossaryTerm(locale, slug);
  if (!entry) {
    return {
      title: locale === 'ar' ? 'المصطلح غير موجود' : 'Term not found',
      robots: { index: false, follow: true },
    };
  }
  return buildGlossaryTermMetadata({ locale, slug, term: entry.term, definition: entry.definition });
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const entry = getGlossaryTerm(locale, slug);
  if (!entry) notFound();

  const glossaryLabel = isAr ? 'قاموس المصطلحات' : 'Glossary';
  const siblings = getAllGlossaryTerms(locale).filter((t) => t.slug !== slug).slice(0, 6);

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: glossaryLabel, url: `${site.baseUrl}/${locale}/glossary` },
    { name: entry.term, url: `${site.baseUrl}/${locale}/glossary/${slug}` },
  ];

  const termSchema = definedTermSchema({
    locale,
    setPath: `/${locale}/glossary`,
    setName: glossaryLabel,
    slug,
    term: entry.term,
    definition: entry.definition,
  });
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/glossary/${slug}`,
    name: entry.term,
    description: entry.definition,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="glossary-term-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(termSchema) }} />
      <Script id="glossary-term-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="glossary-term-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: glossaryLabel, href: `/${locale}/glossary` },
          { label: entry.term, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={glossaryLabel}
          title={isAr ? `ما هو ${entry.term}؟` : `What is ${entry.term}?`}
          lead={entry.definition}
        />

        <article className="py-5">
          <div className="container">
            <div className="row">
              <div className="col-12 col-lg-9">
                <h2 className="h4 mb-3">{isAr ? 'متى تحتاجه' : 'When you’d need it'}</h2>
                <p>{entry.whenYouNeed}</p>

                {entry.related ? (
                  <p className="mt-4 mb-0">
                    {isAr ? 'الخدمة ذات الصلة من أنيس: ' : 'Related Anees service: '}
                    <Link href={`/${locale}/services/${entry.related.slug}`}>{entry.related.label}</Link>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <section className="pb-5">
          <div className="container">
            <h2 className="h5 mb-3">{isAr ? 'مصطلحات أخرى' : 'More terms'}</h2>
            <ul>
              {siblings.map((t) => (
                <li key={t.slug} className="mb-1">
                  <Link href={`/${locale}/glossary/${t.slug}`}>{t.term}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/glossary`, label: isAr ? 'كل المصطلحات' : 'All terms' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
