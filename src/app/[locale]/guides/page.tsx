/**
 * Guides hub — /[locale]/guides
 *
 * Lists the editorial guides (comparison / how-to / pillar) that build topical
 * authority and feed AI answer engines.
 */
import Script from 'next/script';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RelatedLinks from '@/components/common/RelatedLinks';
import ContentHero from '@/components/common/content/ContentHero';
import ContentCard from '@/components/common/content/ContentCard';
import { Container, Section, Grid } from '@/components/common/layout';
import { buildGuidesMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllGuides } from '@/lib/seo/guides';
import { site, type SupportedLocale } from '@/lib/seo/site';
import { setRequestLocale } from 'next-intl/server';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildGuidesMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const guides = getAllGuides(locale);
  const guidesLabel = isAr ? 'الأدلة' : 'Guides';
  const heroLead = isAr
    ? 'أدلة عملية تساعد الأسر المصرية على اتخاذ قرارات الرعاية المنزلية بثقة — كيف تختار مزوّداً، والمقارنة بين الخيارات، وما تتوقعه.'
    : 'Practical guides to help Egyptian families make home-care decisions with confidence — how to choose a provider, how the options compare, and what to expect.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: guidesLabel, url: `${site.baseUrl}/${locale}/guides` },
  ];
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/guides`,
    name: guidesLabel,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="guides-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="guides-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label: guidesLabel, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={guidesLabel}
          title={isAr ? 'أدلة الرعاية الصحية المنزلية' : 'Home Healthcare Guides'}
          lead={heroLead}
        />

        <Section>
          <Container>
            <Grid min="380px">
              {guides.map((g) => (
                <ContentCard
                  key={g.slug}
                  href={`/${locale}/guides/${g.slug}`}
                  icon="fa-file-lines"
                  title={g.title}
                  description={g.description}
                  cta={isAr ? 'اقرأ الدليل' : 'Read guide'}
                />
              ))}
            </Grid>
          </Container>
        </Section>
      </main>

      <RelatedLinks
        locale={locale}
        links={[
          { href: `/${locale}/services`, label: isAr ? 'الخدمات المنزلية' : 'Home services' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/areas`, label: isAr ? 'مناطق التغطية' : 'Coverage areas' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
