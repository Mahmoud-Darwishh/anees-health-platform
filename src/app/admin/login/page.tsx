import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getAdminHomePath } from '@/lib/auth/permissions';
import AdminLoginForm from './AdminLoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Sign In | Anees Health Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user.role === 'staff') redirect(getAdminHomePath(session.user.staffRole));

  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
