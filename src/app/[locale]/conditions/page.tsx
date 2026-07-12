/**
 * Conditions hub — /[locale]/conditions
 *
 * Indexes the condition/use-case pages (stroke rehab, wound care, diabetic foot,
 * fall prevention) — the GEO-authority content AI engines cite.
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
import { conditionIcon } from '@/lib/seo/icons';
import { buildConditionsMetadata } from '@/lib/seo/metadata';
import { webPageSchema, breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { getAllConditions } from '@/lib/seo/conditions';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildConditionsMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function ConditionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const conditions = getAllConditions(locale);
  const label = isAr ? 'الرعاية حسب الحالة' : 'Care by condition';
  const heroLead = isAr
    ? 'كيف تُدار حالات شائعة بأمان في المنزل في مصر — من تأهيل الجلطة والعناية بالجروح إلى القدم السكري والوقاية من السقوط — ودور الرعاية المنزلية في كل منها.'
    : 'How common conditions are managed safely at home in Egypt — from stroke rehabilitation and wound care to diabetic foot care and fall prevention — and the role home care plays in each.';

  const breadcrumbItems = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: label, url: `${site.baseUrl}/${locale}/conditions` },
  ];
  const webpage = webPageSchema({
    locale,
    path: `/${locale}/conditions`,
    name: label,
    description: heroLead,
    breadcrumbs: breadcrumbItems,
  });
  const crumbs = breadcrumbSchema(breadcrumbItems);

  return (
    <>
      <Script id="conditions-webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(webpage) }} />
      <Script id="conditions-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: renderJsonLd(crumbs) }} />

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
          title={isAr ? 'الرعاية المنزلية حسب الحالة' : 'Home Care by Condition'}
          lead={heroLead}
        />

        <Section>
          <Container>
            <Grid min="380px">
              {conditions.map((c) => (
                <ContentCard
                  key={c.slug}
                  href={`/${locale}/conditions/${c.slug}`}
                  icon={conditionIcon(c.slug)}
                  title={c.name}
                  description={c.description}
                  cta={isAr ? 'اقرأ المزيد' : 'Read more'}
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
          { href: `/${locale}/guides`, label: isAr ? 'الأدلة' : 'Guides' },
          { href: `/${locale}/faq`, label: isAr ? 'الأسئلة الشائعة' : 'FAQ' },
          { href: `/${locale}/booking`, label: isAr ? 'احجز زيارة منزلية' : 'Book a home visit' },
        ]}
      />
      <Footer />
    </>
  );
}
