import { getPhysioPatientsData } from '@/features/ehr/clinician-physio/patients/data';
import { PatientsPageView } from '@/features/ehr/clinician-physio/patients/PatientsPageView';

export default async function ClinicianPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const data = await getPhysioPatientsData({
    filter: params.filter,
    query: params.q,
  });

  return <PatientsPageView data={data} />;
}
