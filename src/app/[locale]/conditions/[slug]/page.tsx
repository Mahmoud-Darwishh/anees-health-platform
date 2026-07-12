/**
 * Condition page — /[locale]/conditions/[slug]
 *
 * Renders a structured condition/use-case article (intro + sections + FAQ +
 * related home services) with MedicalWebPage + Article + FAQ + Breadcrumb
 * JSON-LD. Content lives in `@/lib/seo/conditions`.
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
import ArticleSections from '@/components/common/ArticleSections';
import ContentHero from '@/components/common/content/ContentHero';
import { buildConditionMetadata } from '@/lib/seo/metadata';
import {
  medicalWebPageSchema,
  articleSchema,
  faqPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { getCondition, getAllConditionSlugs } from '@/lib/seo/conditions';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = getAllConditionSlugs();
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
  const condition = getCondition(locale, slug);
  if (!condition) {
    return {
      title: locale === 'ar' ? 'الصفحة غير موجودة' : 'Page not found',
      robots: { index: false, follow: true },
    };
  }
  return buildConditionMetadata({ locale, slug, title: condition.name, description: condition.description });
}

export default async function ConditionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const condition = getCondition(locale, slug);
  if (!condition) notFound();

  const path = `/${locale}/conditions/${slug}`;
  const url = `${site.baseUrl}${path}`;
  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: isAr ? 'الرعاية حسب الحالة' : 'Care by condition', url: `${site.baseUrl}/${locale}/conditions` },
    { name: condition.name, url },
  ];

  const medPage = medicalWebPageSchema({
    locale,
    path,
    name: condition.name,
    description: condition.description,
    aspect: condition.aspect,
    breadcrumbs: breadcrumbItems,
  });
  const article = articleSchema(
    {
      title: condition.name,
      description: condition.description,
      datePublished: condition.datePublished,
      dateModified: condition.dateModified,
      author: site.name,
    },
    locale,
    url
  );
  const faq = faqPageSchema(condition.faqs);
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="condition-medpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(medPage) }} />
      <Script id="condition-article-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(article) }} />
      <Script id="condition-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="condition-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: isAr ? 'الرعاية حسب الحالة' : 'Care by condition', href: `/${locale}/conditions` },
          { label: condition.name, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero title={condition.name} lead={condition.intro} />

        <article className="py-5">
          <div className="container">
            <div className="row">
              <div className="col-12 col-lg-9">
                <ArticleSections sections={condition.sections} />

                {condition.related.length > 0 ? (
                  <section className="mt-4">
                    <h2 className="h4 mb-3">{isAr ? 'خدمات أنيس ذات الصلة' : 'Related Anees services'}</h2>
                    <ul>
                      {condition.related.map((r) => (
                        <li key={r.slug} className="mb-1">
                          <Link href={`/${locale}/services/${r.slug}`}>{r.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <FaqSection
          heading={isAr ? 'أسئلة شائعة' : 'Frequently asked questions'}
          faqs={condition.faqs}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/conditions`, label: isAr ? 'كل الحالات' : 'All conditions' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/guides`, label: isAr ? 'الأدلة' : 'Guides' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
