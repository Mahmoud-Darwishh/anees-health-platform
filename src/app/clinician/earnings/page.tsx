import { getClinicianEarningsData } from '@/features/ehr/clinician-physio/earnings/data';
import { EarningsPageView } from '@/features/ehr/clinician-physio/earnings/EarningsPageView';

export default async function ClinicianEarningsPage() {
  const data = await getClinicianEarningsData();
  return <EarningsPageView data={data} />;
}
