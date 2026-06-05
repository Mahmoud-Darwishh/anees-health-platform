import { TodayPageView } from '@/features/ehr/clinician-physio/TodayPageView';
import { getPhysioTodayData } from '@/features/ehr/clinician-physio/data';

export default async function ClinicianTodayPage() {
  const data = await getPhysioTodayData();
  return <TodayPageView data={data} />;
}
