import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import ForgotPasswordForm from './ForgotPasswordForm';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.forgotPassword' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user.role === 'patient') {
    redirect(`/${locale}/portal`);
  }

  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
