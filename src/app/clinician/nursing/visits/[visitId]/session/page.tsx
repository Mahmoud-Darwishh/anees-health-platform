import { notFound } from 'next/navigation';
import { getNurseSessionData } from '@/features/ehr/clinician-nursing/data';
import { NurseSessionView } from '@/features/ehr/clinician-nursing/NurseSessionView';

export const dynamic = 'force-dynamic';

export default async function NurseSessionPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  const data = await getNurseSessionData(visitId);
  if (!data) {
    notFound();
  }
  return <NurseSessionView data={data} />;
}
