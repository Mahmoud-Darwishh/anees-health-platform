import { redirect } from 'next/navigation';

export default function ClinicianRootPage() {
  redirect('/clinician/today');
}
