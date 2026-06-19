import { getDoctorWorklistData } from '@/features/ehr/clinician-doctor/data';
import { DoctorWorklistView } from '@/features/ehr/clinician-doctor/DoctorWorklistView';

export const dynamic = 'force-dynamic';

export default async function DoctorWorklistPage() {
  const data = await getDoctorWorklistData();
  return <DoctorWorklistView data={data} />;
}
