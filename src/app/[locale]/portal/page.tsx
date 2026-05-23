import { auth } from '@/auth';
import { DistributionCard, MiniSparkline, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
import { prisma } from '@/lib/db/prisma';
import { buildDailySeries } from '@/lib/ehr/dashboard-metrics';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { submitVisitRequestAction, updatePatientProfileAction } from './actions';
import styles from './portal.module.scss';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
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

function formatNullable(value: string | null | undefined): string {
  return value && value.trim() ? value : '-';
}

function classifyDocumentCategory(category: string): 'lab' | 'scan' | 'other' {
  const normalized = category.toLowerCase();
  if (normalized.includes('lab') || normalized.includes('pathology') || normalized.includes('result')) return 'lab';
  if (normalized.includes('scan') || normalized.includes('radiology') || normalized.includes('xray') || normalized.includes('mri') || normalized.includes('ct')) return 'scan';
  return 'other';
}

function formatDecimalLike(value: unknown): string {
  if (typeof value === 'number') return value.toString();
  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    return value.toString();
  }
  return '-';
}

function portalLocale(locale: string): string {
  return locale === 'ar' ? 'ar-EG' : 'en-GB';
}

function StatIcon({ kind }: { kind: 'visits' | 'calendar' | 'plan' | 'medication' | 'diagnosis' | 'document' | 'vitals' | 'last' }) {
  if (kind === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M8 4v4M16 4v4M4 10h16" />
      </svg>
    );
  }

  if (kind === 'plan') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 13l4 4L19 7" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    );
  }

  if (kind === 'medication') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 7l10 10" />
        <rect x="4" y="10" width="8" height="5" rx="2" />
        <rect x="12" y="9" width="8" height="6" rx="2" />
      </svg>
    );
  }

  if (kind === 'diagnosis') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
      </svg>
    );
  }

  if (kind === 'document') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v6h6" />
      </svg>
    );
  }

  if (kind === 'vitals') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 13h4l2-4 3 8 2-4h7" />
      </svg>
    );
  }

  if (kind === 'last') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });

  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function PatientPortalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: 'portal' });
  const session = await auth();

  if (!session || session.user.role !== 'patient') {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/portal`);
  }

  if (!session.user.patientId) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.headerCard}>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </header>

          <article className={styles.emptyCard}>
            <h2>{t('notLinkedTitle')}</h2>
            <p>{t('notLinkedText')}</p>
            <Link href={`/${locale}/auth/link-account`} className={styles.primaryBtn}>
              {t('linkAccountCta')}
            </Link>
          </article>
        </section>
      </main>
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: session.user.patientId },
    select: {
      id: true,
      code: true,
      fullName: true,
      phone: true,
      status: true,
      gender: true,
      dateOfBirth: true,
      registrationDate: true,
      primaryCaregiver: true,
      caregiverRelation: true,
      chiefComplaint: true,
      notes: true,
      addressDetail: true,
      area: { select: { name: true } },
      visits: {
        orderBy: { scheduledDate: 'desc' },
        take: 12,
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
      medicalHistories: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          conditionName: true,
          status: true,
          onsetDate: true,
          notes: true,
        },
      },
      allergies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          allergen: true,
          severity: true,
          reaction: true,
          notes: true,
          updatedAt: true,
        },
      },
      diagnoses: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          icd10Code: true,
          diagnosisName: true,
          diagnosedOn: true,
          status: true,
          notes: true,
          visit: { select: { code: true } },
          enteredByStaff: { select: { name: true } },
        },
      },
      medications: {
        where: { deletedAt: null },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        take: 20,
        select: {
          id: true,
          medicationName: true,
          dose: true,
          frequency: true,
          route: true,
          startDate: true,
          endDate: true,
          isActive: true,
          notes: true,
        },
      },
      progressNotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          noteBody: true,
          createdAt: true,
          signedOffAt: true,
          enteredByStaff: { select: { name: true } },
          visit: { select: { code: true } },
        },
      },
      physioSessionReports: {
        where: { deletedAt: null },
        orderBy: { sessionDate: 'desc' },
        take: 16,
        select: {
          id: true,
          sessionDate: true,
          sessionNumber: true,
          interventions: true,
          response: true,
          painScoreBefore: true,
          painScoreAfter: true,
          homeExercisePlan: true,
          enteredByStaff: { select: { name: true } },
        },
      },
      nurseDailyReports: {
        where: { deletedAt: null },
        orderBy: { reportDate: 'desc' },
        take: 16,
        select: {
          id: true,
          reportDate: true,
          shiftType: true,
          generalCondition: true,
          nursingNotes: true,
          escalationFlag: true,
          followUpInstructions: true,
          enteredByStaff: { select: { name: true } },
        },
      },
      vitalSigns: {
        where: { deletedAt: null },
        orderBy: { measuredAt: 'desc' },
        take: 8,
        select: {
          id: true,
          measuredAt: true,
          systolicBp: true,
          diastolicBp: true,
          heartRate: true,
          oxygenSaturation: true,
          temperatureC: true,
          weightKg: true,
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          mimeType: true,
          storagePath: true,
        },
      },
      carePlans: {
        where: { status: 'active' },
        select: { id: true },
      },
    },
  });

  if (!patient) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.headerCard}>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </header>

          <article className={styles.emptyCard}>
            <h2>{t('notFoundTitle')}</h2>
            <p>{t('notFoundText')}</p>
            <Link href={`/${locale}`} className={styles.primaryBtn}>
              {t('goHomeCta')}
            </Link>
          </article>
        </section>
      </main>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalVisits,
    upcomingVisits,
    completedVisits,
    visitTrend,
    avgHeartRateTrend,
    avgSpo2Trend,
    documentTrend,
  ] = await Promise.all([
    prisma.visit.count({ where: { patientId: patient.id } }),
    prisma.visit.count({
      where: {
        patientId: patient.id,
        scheduledDate: { gte: today },
        status: { in: ['scheduled', 'rescheduled', 'in_progress'] },
      },
    }),
    prisma.visit.count({
      where: {
        patientId: patient.id,
        status: 'completed',
      },
    }),
    buildDailySeries(
      (start, end) => prisma.visit.count({
        where: {
          patientId: patient.id,
          scheduledDate: { gte: start, lt: end },
        },
      }),
      7,
      portalLocale(locale),
    ),
    buildDailySeries(
      async (start, end) => {
        const vitals = await prisma.vitalSigns.findMany({
          where: {
            patientId: patient.id,
            deletedAt: null,
            measuredAt: { gte: start, lt: end },
          },
          select: { heartRate: true },
        });

        const rates = vitals
          .map((item) => item.heartRate)
          .filter((value): value is number => typeof value === 'number');

        if (rates.length === 0) return 0;

        return Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length);
      },
      7,
      portalLocale(locale),
    ),
    buildDailySeries(
      async (start, end) => {
        const vitals = await prisma.vitalSigns.findMany({
          where: {
            patientId: patient.id,
            deletedAt: null,
            measuredAt: { gte: start, lt: end },
          },
          select: { oxygenSaturation: true },
        });

        const values = vitals
          .map((item) => item.oxygenSaturation)
          .filter((value): value is number => typeof value === 'number');

        if (values.length === 0) return 0;

        return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      },
      7,
      portalLocale(locale),
    ),
    buildDailySeries(
      (start, end) => prisma.document.count({
        where: {
          patientId: patient.id,
          deletedAt: null,
          createdAt: { gte: start, lt: end },
        },
      }),
      7,
      portalLocale(locale),
    ),
  ]);

  const recentVisits = patient.visits;
  const actionableUpcomingVisits = recentVisits.filter((visit) =>
    ['scheduled', 'rescheduled', 'in_progress'].includes(visit.status)
  );
  const lastVisit = recentVisits[0] ?? null;

  const activeMedications = patient.medications.filter((item) => item.isActive);
  const labDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'lab');
  const scanDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'scan');
  const otherDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'other');
  const latestVitals = patient.vitalSigns[0] ?? null;
  const readyDocuments = patient.documents.filter((doc) => Boolean(doc.storagePath)).length;
  const pendingDocuments = Math.max(patient.documents.length - readyDocuments, 0);
  const nextScheduledVisit = actionableUpcomingVisits[0] ?? null;
  const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;
  const latestSpo2 = latestVitals?.oxygenSaturation ?? null;

  const visitMiniTrend = visitTrend.map((point) => ({ value: point.value }));
  const heartRateMiniTrend = avgHeartRateTrend.map((point) => ({ value: point.value }));
  const spo2MiniTrend = avgSpo2Trend.map((point) => ({ value: point.value }));
  const documentMiniTrend = documentTrend.map((point) => ({ value: point.value }));

  const recordMix = [
    { label: t('summary.activeMedications'), value: activeMedications.length, tone: 'navy' as const },
    { label: t('summary.totalDiagnoses'), value: patient.diagnoses.length, tone: 'gold' as const },
    { label: t('allergies.title'), value: patient.allergies.length, tone: 'teal' as const },
    { label: t('doctorNotes.title'), value: patient.progressNotes.length, tone: 'slate' as const },
  ];

  const visitStatusMix = [
    { label: t('visitStatus.completed'), value: recentVisits.filter((visit) => visit.status === 'completed').length, tone: 'navy' as const },
    { label: t('visitStatus.scheduled'), value: recentVisits.filter((visit) => visit.status === 'scheduled').length, tone: 'gold' as const },
    { label: t('visitStatus.in_progress'), value: recentVisits.filter((visit) => visit.status === 'in_progress').length, tone: 'teal' as const },
    { label: t('visitStatus.rescheduled'), value: recentVisits.filter((visit) => visit.status === 'rescheduled').length, tone: 'slate' as const },
  ];

  const documentMix = [
    { label: t('documents.labs'), value: labDocuments.length, tone: 'gold' as const },
    { label: t('documents.scans'), value: scanDocuments.length, tone: 'navy' as const },
    { label: t('documents.other'), value: otherDocuments.length, tone: 'slate' as const },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        {query.updated && <p className={styles.noticeSuccess}>{t('messages.updated')}</p>}
        {query.error && <p className={styles.noticeError}>{t('messages.error')}</p>}

        <header className={`${styles.headerCard} ${styles.dashboardHero}`}>
          <div className={styles.dashboardIntro}>
            <p className={styles.kicker}>{t('kicker')}</p>
            <h1>{t('title')}</h1>
            <p className={styles.dashboardSubtitle}>{t('subtitle')}</p>

            <div className={styles.heroPills}>
              <span className={styles.statusPill}>{t(`status.${patient.status}`)}</span>
              <span className={styles.heroPill}>
                <StatIcon kind="document" />
                <strong>{readyDocuments}/{patient.documents.length}</strong>
                <em>{t('documents.ready')}</em>
              </span>
              <span className={styles.heroPill}>
                <StatIcon kind="calendar" />
                <strong>{nextScheduledVisit ? formatDate(nextScheduledVisit.scheduledDate, locale) : t('none')}</strong>
                <em>{t('summary.upcomingVisits')}</em>
              </span>
              <span className={styles.heroPill}>
                <StatIcon kind="plan" />
                <strong>{completionRate}%</strong>
                <em>{t('visitStatus.completed')}</em>
              </span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <Link href={`/${locale}/portal/summary`} className={styles.headerActionBtn}>
              {t('portableSummary.cta')}
            </Link>
            <Link href="#requests-panel" className={styles.headerActionBtn}>
              {t('requests.title')}
            </Link>
          </div>
        </header>

        <section className={styles.statsGrid} aria-label={t('summaryLabel')}>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="visits" /></span>
              <p>{t('summary.totalVisits')}</p>
            </div>
            <strong>{totalVisits}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="calendar" /></span>
              <p>{t('summary.upcomingVisits')}</p>
            </div>
            <strong>{upcomingVisits}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="plan" /></span>
              <p>{t('summary.activeCarePlans')}</p>
            </div>
            <strong>{patient.carePlans.length}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="last" /></span>
              <p>{t('summary.lastVisit')}</p>
            </div>
            <strong>{lastVisit ? formatDate(lastVisit.scheduledDate, locale) : t('none')}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="medication" /></span>
              <p>{t('summary.activeMedications')}</p>
            </div>
            <strong>{activeMedications.length}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="diagnosis" /></span>
              <p>{t('summary.totalDiagnoses')}</p>
            </div>
            <strong>{patient.diagnoses.length}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="document" /></span>
              <p>{t('summary.labReports')}</p>
            </div>
            <strong>{labDocuments.length}</strong>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statHead}>
              <span className={styles.statIcon} aria-hidden="true"><StatIcon kind="vitals" /></span>
              <p>{t('summary.latestBp')}</p>
            </div>
            <strong>
              {latestVitals && latestVitals.systolicBp && latestVitals.diastolicBp
                ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
                : t('none')}
            </strong>
          </article>
        </section>

        <nav className={styles.quickNav} aria-label={t('summaryLabel')}>
          <Link href="#profile-panel" className={styles.quickNavItem}>
            <StatIcon kind="diagnosis" />
            {t('profile.title')}
          </Link>
          <Link href="#clinical-panel" className={styles.quickNavItem}>
            <StatIcon kind="vitals" />
            {t('clinical.title')}
          </Link>
          <Link href="#requests-panel" className={styles.quickNavItem}>
            <StatIcon kind="calendar" />
            {t('requests.title')}
          </Link>
          <Link href="#documents-panel" className={styles.quickNavItem}>
            <StatIcon kind="document" />
            {t('documents.title')}
          </Link>
          <Link href="#visits-panel" className={styles.quickNavItem}>
            <StatIcon kind="visits" />
            {t('visits.title')}
          </Link>
        </nav>

        <section className={styles.eliteBand} aria-label={t('summaryLabel')}>
          <article className={styles.eliteCard}>
            <div className={styles.eliteCardHead}>
              <span className={styles.eliteIcon}><StatIcon kind="visits" /></span>
              <p>{t('summary.totalVisits')}</p>
            </div>
            <strong className={styles.eliteValue}>{totalVisits}</strong>
            <p className={styles.eliteMeta}>{t('requests.title')}: {actionableUpcomingVisits.length}</p>
            <MiniSparkline points={visitMiniTrend} tone="navy" ariaLabel={t('summary.totalVisits')} />
          </article>

          <article className={styles.eliteCard}>
            <div className={styles.eliteCardHead}>
              <span className={styles.eliteIcon}><StatIcon kind="vitals" /></span>
              <p>{t('vitals.hr')}</p>
            </div>
            <strong className={styles.eliteValue}>{avgHeartRateTrend.at(-1)?.value ?? 0}</strong>
            <p className={styles.eliteMeta}>{t('summary.latestBp')}: {latestVitals && latestVitals.systolicBp && latestVitals.diastolicBp ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}` : t('none')}</p>
            <MiniSparkline points={heartRateMiniTrend} tone="gold" ariaLabel={t('vitals.hr')} />
          </article>

          <article className={styles.eliteCard}>
            <div className={styles.eliteCardHead}>
              <span className={styles.eliteIcon}><StatIcon kind="vitals" /></span>
              <p>{t('vitals.spo2')}</p>
            </div>
            <strong className={styles.eliteValue}>{latestSpo2 ?? 0}</strong>
            <p className={styles.eliteMeta}>{t('summary.upcomingVisits')}: {upcomingVisits}</p>
            <MiniSparkline points={spo2MiniTrend} tone="navy" ariaLabel={t('vitals.spo2')} />
          </article>

          <article className={styles.eliteCard}>
            <div className={styles.eliteCardHead}>
              <span className={styles.eliteIcon}><StatIcon kind="document" /></span>
              <p>{t('documents.title')}</p>
            </div>
            <strong className={styles.eliteValue}>{readyDocuments}/{patient.documents.length}</strong>
            <p className={styles.eliteMeta}>{t('documents.pending')}: {pendingDocuments}</p>
            <MiniSparkline points={documentMiniTrend} tone="gold" ariaLabel={t('documents.title')} />
          </article>
        </section>

        <section className={styles.visualGrid}>
          <div className={styles.visualSpanTwo}>
            <SparklineCard
              title={t('visits.title')}
              subtitle={t('summary.upcomingVisits')}
              points={visitTrend}
              tone="navy"
            />
          </div>

          <div className={styles.visualCard}>
            <SparklineCard
              title={t('vitals.title')}
              subtitle={t('vitals.hr')}
              points={avgHeartRateTrend}
              tone="gold"
            />
          </div>

          <div className={styles.visualCard}>
            <SparklineCard
              title={t('vitals.spo2')}
              subtitle={t('vitals.measuredAt')}
              points={avgSpo2Trend}
              tone="navy"
            />
          </div>

          <div className={styles.visualCard}>
            <DistributionCard
              title={t('clinical.title')}
              subtitle={t('summary.totalDiagnoses')}
              items={recordMix}
            />
          </div>

          <div className={styles.visualCard}>
            <DistributionCard
              title={t('visits.title')}
              subtitle={t('visitStatus.in_progress')}
              items={visitStatusMix}
            />
          </div>

          <div className={styles.visualCard}>
            <DistributionCard
              title={t('documents.title')}
              subtitle={t('documents.subtitle')}
              items={documentMix}
            />
          </div>

          <div className={styles.visualCard}>
            <RingProgressCard
              title={t('documents.title')}
              subtitle={t('documents.subtitle')}
              value={readyDocuments}
              total={Math.max(patient.documents.length, 1)}
              detail={`${readyDocuments}/${patient.documents.length}`}
              tone="gold"
            />
          </div>

          <div className={styles.visualCard}>
            <RingProgressCard
              title={t('requests.title')}
              subtitle={t('summary.totalVisits')}
              value={completedVisits}
              total={Math.max(totalVisits, 1)}
              detail={`${completedVisits}/${totalVisits}`}
              tone="navy"
            />
          </div>

          <div className={styles.visualCard}>
            <article className={styles.visualInfoCard}>
              <h3>{t('portableSummary.title')}</h3>
              <p>{t('portableSummary.description')}</p>
              <ul>
                <li>{t('summary.totalVisits')}: {totalVisits}</li>
                <li>{t('requests.title')}: {actionableUpcomingVisits.length}</li>
                <li>{t('summary.activeMedications')}: {activeMedications.length}</li>
                <li>{t('summary.totalDiagnoses')}: {patient.diagnoses.length}</li>
                <li>{t('documents.pending')}: {pendingDocuments}</li>
              </ul>
            </article>
          </div>
        </section>

        <article className={`${styles.card} ${styles.highlightCard}`}>
          <div>
            <h2>{t('portableSummary.title')}</h2>
            <p>{t('portableSummary.description')}</p>
          </div>
          <div className={styles.highlightActions}>
            <Link href={`/${locale}/portal/summary`} className={styles.primaryBtn}>
              {t('portableSummary.openButton')}
            </Link>
            <p className={styles.disclaimer}>{t('portableSummary.tip')}</p>
          </div>
        </article>

        <section className={styles.grid}>
          <article className={styles.card} id="profile-panel">
            <div className={styles.cardHeaderRow}>
              <h2>{t('profile.title')}</h2>
              <span className={styles.editBadge}>{t('profile.editable')}</span>
            </div>
            <dl className={styles.metaList}>
              <div>
                <dt>{t('profile.caseId')}</dt>
                <dd>{patient.code}</dd>
              </div>
              <div>
                <dt>{t('profile.fullName')}</dt>
                <dd>{patient.fullName}</dd>
              </div>
              <div>
                <dt>{t('profile.phone')}</dt>
                <dd>{patient.phone}</dd>
              </div>
              <div>
                <dt>{t('profile.gender')}</dt>
                <dd>{formatNullable(patient.gender)}</dd>
              </div>
              <div>
                <dt>{t('profile.dateOfBirth')}</dt>
                <dd>{formatDate(patient.dateOfBirth, locale)}</dd>
              </div>
              <div>
                <dt>{t('profile.registrationDate')}</dt>
                <dd>{formatDate(patient.registrationDate, locale)}</dd>
              </div>
              <div>
                <dt>{t('profile.area')}</dt>
                <dd>{patient.area?.name ?? '-'}</dd>
              </div>
              <div>
                <dt>{t('profile.address')}</dt>
                <dd>{formatNullable(patient.addressDetail)}</dd>
              </div>
              <div>
                <dt>{t('profile.caregiver')}</dt>
                <dd>{formatNullable(patient.primaryCaregiver)}</dd>
              </div>
              <div>
                <dt>{t('profile.caregiverRelation')}</dt>
                <dd>{formatNullable(patient.caregiverRelation)}</dd>
              </div>
            </dl>

            <form action={updatePatientProfileAction} className={styles.profileForm}>
              <input type="hidden" name="locale" value={locale} />
              <h3>{t('profile.updateTitle')}</h3>

              <label>
                {t('profile.phone')}
                <input name="phone" defaultValue={patient.phone} required maxLength={32} />
              </label>

              <label>
                {t('profile.address')}
                <textarea name="addressDetail" defaultValue={patient.addressDetail ?? ''} rows={2} maxLength={300} />
              </label>

              <label>
                {t('profile.caregiver')}
                <input name="primaryCaregiver" defaultValue={patient.primaryCaregiver ?? ''} maxLength={120} />
              </label>

              <label>
                {t('profile.caregiverRelation')}
                <input name="caregiverRelation" defaultValue={patient.caregiverRelation ?? ''} maxLength={120} />
              </label>

              <button type="submit" className={styles.primaryBtn}>{t('profile.saveChanges')}</button>
            </form>
          </article>

          <article className={styles.card} id="clinical-panel">
            <h2>{t('clinical.title')}</h2>
            <div className={styles.textBlock}>
              <h3>{t('clinical.chiefComplaint')}</h3>
              <p>{patient.chiefComplaint ?? t('none')}</p>
            </div>
            <div className={styles.textBlock}>
              <h3>{t('clinical.notes')}</h3>
              <p>{patient.notes ?? t('none')}</p>
            </div>
            <p className={styles.disclaimer}>{t('clinical.disclaimer')}</p>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>{t('medicalHistory.title')}</h2>
            {patient.medicalHistories.length === 0 ? (
              <p className={styles.emptyText}>{t('medicalHistory.empty')}</p>
            ) : (
              <ul className={styles.recordList}>
                {patient.medicalHistories.map((item) => (
                  <li key={item.id}>
                    <div className={styles.recordHead}>
                      <strong>{item.conditionName}</strong>
                      <span>{item.status ?? t('none')}</span>
                    </div>
                    <p>{item.notes ?? t('none')}</p>
                    <small>{t('medicalHistory.onset')}: {formatDate(item.onsetDate, locale)}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('diagnoses.title')}</h2>
            {patient.diagnoses.length === 0 ? (
              <p className={styles.emptyText}>{t('diagnoses.empty')}</p>
            ) : (
              <ul className={styles.recordList}>
                {patient.diagnoses.map((item) => (
                  <li key={item.id}>
                    <div className={styles.recordHead}>
                      <strong>{item.diagnosisName}</strong>
                      <span>{item.status ?? t('none')}</span>
                    </div>
                    <p>
                      {item.icd10Code ? `${t('diagnoses.icd10')}: ${item.icd10Code}` : t('none')}
                      {' • '}
                      {t('diagnoses.date')}: {formatDate(item.diagnosedOn, locale)}
                    </p>
                    <p>{item.notes ?? t('none')}</p>
                    <small>
                      {t('diagnoses.visit')}: {item.visit?.code ?? t('none')} • {t('diagnoses.by')}: {item.enteredByStaff?.name ?? t('none')}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>{t('medications.title')}</h2>
            {patient.medications.length === 0 ? (
              <p className={styles.emptyText}>{t('medications.empty')}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('medications.name')}</th>
                      <th>{t('medications.dose')}</th>
                      <th>{t('medications.frequency')}</th>
                      <th>{t('medications.route')}</th>
                      <th>{t('medications.period')}</th>
                      <th>{t('medications.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.medications.map((item) => (
                      <tr key={item.id}>
                        <td data-label={t('medications.name')}>{item.medicationName}</td>
                        <td data-label={t('medications.dose')}>{item.dose ?? '-'}</td>
                        <td data-label={t('medications.frequency')}>{item.frequency ?? '-'}</td>
                        <td data-label={t('medications.route')}>{item.route ?? '-'}</td>
                        <td data-label={t('medications.period')}>
                          {formatDate(item.startDate, locale)} → {formatDate(item.endDate, locale)}
                        </td>
                        <td data-label={t('medications.status')}>
                          <span className={styles.visitStatus}>
                            {item.isActive ? t('medications.active') : t('medications.inactive')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('allergies.title')}</h2>
            {patient.allergies.length === 0 ? (
              <p className={styles.emptyText}>{t('allergies.empty')}</p>
            ) : (
              <ul className={styles.recordList}>
                {patient.allergies.map((item) => (
                  <li key={item.id}>
                    <div className={styles.recordHead}>
                      <strong>{item.allergen}</strong>
                      <span>{item.severity ?? t('none')}</span>
                    </div>
                    <p>{item.reaction ?? t('none')}</p>
                    <small>{item.notes ?? t('none')}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>{t('doctorNotes.title')}</h2>
            {patient.progressNotes.length === 0 ? (
              <p className={styles.emptyText}>{t('doctorNotes.empty')}</p>
            ) : (
              <ul className={styles.recordList}>
                {patient.progressNotes.map((item) => (
                  <li key={item.id}>
                    <div className={styles.recordHead}>
                      <strong>{formatDate(item.createdAt, locale)}</strong>
                      <span>{item.signedOffAt ? t('doctorNotes.signed') : t('doctorNotes.draft')}</span>
                    </div>
                    <p>{item.noteBody}</p>
                    <small>
                      {t('doctorNotes.by')}: {item.enteredByStaff?.name ?? t('none')} • {t('doctorNotes.visit')}: {item.visit?.code ?? t('none')}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('physio.title')}</h2>
            {patient.physioSessionReports.length === 0 ? (
              <p className={styles.emptyText}>{t('physio.empty')}</p>
            ) : (
              <ul className={styles.recordList}>
                {patient.physioSessionReports.map((item) => (
                  <li key={item.id}>
                    <div className={styles.recordHead}>
                      <strong>
                        {t('physio.session')} #{item.sessionNumber} • {formatDate(item.sessionDate, locale)}
                      </strong>
                      <span>
                        {t('physio.pain')}: {item.painScoreBefore ?? '-'} → {item.painScoreAfter ?? '-'}
                      </span>
                    </div>
                    <p>{item.interventions}</p>
                    <small>
                      {item.response ?? t('none')} • {t('physio.by')}: {item.enteredByStaff?.name ?? t('none')}
                    </small>
                    {item.homeExercisePlan && <small>{t('physio.homePlan')}: {item.homeExercisePlan}</small>}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('nursing.title')}</h2>
            {patient.nurseDailyReports.length === 0 ? (
              <p className={styles.emptyText}>{t('nursing.empty')}</p>
            ) : (
              <ul className={styles.recordList}>
                {patient.nurseDailyReports.map((item) => (
                  <li key={item.id}>
                    <div className={styles.recordHead}>
                      <strong>{formatDate(item.reportDate, locale)}</strong>
                      <span>{item.shiftType ?? t('none')}</span>
                    </div>
                    <p>{item.nursingNotes}</p>
                    <small>
                      {t('nursing.condition')}: {item.generalCondition ?? t('none')} • {t('nursing.escalation')}:{' '}
                      {item.escalationFlag ? t('nursing.yes') : t('nursing.no')}
                    </small>
                    {item.followUpInstructions && <small>{t('nursing.followUp')}: {item.followUpInstructions}</small>}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>{t('vitals.title')}</h2>
            {patient.vitalSigns.length === 0 ? (
              <p className={styles.emptyText}>{t('vitals.empty')}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('vitals.measuredAt')}</th>
                      <th>{t('vitals.bp')}</th>
                      <th>{t('vitals.hr')}</th>
                      <th>{t('vitals.spo2')}</th>
                      <th>{t('vitals.temp')}</th>
                      <th>{t('vitals.weight')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.vitalSigns.map((item) => (
                      <tr key={item.id}>
                        <td data-label={t('vitals.measuredAt')}>{formatDate(item.measuredAt, locale)}</td>
                        <td data-label={t('vitals.bp')}>
                          {item.systolicBp && item.diastolicBp ? `${item.systolicBp}/${item.diastolicBp}` : '-'}
                        </td>
                        <td data-label={t('vitals.hr')}>{item.heartRate ?? '-'}</td>
                        <td data-label={t('vitals.spo2')}>{item.oxygenSaturation ?? '-'}</td>
                        <td data-label={t('vitals.temp')}>
                          {item.temperatureC ? `${formatDecimalLike(item.temperatureC)} C` : '-'}
                        </td>
                        <td data-label={t('vitals.weight')}>
                          {item.weightKg ? `${formatDecimalLike(item.weightKg)} kg` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>

        <article className={styles.card} id="requests-panel">
          <h2>{t('requests.title')}</h2>
          {actionableUpcomingVisits.length === 0 ? (
            <p className={styles.emptyText}>{t('requests.empty')}</p>
          ) : (
            <div className={styles.requestGrid}>
              {actionableUpcomingVisits.map((visit) => (
                <section key={visit.id} className={styles.requestCard}>
                  <p className={styles.requestMeta}>
                    <strong>{visit.service.name}</strong> • {formatDate(visit.scheduledDate, locale)}
                  </p>
                  <p className={styles.requestSub}>
                    {t('visits.provider')}: {visit.provider?.fullName ?? t('none')}
                  </p>

                  <form action={submitVisitRequestAction} className={styles.requestFormRow}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="requestType" value="confirm" />
                    <button type="submit" className={styles.secondaryBtn}>{t('requests.confirm')}</button>
                  </form>

                  <form action={submitVisitRequestAction} className={styles.requestFormColumn}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="requestType" value="reschedule" />
                    <label>
                      {t('requests.preferredDate')}
                      <input type="date" name="requestedDate" />
                    </label>
                    <label>
                      {t('requests.notes')}
                      <input name="requestNotes" maxLength={500} placeholder={t('requests.reschedulePlaceholder')} />
                    </label>
                    <button type="submit" className={styles.secondaryBtn}>{t('requests.reschedule')}</button>
                  </form>

                  <form action={submitVisitRequestAction} className={styles.requestFormColumn}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="requestType" value="cancel" />
                    <label>
                      {t('requests.notes')}
                      <input name="requestNotes" maxLength={500} placeholder={t('requests.cancelPlaceholder')} />
                    </label>
                    <button type="submit" className={styles.dangerBtn}>{t('requests.cancel')}</button>
                  </form>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className={styles.card} id="documents-panel">
          <h2>{t('documents.title')}</h2>
          <p className={styles.documentsIntro}>{t('documents.subtitle')}</p>

          <h3 className={styles.blockTitle}>{t('documents.labs')}</h3>
          {labDocuments.length === 0 ? (
            <p className={styles.emptyText}>{t('documents.emptyLabs')}</p>
          ) : (
            <div className={styles.docsGrid}>
              {labDocuments.map((doc) => (
                <section key={doc.id} className={styles.docCard}>
                  <p className={styles.docType}>{doc.category}</p>
                  <h3>{doc.title}</h3>
                  <p>{formatDate(doc.createdAt, locale)}</p>
                  <span className={styles.docStatus}>{doc.storagePath ? t('documents.ready') : t('documents.pending')}</span>
                </section>
              ))}
            </div>
          )}

          <h3 className={styles.blockTitle}>{t('documents.scans')}</h3>
          {scanDocuments.length === 0 ? (
            <p className={styles.emptyText}>{t('documents.emptyScans')}</p>
          ) : (
            <div className={styles.docsGrid}>
              {scanDocuments.map((doc) => (
                <section key={doc.id} className={styles.docCard}>
                  <p className={styles.docType}>{doc.category}</p>
                  <h3>{doc.title}</h3>
                  <p>{formatDate(doc.createdAt, locale)}</p>
                  <span className={styles.docStatus}>{doc.storagePath ? t('documents.ready') : t('documents.pending')}</span>
                </section>
              ))}
            </div>
          )}

          {otherDocuments.length > 0 && (
            <>
              <h3 className={styles.blockTitle}>{t('documents.other')}</h3>
              <div className={styles.docsGrid}>
                {otherDocuments.map((doc) => (
                  <section key={doc.id} className={styles.docCard}>
                    <p className={styles.docType}>{doc.category}</p>
                    <h3>{doc.title}</h3>
                    <p>{formatDate(doc.createdAt, locale)}</p>
                    <span className={styles.docStatus}>{doc.storagePath ? t('documents.ready') : t('documents.pending')}</span>
                  </section>
                ))}
              </div>
            </>
          )}
        </article>

        <article className={styles.card} id="visits-panel">
          <h2>{t('visits.title')}</h2>
          {recentVisits.length === 0 ? (
            <p className={styles.emptyText}>{t('visits.empty')}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('visits.date')}</th>
                    <th>{t('visits.service')}</th>
                    <th>{t('visits.provider')}</th>
                    <th>{t('visits.type')}</th>
                    <th>{t('visits.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td data-label={t('visits.date')}>{formatDate(visit.scheduledDate, locale)}</td>
                      <td data-label={t('visits.service')}>{visit.service.name}</td>
                      <td data-label={t('visits.provider')}>{visit.provider?.fullName ?? '-'}</td>
                      <td data-label={t('visits.type')}>{formatVisitType(visit.visitType)}</td>
                      <td data-label={t('visits.status')}>
                        <span className={styles.visitStatus}>{t(`visitStatus.${visit.status}`)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
