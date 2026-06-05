import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import LoginForm from './LoginForm';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return { title: t('title'), robots: { index: false } };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user.role === 'patient') {
    redirect(`/${locale}/portal`);
  }
  if (session?.user.role === 'staff') {
    redirect('/admin/clinician');
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
