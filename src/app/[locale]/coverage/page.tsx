import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CoveragePageContent from '@/components/sections/coverage/CoveragePageContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const $locale = (await params).locale;
  const t = await getTranslations({ locale: $locale, namespace: 'coveragePage' });

  return {
    title: t('title'),
    description: t('meta_description'),
  };
}

export default async function CoveragePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const $locale = (await params).locale;

  return <CoveragePageContent locale={$locale} />;
}
