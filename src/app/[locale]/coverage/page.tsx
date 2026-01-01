import { Metadata } from 'next';
import CoveragePageContent from '@/components/sections/coverage/CoveragePageContent';
import { generateCoverageMetadata } from '@/lib/utils/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateCoverageMetadata(locale);
}

export default async function CoveragePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const $locale = (await params).locale;

  return <CoveragePageContent locale={$locale} />;
}
