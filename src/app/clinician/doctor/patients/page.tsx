import { getDoctorPatientsData } from '@/features/ehr/clinician-doctor/patients-data';
import { DoctorPatientsView } from '@/features/ehr/clinician-doctor/DoctorPatientsView';

export const dynamic = 'force-dynamic';

export default async function DoctorPatientsPage() {
  const data = await getDoctorPatientsData();
  return <DoctorPatientsView data={data} />;
}
