import { Metadata } from 'next';
import DoctorGrid from '@/components/doctors/doctorgrid/doctors-grid';
import { generateDoctorsMetadata } from '@/lib/utils/metadata';
import { generateDoctorsCollectionSchema, renderJsonLd } from '@/lib/utils/structured-data';
import { getDoctors } from '@/lib/api/doctors';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateDoctorsMetadata(locale);
}

export default async function DoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Fetch doctors for structured data (first 20 for schema)
  const doctors = await getDoctors(locale as 'en' | 'ar');
  const doctorsCollectionSchema = generateDoctorsCollectionSchema(
    doctors,
    locale,
    1 // current page
  );

  return (
    <>
      {/* Structured Data - Doctors Collection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(doctorsCollectionSchema) }}
      />
      <DoctorGrid />
    </>
  );
}
