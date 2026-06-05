import { getClinicianPhysioProfileData } from '@/lib/ehr/clinician-physio-profile';
import { ProfilePageView } from '@/features/ehr/clinician-physio/profile/ProfilePageView';

export default async function ClinicianProfilePage() {
  const data = await getClinicianPhysioProfileData();
  return <ProfilePageView data={data} />;
}
