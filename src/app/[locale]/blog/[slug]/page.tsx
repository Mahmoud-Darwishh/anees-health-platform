/**
 * Blog post — /[locale]/blog/[slug]
 *
 * Renders a dated awareness/education post (intro + sections + FAQ) with
 * BlogPosting + FAQ + WebPage + Breadcrumb JSON-LD. Content lives in
 * `@/lib/seo/blog`.
 */
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
import { buildBlogPostMetadata } from '@/lib/seo/metadata';
import {
  blogPostingSchema,
  faqPageSchema,
  webPageSchema,
  breadcrumbSchema,
  renderJsonLd,
} from '@/lib/seo/jsonld';
import { getBlogPost, getAllBlogSlugs } from '@/lib/seo/blog';
import { config } from '@/lib/config';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

function formatDate(iso: string, locale: SupportedLocale): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
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
  const post = getBlogPost(locale, slug);
  if (!post) {
    return {
      title: locale === 'ar' ? 'المقال غير موجود' : 'Article not found',
      robots: { index: false, follow: true },
    };
  }
  return buildBlogPostMetadata({ locale, slug, title: post.title, description: post.description });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const post = getBlogPost(locale, slug);
  if (!post) notFound();

  const url = `${site.baseUrl}/${locale}/blog/${slug}`;
  const blogLabel = isAr ? 'المدونة' : 'Blog';
  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: blogLabel, url: `${site.baseUrl}/${locale}/blog` },
    { name: post.title, url },
  ];

  const posting = blogPostingSchema(
    {
      title: post.title,
      description: post.description,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      author: site.name,
    },
    locale,
    url
  );
  const faq = faqPageSchema(post.faqs);
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/blog/${slug}`,
    name: post.title,
    description: post.description,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="blog-posting-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(posting) }} />
      <Script id="blog-faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
      <Script id="blog-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="blog-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: blogLabel, href: `/${locale}/blog` },
          { label: post.title, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={formatDate(post.datePublished, locale)}
          title={post.title}
          lead={post.intro}
        />

        <article className="py-5">
          <div className="container">
            <div className="row">
              <div className="col-12 col-lg-9">
                <ArticleSections sections={post.sections} />
              </div>
            </div>
          </div>
        </article>

        <FaqSection
          heading={isAr ? 'أسئلة شائعة' : 'Frequently asked questions'}
          faqs={post.faqs}
        />
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/blog`, label: isAr ? 'كل المقالات' : 'All articles' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/conditions`, label: isAr ? 'الرعاية حسب الحالة' : 'Care by condition' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
