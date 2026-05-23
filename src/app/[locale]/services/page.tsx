import type { Metadata } from 'next';
import { getContentServices } from '@/lib/api/content-services';
import ServicesPageContent from './page-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'خدماتنا - أنيس هيلث' : 'Our Services | Anees Health',
    description:
      locale === 'ar'
        ? 'اكتشف خدمات أنيس هيلث: زيارات منزلية، تطبيب عن بعد، تمريض، علاج طبيعي والمزيد'
        : 'Discover Anees Health services: home doctor visits, telemedicine, nursing, physiotherapy and more',
  };
}

export default async function ServicesPage() {
  const services = await getContentServices();
  return <ServicesPageContent services={services} />;
}
