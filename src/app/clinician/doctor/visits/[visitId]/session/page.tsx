import { notFound } from 'next/navigation';
import { getDoctorSessionData } from '@/features/ehr/clinician-doctor/field-data';
import { DoctorSessionView } from '@/features/ehr/clinician-doctor/DoctorSessionView';

export const dynamic = 'force-dynamic';

export default async function DoctorSessionPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const data = await getDoctorSessionData(visitId);
  if (!data) {
    notFound();
  }
  return <DoctorSessionView data={data} />;
}
