import { getNurseTasksData } from '@/features/ehr/clinician-nursing/tasks-data';
import { NurseTasksView } from '@/features/ehr/clinician-nursing/NurseTasksView';

export const dynamic = 'force-dynamic';

export default async function NurseTasksPage() {
  const data = await getNurseTasksData();
  return <NurseTasksView data={data} />;
}
