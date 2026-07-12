/**
 * Glossary hub — /[locale]/glossary
 *
 * Definitional content (DefinedTermSet) that wins "what is X" / "ما معنى X"
 * queries and feeds AI answer engines.
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
import { buildGlossaryMetadata } from '@/lib/seo/metadata';
import { definedTermSetSchema, webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllGlossaryTerms } from '@/lib/seo/glossary';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildGlossaryMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const terms = getAllGlossaryTerms(locale);
  const label = isAr ? 'قاموس المصطلحات' : 'Glossary';
  const heroLead = isAr
    ? 'تعريفات واضحة ومختصرة لأكثر مصطلحات الرعاية الصحية المنزلية شيوعاً في مصر — لتفهم ما تحتاجه حالتك بسهولة.'
    : 'Clear, plain-language definitions of the most common home-healthcare terms in Egypt — so you can understand exactly what your case needs.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: label, url: `${site.baseUrl}/${locale}/glossary` },
  ];
  const termSet = definedTermSetSchema({
    locale,
    path: `/${locale}/glossary`,
    name: label,
    description: heroLead,
    terms: terms.map((t) => ({ slug: t.slug, term: t.term, definition: t.definition })),
  });
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/glossary`,
    name: label,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="glossary-termset-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(termSet) }} />
      <Script id="glossary-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="glossary-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

      <Header />
      <Breadcrumb
        items={[
          { label: site.labels.home[locale], href: `/${locale}` },
          { label, active: true },
        ]}
      />

      <main id="main-content">
        <ContentHero
          eyebrow={label}
          title={isAr ? 'قاموس مصطلحات الرعاية المنزلية' : 'Home Healthcare Glossary'}
          lead={heroLead}
        />

        <Section>
          <Container>
            <Grid min="300px">
              {terms.map((t) => (
                <ContentCard
                  key={t.slug}
                  href={`/${locale}/glossary/${t.slug}`}
                  icon="fa-circle-info"
                  title={t.term}
                  description={t.definition}
                  cta={isAr ? 'اقرأ التعريف' : 'Read definition'}
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
          { href: `/${locale}/conditions`, label: isAr ? 'الرعاية حسب الحالة' : 'Care by condition' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
