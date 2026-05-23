import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SignupForm from './SignupForm';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.signup' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user.role === 'patient') redirect(`/${locale}/portal`);
  if (session?.user.role === 'staff') redirect('/admin/patients');

  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
