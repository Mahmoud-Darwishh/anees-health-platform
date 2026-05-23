import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import LinkAccountForm from './LinkAccountForm';

type Props = { params: Promise<{ locale: string }> };

export const metadata = { robots: { index: false } };

export default async function LinkAccountPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (!session) redirect(`/${locale}/auth/login`);
  // Already linked
  if (session.user.patientId) redirect(`/${locale}/portal`);

  return (
    <Suspense>
      <LinkAccountForm />
    </Suspense>
  );
}
