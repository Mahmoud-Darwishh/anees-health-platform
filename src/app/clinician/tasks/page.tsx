import { getClinicianTasksData } from '@/features/ehr/clinician-physio/tasks/data';
import { TasksPageView } from '@/features/ehr/clinician-physio/tasks/TasksPageView';

export default async function ClinicianTasksPage() {
  const data = await getClinicianTasksData();
  return <TasksPageView data={data} />;
}
