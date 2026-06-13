import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/rbac';
import { getOwnPatientRecord } from '@/lib/portal/patient-record';
import { resolvePortalWorkspaceTab } from '@/features/portal/types';
import { loadPortalData } from '@/features/portal/data';
import { buildPortalContext } from '@/features/portal/view-context';
import { PortalPageView } from '@/features/portal/PortalPageView';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });

  return {
    title: t('metaTitle'),
    robots: { index: false },
  };
}

export default async function PatientPortalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'portal' });
  const activeTab = resolvePortalWorkspaceTab(tab);

  const user = await getSessionUser();
  if (!user || user.role !== 'patient') {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/portal`);
  }

  const ownRecord = await getOwnPatientRecord();

  if (!ownRecord) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger" role="alert">
          <h1 className="h5">{t('notFoundTitle')}</h1>
          <p className="mb-0">{t('notFoundText')}</p>
        </div>
      </main>
    );
  }

  if (!ownRecord.patient.medplumPatientId) {
    return (
      <main className="container py-4">
        <div className="alert alert-warning" role="alert">
          <h1 className="h5">{t('notLinkedTitle')}</h1>
          <p>{t('notLinkedText')}</p>
          <Link href={`/${locale}/booking`} className="btn btn-sm btn-primary">
            {t('linkAccountCta')}
          </Link>
        </div>
      </main>
    );
  }

  const data = await loadPortalData(ownRecord, activeTab);
  const ctx = buildPortalContext({ record: ownRecord, data, t, locale, activeTab });

  return <PortalPageView ctx={ctx} />;
}
