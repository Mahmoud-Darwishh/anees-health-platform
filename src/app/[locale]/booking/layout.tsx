import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import BookingPage from './page-content';
import { getBookingPrices } from '@/lib/api/pricing';
import { getSpecialties } from '@/lib/api/specialties';

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

  const [prices, specialties] = await Promise.all([
    getBookingPrices(),
    getSpecialties(),
  ]);

  return <BookingPage locale={locale} prices={prices} specialties={specialties} />;
}
