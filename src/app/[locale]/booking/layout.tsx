import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import BookingPage from './page-content';

interface BookingLayoutProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: BookingLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });

  return {
    title: t('title'),
    description: t('meta_description'),
    openGraph: {
      title: t('title'),
      description: t('meta_description'),
      type: 'website',
    },
  };
}

export default async function BookingPageLayout({ params }: BookingLayoutProps) {
  const { locale } = await params;

  return <BookingPage locale={locale} />;
}
