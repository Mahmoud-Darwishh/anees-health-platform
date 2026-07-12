/**
 * Blog hub — /[locale]/blog
 *
 * Lists the dated awareness / patient-education posts, newest first. Distinct
 * from /guides (evergreen decision content): emits Blog + WebPage + Breadcrumb
 * JSON-LD and surfaces the publish date on each card.
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import ContentHero from '@/components/common/content/ContentHero';
import ContentCard from '@/components/common/content/ContentCard';
import { Container, Section, Grid } from '@/components/common/layout';
import { buildBlogMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllBlogPosts } from '@/lib/seo/blog';
import { site, bcp47, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

function formatDate(iso: string, locale: SupportedLocale): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildBlogMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const posts = getAllBlogPosts(locale);
  const blogLabel = isAr ? 'المدونة' : 'Blog';
  const heroLead = isAr
    ? 'مقالات توعوية وموسمية تساعد الأسر المصرية على رعاية أحبائها في المنزل — علامات تستدعي الانتباه، وما تتوقعه، ونصائح موسمية.'
    : 'Awareness and seasonal articles to help Egyptian families care for their loved ones at home — signs to watch, what to expect, and timely seasonal advice.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: blogLabel, url: `${site.baseUrl}/${locale}/blog` },
  ];
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${site.baseUrl}/${locale}/blog`,
    name: isAr ? 'مدونة أنيس هيلث' : 'Anees Health Blog',
    inLanguage: bcp47(locale),
    publisher: { '@id': `${site.baseUrl}/#organization` },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: p.datePublished,
      url: `${site.baseUrl}/${locale}/blog/${p.slug}`,
    })),
  };
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/blog`,
    name: blogLabel,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="blog-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(blogSchema) }} />
      <Script id="blog-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="blog-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: blogLabel, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={blogLabel}
          title={isAr ? 'مدونة الرعاية الصحية المنزلية' : 'Home Healthcare Blog'}
          lead={heroLead}
        />

        <Section>
          <Container>
            <Grid min="380px">
              {posts.map((p) => (
                <ContentCard
                  key={p.slug}
                  href={`/${locale}/blog/${p.slug}`}
                  icon="fa-newspaper"
                  meta={formatDate(p.datePublished, locale)}
                  title={p.title}
                  description={p.description}
                  cta={isAr ? 'اقرأ المقال' : 'Read article'}
                />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/guides`, label: isAr ? 'الأدلة' : 'Guides' },
          { href: `/${locale}/conditions`, label: isAr ? 'الرعاية حسب الحالة' : 'Care by condition' },
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
