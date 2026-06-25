/**
 * Guide article — /[locale]/guides/[slug]
 *
 * Renders a structured editorial guide (intro + sections + FAQ) with Article +
 * FAQ + WebPage + Breadcrumb JSON-LD. Content lives in `@/lib/seo/guides`.
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import FaqSection from '@/components/common/FaqSection';
import { buildGuideMetadata } from '@/lib/seo/metadata';
import {
  articleSchema,
  faqPageSchema,
  webPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { getGuide, getAllGuideSlugs } from '@/lib/seo/guides';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
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
  const guide = getGuide(locale, slug);
  if (!guide) {
    return {
      title: locale === 'ar' ? 'الدليل غير موجود' : 'Guide not found',
      robots: { index: false, follow: true },
    };
  }
  return buildGuideMetadata({ locale, slug, title: guide.title, description: guide.description });
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const guide = getGuide(locale, slug);
  if (!guide) notFound();

  const url = `${site.baseUrl}/${locale}/guides/${slug}`;
  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: isAr ? 'الأدلة' : 'Guides', url: `${site.baseUrl}/${locale}/guides` },
    { name: guide.title, url },
  ];

  const article = articleSchema(
    {
      title: guide.title,
      description: guide.description,
      datePublished: guide.datePublished,
      dateModified: guide.dateModified,
      author: site.name,
    },
    locale,
    url
  );
  const faq = faqPageSchema(guide.faqs);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/guides/${slug}`,
    name: guide.title,
    description: guide.description,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="guide-article-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(article) }} />
      <Script id="guide-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="guide-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="guide-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: isAr ? 'الأدلة' : 'Guides', href: `/${locale}/guides` },
          { label: guide.title, active: true },
        ]}
        title={guide.title}
      />

      <main id="main-content">
        <article className="py-5">
          <div className="container">
            <div className="row">
              <div className="col-12 col-lg-9">
                <h1 className="h2 mb-3">{guide.title}</h1>
                <p className="lead">{guide.intro}</p>

                {guide.sections.map((section, i) => (
                  <section key={i} className="mt-4">
                    <h2 className="h4 mb-3">{section.heading}</h2>
                    {section.body.map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                    {section.bullets && section.bullets.length > 0 ? (
                      <ul>
                        {section.bullets.map((b, k) => (
                          <li key={k} className="mb-1">{b}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </article>

        <FaqSection
          heading={isAr ? 'أسئلة شائعة' : 'Frequently asked questions'}
          faqs={guide.faqs}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/guides`, label: isAr ? 'كل الأدلة' : 'All guides' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/pricing`, label: isAr ? 'الأسعار' : 'Pricing' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
