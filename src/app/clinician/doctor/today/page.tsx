import { getDoctorTodayData } from '@/features/ehr/clinician-doctor/field-data';
import { DoctorTodayView } from '@/features/ehr/clinician-doctor/DoctorTodayView';

export const dynamic = 'force-dynamic';

export default async function DoctorTodayPage() {
  const data = await getDoctorTodayData();
  return <DoctorTodayView data={data} />;
}
