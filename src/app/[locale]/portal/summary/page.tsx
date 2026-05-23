import { auth } from '@/auth';
import { DistributionCard, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
import { prisma } from '@/lib/db/prisma';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PrintSummaryButton from './PrintSummaryButton';
import styles from './summary.module.scss';

type Props = {
  params: Promise<{ locale: string }>;
};

function formatDate(value: Date | null, locale: string): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function formatVisitType(value: string): string {
  return value === 'telemedicine' ? 'Telemedicine' : 'In-home';
}

function classifyDocumentCategory(category: string): 'lab' | 'scan' | 'other' {
  const normalized = category.toLowerCase();
  if (normalized.includes('lab') || normalized.includes('pathology') || normalized.includes('result')) return 'lab';
  if (normalized.includes('scan') || normalized.includes('radiology') || normalized.includes('xray') || normalized.includes('mri') || normalized.includes('ct')) return 'scan';
  return 'other';
}

function formatShortDate(value: Date | null, locale: string): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function SummaryIcon({ kind }: { kind: 'patient' | 'clinical' | 'docs' | 'visits' }) {
  if (kind === 'patient') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.8-3.6 4.6-5.4 8-5.4s6.2 1.8 8 5.4" />
      </svg>
    );
  }

  if (kind === 'docs') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v6h6" />
      </svg>
    );
  }

  if (kind === 'visits') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M8 4v4M16 4v4M4 10h16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 13h4l2-4 3 8 2-4h7" />
    </svg>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal.shareProfile' });
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function PatientPortableSummaryPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal.shareProfile' });
  const portalT = await getTranslations({ locale, namespace: 'portal' });
  const session = await auth();

  if (!session || session.user.role !== 'patient' || !session.user.patientId) {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/portal/summary`);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: session.user.patientId },
    select: {
      code: true,
      fullName: true,
      phone: true,
      gender: true,
      dateOfBirth: true,
      primaryCaregiver: true,
      chiefComplaint: true,
      notes: true,
      allergies: {
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, allergen: true, severity: true, reaction: true },
      },
      diagnoses: {
        where: { deletedAt: null },
        orderBy: { diagnosedOn: 'desc' },
        take: 10,
        select: { id: true, diagnosisName: true, icd10Code: true, diagnosedOn: true, status: true },
      },
      medications: {
        where: { deletedAt: null, isActive: true },
        orderBy: { startDate: 'desc' },
        take: 12,
        select: { id: true, medicationName: true, dose: true, frequency: true, route: true, startDate: true },
      },
      progressNotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          noteBody: true,
          enteredByStaff: { select: { name: true } },
        },
      },
      physioSessionReports: {
        where: { deletedAt: null },
        orderBy: { sessionDate: 'desc' },
        take: 10,
        select: {
          id: true,
          sessionDate: true,
          sessionNumber: true,
          interventions: true,
          response: true,
          enteredByStaff: { select: { name: true } },
        },
      },
      nurseDailyReports: {
        where: { deletedAt: null },
        orderBy: { reportDate: 'desc' },
        take: 10,
        select: {
          id: true,
          reportDate: true,
          shiftType: true,
          generalCondition: true,
          nursingNotes: true,
          enteredByStaff: { select: { name: true } },
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, title: true, category: true, createdAt: true, storagePath: true },
      },
      visits: {
        orderBy: { scheduledDate: 'desc' },
        take: 8,
        select: {
          id: true,
          code: true,
          scheduledDate: true,
          status: true,
          visitType: true,
          service: { select: { name: true } },
          provider: { select: { fullName: true } },
        },
      },
      vitalSigns: {
        where: { deletedAt: null },
        orderBy: { measuredAt: 'desc' },
        take: 8,
        select: {
          id: true,
          measuredAt: true,
          heartRate: true,
          oxygenSaturation: true,
        },
      },
    },
  });

  if (!patient) {
    redirect(`/${locale}/portal`);
  }

  const labDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'lab');
  const scanDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'scan');
  const otherDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'other');
  const readyDocuments = patient.documents.filter((doc) => Boolean(doc.storagePath)).length;

  const visitStatusMix = [
    { label: portalT('visitStatus.completed'), value: patient.visits.filter((visit) => visit.status === 'completed').length, tone: 'navy' as const },
    { label: portalT('visitStatus.scheduled'), value: patient.visits.filter((visit) => visit.status === 'scheduled').length, tone: 'gold' as const },
    { label: portalT('visitStatus.in_progress'), value: patient.visits.filter((visit) => visit.status === 'in_progress').length, tone: 'teal' as const },
    { label: portalT('visitStatus.rescheduled'), value: patient.visits.filter((visit) => visit.status === 'rescheduled').length, tone: 'slate' as const },
  ];

  const documentMix = [
    { label: portalT('documents.labs'), value: labDocuments.length, tone: 'gold' as const },
    { label: portalT('documents.scans'), value: scanDocuments.length, tone: 'navy' as const },
    { label: portalT('documents.other'), value: otherDocuments.length, tone: 'slate' as const },
  ];

  const readinessSignals = [
    patient.diagnoses.length > 0,
    patient.medications.length > 0,
    patient.allergies.length > 0,
    patient.progressNotes.length > 0,
    patient.documents.length > 0,
    patient.visits.length > 0,
  ];

  const readinessValue = readinessSignals.filter(Boolean).length;
  const heartRateSeries = patient.vitalSigns
    .slice()
    .reverse()
    .map((item) => ({
      label: formatShortDate(item.measuredAt, locale),
      value: item.heartRate ?? 0,
    }));

  const safeHeartRateSeries = heartRateSeries.length > 0
    ? heartRateSeries
    : [{ label: '-', value: 0 }];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.toolbar}>
          <Link href={`/${locale}/portal`} className={styles.backLink}>
            {t('backToPortal')}
          </Link>
          <PrintSummaryButton />
        </div>

        <article className={styles.sheet}>
          <header className={`${styles.header} ${styles.dashboardHero}`}>
            <div className={styles.brandRow}>
              <Image src="/assets/img/footer-logo.png" alt="Anees Health" width={132} height={42} priority />
              <span>{t('brandTagline')}</span>
            </div>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
            <div className={styles.badges}>
              <span className={styles.badge}>{t('generatedAt')}: {formatDate(new Date(), locale)}</span>
              <span className={styles.badge}>{t('caseId')}: {patient.code}</span>
            </div>

            <section className={styles.heroStats} aria-label={t('clinicalSummary')}>
              <article className={styles.heroStatCard}>
                <div className={styles.heroStatHead}>
                  <span className={styles.heroIcon}><SummaryIcon kind="patient" /></span>
                  <p>{t('patientInfo')}</p>
                </div>
                <strong>{patient.fullName}</strong>
              </article>

              <article className={styles.heroStatCard}>
                <div className={styles.heroStatHead}>
                  <span className={styles.heroIcon}><SummaryIcon kind="clinical" /></span>
                  <p>{t('clinicalSummary')}</p>
                </div>
                <strong>{patient.diagnoses.length + patient.medications.length + patient.allergies.length}</strong>
              </article>

              <article className={styles.heroStatCard}>
                <div className={styles.heroStatHead}>
                  <span className={styles.heroIcon}><SummaryIcon kind="docs" /></span>
                  <p>{t('labsScans')}</p>
                </div>
                <strong>{readyDocuments}/{patient.documents.length}</strong>
              </article>

              <article className={styles.heroStatCard}>
                <div className={styles.heroStatHead}>
                  <span className={styles.heroIcon}><SummaryIcon kind="visits" /></span>
                  <p>{t('recentVisits')}</p>
                </div>
                <strong>{patient.visits.length}</strong>
              </article>
            </section>
          </header>

          <section className={styles.visualGrid}>
            <div className={styles.visualCard}>
              <SparklineCard
                title={portalT('vitals.hr')}
                subtitle={portalT('vitals.measuredAt')}
                points={safeHeartRateSeries}
                tone="gold"
              />
            </div>

            <div className={styles.visualCard}>
              <DistributionCard
                title={t('recentVisits')}
                subtitle={portalT('summary.totalVisits')}
                items={visitStatusMix}
              />
            </div>

            <div className={styles.visualCard}>
              <DistributionCard
                title={t('labsScans')}
                subtitle={portalT('documents.subtitle')}
                items={documentMix}
              />
            </div>

            <div className={styles.visualCard}>
              <RingProgressCard
                title={t('clinicalSummary')}
                subtitle={portalT('portableSummary.tip')}
                value={readinessValue}
                total={readinessSignals.length}
                detail={`${readinessValue}/${readinessSignals.length}`}
                tone="navy"
              />
            </div>
          </section>

          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>{t('patientInfo')}</h2>
              <p>{t('fullName')}: {patient.fullName}</p>
              <p>{t('phone')}: {patient.phone}</p>
              <p>{t('gender')}: {patient.gender ?? '-'}</p>
              <p>{t('dob')}: {formatDate(patient.dateOfBirth, locale)}</p>
              <p>{t('caregiver')}: {patient.primaryCaregiver ?? '-'}</p>
            </article>

            <article className={styles.card}>
              <h2>{t('clinicalSummary')}</h2>
              <p>{t('chiefComplaint')}: {patient.chiefComplaint ?? '-'}</p>
              <p>{t('notes')}: {patient.notes ?? '-'}</p>
            </article>
          </section>

          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>{t('allergies')}</h2>
              {patient.allergies.length === 0 ? (
                <p className={styles.empty}>{t('none')}</p>
              ) : (
                <ul className={styles.list}>
                  {patient.allergies.map((item) => (
                    <li key={item.id}>
                      {item.allergen} ({item.severity ?? '-'}) - {item.reaction ?? '-'}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={styles.card}>
              <h2>{t('medications')}</h2>
              {patient.medications.length === 0 ? (
                <p className={styles.empty}>{t('none')}</p>
              ) : (
                <ul className={styles.list}>
                  {patient.medications.map((item) => (
                    <li key={item.id}>
                      {item.medicationName} - {item.dose ?? '-'} - {item.frequency ?? '-'} - {item.route ?? '-'}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <article className={styles.card}>
            <h2>{t('diagnoses')}</h2>
            {patient.diagnoses.length === 0 ? (
              <p className={styles.empty}>{t('none')}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('diagName')}</th>
                      <th>{t('diagCode')}</th>
                      <th>{t('diagDate')}</th>
                      <th>{t('diagStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.diagnoses.map((item) => (
                      <tr key={item.id}>
                        <td data-label={t('diagName')}>{item.diagnosisName}</td>
                        <td data-label={t('diagCode')}>{item.icd10Code ?? '-'}</td>
                        <td data-label={t('diagDate')}>{formatDate(item.diagnosedOn, locale)}</td>
                        <td data-label={t('diagStatus')}>{item.status ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('doctorNotes')}</h2>
            {patient.progressNotes.length === 0 ? (
              <p className={styles.empty}>{t('none')}</p>
            ) : (
              <ul className={styles.list}>
                {patient.progressNotes.map((item) => (
                  <li key={item.id}>
                    {formatDate(item.createdAt, locale)} - {item.enteredByStaff?.name ?? '-'} - {item.noteBody}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('physioSessions')}</h2>
            {patient.physioSessionReports.length === 0 ? (
              <p className={styles.empty}>{t('none')}</p>
            ) : (
              <ul className={styles.list}>
                {patient.physioSessionReports.map((item) => (
                  <li key={item.id}>
                    {formatDate(item.sessionDate, locale)} - Session #{item.sessionNumber} - {item.enteredByStaff?.name ?? '-'} - {item.interventions}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('nurseReports')}</h2>
            {patient.nurseDailyReports.length === 0 ? (
              <p className={styles.empty}>{t('none')}</p>
            ) : (
              <ul className={styles.list}>
                {patient.nurseDailyReports.map((item) => (
                  <li key={item.id}>
                    {formatDate(item.reportDate, locale)} - {item.shiftType ?? '-'} - {item.enteredByStaff?.name ?? '-'} - {item.nursingNotes}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>{t('labsScans')}</h2>
              {patient.documents.length === 0 ? (
                <p className={styles.empty}>{t('none')}</p>
              ) : (
                <ul className={styles.list}>
                  {patient.documents.map((item) => (
                    <li key={item.id}>
                      {item.category} - {item.title} ({formatDate(item.createdAt, locale)})
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={styles.card}>
              <h2>{t('recentVisits')}</h2>
              {patient.visits.length === 0 ? (
                <p className={styles.empty}>{t('none')}</p>
              ) : (
                <ul className={styles.list}>
                  {patient.visits.map((item) => (
                    <li key={item.id}>
                      {formatDate(item.scheduledDate, locale)} - {item.service.name} - {item.provider?.fullName ?? '-'} - {formatVisitType(item.visitType)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <p className={styles.footerNote}>{t('footerNote')}</p>
        </article>
      </section>
    </main>
  );
}
