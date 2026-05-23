import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AdminLoginForm from './AdminLoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Sign In | Anees Health Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user.role === 'staff') redirect('/admin/patients');

  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
