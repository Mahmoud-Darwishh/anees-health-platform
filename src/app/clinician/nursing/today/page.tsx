import { getNurseTodayData } from '@/features/ehr/clinician-nursing/data';
import { NurseTodayView } from '@/features/ehr/clinician-nursing/NurseTodayView';

export const dynamic = 'force-dynamic';

export default async function NurseTodayPage() {
  const data = await getNurseTodayData();
  return <NurseTodayView data={data} />;
}
