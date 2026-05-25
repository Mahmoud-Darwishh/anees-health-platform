import { getContentServices } from '@/lib/api/content-services';
import ServicesPageContent from './page-content';

// Metadata + JSON-LD for this route are emitted by the segment layout
// (`./layout.tsx`), which calls into `@/lib/seo/metadata` + `@/lib/seo/jsonld`.

export default async function ServicesPage() {
  const services = await getContentServices();
  return <ServicesPageContent services={services} />;
}
