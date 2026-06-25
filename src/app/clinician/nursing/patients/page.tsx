import { getNursePatientsData } from '@/features/ehr/clinician-nursing/patients-data';
import { NursePatientsView } from '@/features/ehr/clinician-nursing/NursePatientsView';

export const dynamic = 'force-dynamic';

export default async function NursePatientsPage() {
  const data = await getNursePatientsData();
  return <NursePatientsView data={data} />;
}
