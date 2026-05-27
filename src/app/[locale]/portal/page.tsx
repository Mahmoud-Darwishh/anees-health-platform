import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { PortalDataTable } from '@/features/portal/components/PortalDataTable';
import { PortalMetricCard } from '@/features/portal/components/PortalMetricCard';
import { PortalSectionCard } from '@/features/portal/components/PortalSectionCard';
import { PortalShell, type PortalSectionItem } from '@/features/portal/components/PortalShell';
import {
  DistributionCard,
  RingProgressCard,
  SparklineCard,
  type ChartSeriesPoint,
} from '@/components/admin/EhrCharts';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './portal.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
};

// ── Formatting helpers ───────────────────────────────────────────────────────
function formatDate(value: Date | null, locale: string): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function formatNullable(value: string | null | undefined): string {
  if (!value) return '-';
  const trimmed = value.trim();
  return trimmed ? trimmed : '-';
}

function formatVisitType(value: string): string {
  if (value === 'telemedicine') return 'Telemedicine';
  return 'In-home';
}

function classifyDocumentCategory(category: string): 'lab' | 'scan' | 'other' {
  const normalized = category.toLowerCase();
  if (normalized.includes('lab') || normalized.includes('pathology') || normalized.includes('result')) return 'lab';
  if (normalized.includes('scan') || normalized.includes('radiology') || normalized.includes('xray') || normalized.includes('mri') || normalized.includes('ct')) return 'scan';
  return 'other';
}

function enumLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function decimalToNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value || typeof value !== 'object') return null;
  if (!('toString' in value) || typeof value.toString !== 'function') return null;

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: unknown, locale: string): string {
  const amount = decimalToNumber(value);
  if (amount === null) return '-';

  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function sumDecimal(values: unknown[]): number {
  return values.reduce<number>((total, value) => {
    const parsed = decimalToNumber(value);
    return parsed === null ? total : total + parsed;
  }, 0);
}

function getGreetingKey(): 'morning' | 'afternoon' | 'evening' {
  // Use Africa/Cairo as the platform's reference timezone.
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Africa/Cairo',
    }).format(new Date()),
  );

  if (Number.isNaN(hour)) return 'morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first ?? fullName;
}

function buildMonthlyVisitSeries(visits: { scheduledDate: Date | null }[], locale: string): ChartSeriesPoint[] {
  const months: { key: string; label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: `${ref.getFullYear()}-${ref.getMonth()}`,
      label: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'Africa/Cairo' }).format(ref),
      year: ref.getFullYear(),
      month: ref.getMonth(),
    });
  }

  return months.map((bucket) => {
    const count = visits.filter((visit) => {
      if (!visit.scheduledDate) return false;
      const d = new Date(visit.scheduledDate);
      return d.getFullYear() === bucket.year && d.getMonth() === bucket.month;
    }).length;

    return { label: bucket.label, value: count };
  });
}

// ── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });

  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
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
          <header className={styles.hero}>
            <div>
              <p className={styles.kicker}>{t('kicker')}</p>
              <h1>{t('title')}</h1>
              <p>{t('subtitle')}</p>
            </div>
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
      primaryCaregiverPhone: true,
      caregiverRelation: true,
      chiefComplaint: true,
      notes: true,
      addressDetail: true,
      insuranceProvider: true,
      insuranceMemberId: true,
      insurancePolicyNumber: true,
      insuranceExpiry: true,
      bloodGroup: true,
      area: { select: { name: true } },
      invoices: {
        orderBy: { invoiceDate: 'desc' },
        take: 8,
        select: {
          id: true,
          code: true,
          invoiceDate: true,
          dueDate: true,
          status: true,
          linkedType: true,
          netAmountEgp: true,
          grossAmountEgp: true,
          linkedVisit: { select: { code: true } },
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 8,
        select: {
          id: true,
          code: true,
          paymentDate: true,
          amountEgp: true,
          referenceNumber: true,
          invoice: { select: { code: true } },
          paymentMethod: { select: { name: true } },
        },
      },
      visits: {
        orderBy: { scheduledDate: 'desc' },
        take: 24,
        select: {
          id: true,
          code: true,
          scheduledDate: true,
          status: true,
          visitType: true,
          notes: true,
          service: { select: { name: true, category: { select: { code: true, name: true } } } },
          provider: {
            select: {
              fullName: true,
              role: { select: { code: true, name: true } },
            },
          },
        },
      },
      diagnoses: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          icd10Code: true,
          diagnosisName: true,
          diagnosedOn: true,
          status: true,
          visit: { select: { code: true } },
        },
      },
      medications: {
        where: { deletedAt: null },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          medicationName: true,
          dose: true,
          frequency: true,
          route: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
      },
      allergies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          allergen: true,
          severity: true,
          reaction: true,
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
      progressNotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          noteBody: true,
          createdAt: true,
          signedOffAt: true,
          enteredByStaff: { select: { name: true } },
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          storagePath: true,
        },
      },
      labOrders: {
        orderBy: { orderedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          testName: true,
          status: true,
          priority: true,
          orderedAt: true,
          targetDate: true,
          resultSummary: true,
        },
      },
      imagingOrders: {
        orderBy: { orderedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          studyName: true,
          modality: true,
          bodyPart: true,
          status: true,
          priority: true,
          orderedAt: true,
        },
      },
      medicationOrders: {
        orderBy: { orderedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          medicationName: true,
          dose: true,
          frequency: true,
          route: true,
          status: true,
          orderedAt: true,
        },
      },
      nursingOrders: {
        orderBy: { orderedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          orderTitle: true,
          frequency: true,
          status: true,
          orderedAt: true,
        },
      },
      physioOrders: {
        orderBy: { orderedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          orderTitle: true,
          frequency: true,
          sessionCount: true,
          status: true,
          orderedAt: true,
        },
      },
      careTasks: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          taskType: true,
          priority: true,
          status: true,
          dueAt: true,
        },
      },
      riskFlags: {
        where: { isActive: true },
        orderBy: { flaggedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          code: true,
          severity: true,
          notes: true,
        },
      },
      medicalHistories: {
        where: { deletedAt: null },
        orderBy: [{ onsetDate: 'desc' }, { createdAt: 'desc' }],
        take: 12,
        select: {
          id: true,
          conditionName: true,
          onsetDate: true,
          status: true,
          notes: true,
        },
      },
      physioSessionReports: {
        where: { deletedAt: null },
        orderBy: { sessionDate: 'desc' },
        take: 24,
        select: {
          id: true,
          sessionNumber: true,
          sessionDate: true,
          interventions: true,
          response: true,
          painScoreBefore: true,
          painScoreAfter: true,
          mobilityNote: true,
          visit: { select: { code: true } },
        },
      },
    },
  });

  if (!patient) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.hero}>
            <div>
              <p className={styles.kicker}>{t('kicker')}</p>
              <h1>{t('title')}</h1>
              <p>{t('subtitle')}</p>
            </div>
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

  // ── Derived data for overview ──────────────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [totalVisits, totalDocuments, activeMedicationCount, visitsTrend] = await Promise.all([
    prisma.visit.count({ where: { patientId: patient.id } }),
    prisma.document.count({ where: { patientId: patient.id, deletedAt: null } }),
    prisma.medication.count({ where: { patientId: patient.id, deletedAt: null, isActive: true } }),
    prisma.visit.findMany({
      where: { patientId: patient.id, scheduledDate: { gte: sixMonthsAgo } },
      select: { scheduledDate: true },
    }),
  ]);

  const outstandingInvoices = patient.invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled');
  const paidInvoices = patient.invoices.filter((invoice) => invoice.status === 'paid');
  const outstandingAmount = sumDecimal(outstandingInvoices.map((invoice) => invoice.netAmountEgp));
  const paidAmount = sumDecimal(paidInvoices.map((invoice) => invoice.netAmountEgp));
  const totalBilled = outstandingAmount + paidAmount;

  const labDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'lab');
  const scanDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'scan');
  const otherDocuments = patient.documents.filter((doc) => classifyDocumentCategory(doc.category) === 'other');
  const latestVisit = patient.visits[0] ?? null;
  const monthlyVisitSeries = buildMonthlyVisitSeries(visitsTrend, locale);

  const generalInfoRows = [
    [t('profile.caseId'), patient.code],
    [t('profile.fullName'), patient.fullName],
    [t('profile.phone'), patient.phone],
    [t('profile.gender'), formatNullable(patient.gender)],
    [t('profile.dateOfBirth'), formatDate(patient.dateOfBirth, locale)],
    [t('profile.registrationDate'), formatDate(patient.registrationDate, locale)],
    [t('profile.area'), patient.area?.name ?? '-'],
    [t('profile.address'), formatNullable(patient.addressDetail)],
    [t('profile.caregiver'), formatNullable(patient.primaryCaregiver)],
    [t('workspace.caregiverPhone'), formatNullable(patient.primaryCaregiverPhone)],
    [t('profile.caregiverRelation'), formatNullable(patient.caregiverRelation)],
    [t('workspace.bloodGroup'), formatNullable(patient.bloodGroup)],
  ];

  // ── Sections (each short, focused on one concern) ──────────────────────────
  const sections: PortalSectionItem[] = [
    {
      id: 'overview',
      label: t('nav.overview'),
      icon: 'fa-solid fa-grip',
      content: (
        <>
          <section className={styles.metricsGrid} aria-label={t('summaryLabel')}>
            <PortalMetricCard
              className={styles.metricCard}
              label={t('summary.totalVisits')}
              value={totalVisits}
              hint={latestVisit ? formatDate(latestVisit.scheduledDate, locale) : t('none')}
            />
            <PortalMetricCard
              className={styles.metricCard}
              label={t('summary.activeMedications')}
              value={activeMedicationCount}
              hint={t('medications.title')}
            />
            <PortalMetricCard
              className={styles.metricCard}
              label={t('financial.outstandingAmount')}
              value={formatMoney(outstandingAmount, locale)}
              hint={`${outstandingInvoices.length} ${t('financial.openInvoices')}`}
            />
            <PortalMetricCard
              className={styles.metricCard}
              label={t('documents.title')}
              value={totalDocuments}
              hint={`${labDocuments.length} ${t('documents.labs')} / ${scanDocuments.length} ${t('documents.scans')}`}
            />
          </section>

          <section className={styles.chartsGrid} aria-label={t('overview.chartsLabel')}>
            <SparklineCard
              tone="navy"
              title={t('overview.visitTrendTitle')}
              subtitle={t('overview.visitTrendSubtitle')}
              points={monthlyVisitSeries}
            />
            <DistributionCard
              title={t('overview.documentsTitle')}
              subtitle={t('overview.documentsSubtitle')}
              items={[
                { label: t('documents.labs'), value: labDocuments.length, tone: 'navy' },
                { label: t('documents.scans'), value: scanDocuments.length, tone: 'gold' },
                { label: t('documents.other'), value: otherDocuments.length, tone: 'slate' },
              ]}
            />
            <RingProgressCard
              tone="gold"
              title={t('overview.billingTitle')}
              subtitle={t('overview.billingSubtitle')}
              value={paidAmount}
              total={totalBilled > 0 ? totalBilled : 1}
              detail={`${formatMoney(outstandingAmount, locale)} ${t('financial.outstandingAmount').toLowerCase()}`}
            />
          </section>

          <PortalSectionCard
            className={styles.panelCard}
            title={t('clinical.title')}
            subtitle={t('clinical.disclaimer')}
          >
            <div className={styles.twoCol}>
              <div className={styles.infoTile}>
                <h3>{t('clinical.chiefComplaint')}</h3>
                <p>{patient.chiefComplaint ?? t('none')}</p>
              </div>
              <div className={styles.infoTile}>
                <h3>{t('clinical.notes')}</h3>
                <p>{patient.notes ?? t('none')}</p>
              </div>
            </div>
          </PortalSectionCard>
        </>
      ),
    },
    {
      id: 'profile',
      label: t('nav.profile'),
      icon: 'fa-solid fa-user',
      content: (
        <PortalSectionCard
          className={styles.panelCard}
          title={t('profile.title')}
          subtitle={t('tabs.general')}
        >
          <PortalDataTable
            headers={[t('workspace.field'), t('workspace.value')]}
            rows={generalInfoRows}
            emptyText={t('none')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />
        </PortalSectionCard>
      ),
    },
    {
      id: 'visits',
      label: t('nav.visits'),
      icon: 'fa-solid fa-calendar-days',
      count: patient.visits.length,
      content: (() => {
        type VisitRow = (typeof patient.visits)[number];
        const classify = (v: VisitRow): 'physio' | 'nursing' | 'doctor' => {
          const roleCode = v.provider?.role?.code ?? '';
          const roleName = (v.provider?.role?.name ?? '').toLowerCase();
          const catCode = v.service.category?.code ?? '';
          const catName = (v.service.category?.name ?? '').toLowerCase();
          if (roleCode === 'RL-02' || roleName.includes('physio') || catCode === 'CAT-02' || catName.includes('physio')) return 'physio';
          if (roleCode === 'RL-03' || roleCode === 'RL-04' || roleName.includes('nurse') || catCode === 'CAT-03' || catCode === 'CAT-04' || catName.includes('nurs')) return 'nursing';
          return 'doctor';
        };
        const doctorVisits = patient.visits.filter((v) => classify(v) === 'doctor');
        const physioVisits = patient.visits.filter((v) => classify(v) === 'physio');
        const nursingVisits = patient.visits.filter((v) => classify(v) === 'nursing');
        const visitRow = (visit: VisitRow) => [
          formatDate(visit.scheduledDate, locale),
          visit.service.name,
          visit.provider?.fullName ?? '-',
          formatVisitType(visit.visitType),
          t(`visitStatus.${visit.status}`),
        ];
        const headers = [
          t('visits.date'),
          t('visits.service'),
          t('visits.provider'),
          t('visits.type'),
          t('visits.status'),
        ];
        return (
          <PortalSectionCard
            className={styles.panelCard}
            title={t('visits.title')}
            subtitle={t('tabs.visits')}
          >
            <h3 className={styles.blockTitle}>{t('visits.doctor')} <span className={styles.blockCount}>{doctorVisits.length}</span></h3>
            <PortalDataTable
              headers={headers}
              rows={doctorVisits.map(visitRow)}
              emptyText={t('visits.doctorEmpty')}
              wrapperClassName={styles.tableWrap}
              tableClassName={styles.table}
            />

            <h3 className={styles.blockTitle}>{t('visits.physio')} <span className={styles.blockCount}>{physioVisits.length}</span></h3>
            <PortalDataTable
              headers={headers}
              rows={physioVisits.map(visitRow)}
              emptyText={t('visits.physioEmpty')}
              wrapperClassName={styles.tableWrap}
              tableClassName={styles.table}
            />

            <h3 className={styles.blockTitle}>{t('visits.nursing')} <span className={styles.blockCount}>{nursingVisits.length}</span></h3>
            <PortalDataTable
              headers={headers}
              rows={nursingVisits.map(visitRow)}
              emptyText={t('visits.nursingEmpty')}
              wrapperClassName={styles.tableWrap}
              tableClassName={styles.table}
            />

            <h3 className={styles.blockTitle}>{t('doctorNotes.title')}</h3>
            <PortalDataTable
              headers={[
                t('workspace.recordDate'),
                t('doctorNotes.by'),
                t('workspace.notes'),
                t('financial.status'),
              ]}
              rows={patient.progressNotes.map((note) => [
                formatDate(note.createdAt, locale),
                note.enteredByStaff?.name ?? '-',
                note.noteBody,
                note.signedOffAt ? t('doctorNotes.signed') : t('doctorNotes.draft'),
              ])}
              emptyText={t('doctorNotes.empty')}
              wrapperClassName={styles.tableWrap}
              tableClassName={styles.table}
            />
          </PortalSectionCard>
        );
      })(),
    },
    {
      id: 'medical',
      label: t('nav.medical'),
      icon: 'fa-solid fa-heart-pulse',
      count: activeMedicationCount,
      content: (
        <PortalSectionCard
          className={styles.panelCard}
          title={t('clinical.title')}
          subtitle={t('tabs.medical')}
        >
          <h3 className={styles.blockTitle}>{t('medications.title')}</h3>
          <PortalDataTable
            headers={[
              t('medications.name'),
              t('medications.dose'),
              t('medications.frequency'),
              t('medications.period'),
              t('medications.status'),
            ]}
            rows={patient.medications.map((item) => [
              item.medicationName,
              item.dose ?? '-',
              item.frequency ?? '-',
              `${formatDate(item.startDate, locale)} - ${formatDate(item.endDate, locale)}`,
              <span key={`${item.id}-active`} className={styles.statusBadge}>{item.isActive ? t('medications.active') : t('medications.inactive')}</span>,
            ])}
            emptyText={t('medications.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('diagnoses.title')}</h3>
          <PortalDataTable
            headers={[
              t('diagnoses.title'),
              t('diagnoses.icd10'),
              t('diagnoses.date'),
              t('diagnoses.visit'),
              t('medications.status'),
            ]}
            rows={patient.diagnoses.map((item) => [
              item.diagnosisName,
              item.icd10Code ?? '-',
              formatDate(item.diagnosedOn, locale),
              item.visit?.code ?? '-',
              enumLabel(item.status),
            ])}
            emptyText={t('diagnoses.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('vitals.title')}</h3>
          <PortalDataTable
            headers={[
              t('vitals.measuredAt'),
              t('vitals.bp'),
              t('vitals.hr'),
              t('vitals.spo2'),
              t('vitals.temp'),
            ]}
            rows={patient.vitalSigns.map((item) => [
              formatDate(item.measuredAt, locale),
              item.systolicBp && item.diastolicBp ? `${item.systolicBp}/${item.diastolicBp}` : '-',
              item.heartRate ?? '-',
              item.oxygenSaturation ?? '-',
              decimalToNumber(item.temperatureC) === null ? '-' : `${decimalToNumber(item.temperatureC)} C`,
            ])}
            emptyText={t('vitals.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('allergies.title')}</h3>
          <PortalDataTable
            headers={[
              t('allergies.title'),
              t('workspace.severity'),
              t('workspace.reaction'),
            ]}
            rows={patient.allergies.map((item) => [
              item.allergen,
              item.severity ?? '-',
              item.reaction ?? '-',
            ])}
            emptyText={t('allergies.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('medicalHistory.title')}</h3>
          <PortalDataTable
            headers={[
              t('medicalHistory.condition'),
              t('medicalHistory.onset'),
              t('medicalHistory.status'),
              t('medicalHistory.notes'),
            ]}
            rows={patient.medicalHistories.map((item) => [
              item.conditionName,
              formatDate(item.onsetDate, locale),
              item.status ? enumLabel(item.status) : '-',
              item.notes ?? '-',
            ])}
            emptyText={t('medicalHistory.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />
        </PortalSectionCard>
      ),
    },
    {
      id: 'labs',
      label: t('nav.labs'),
      icon: 'fa-solid fa-file-lines',
      count: totalDocuments + patient.labOrders.length + patient.imagingOrders.length,
      content: (
        <PortalSectionCard
          className={styles.panelCard}
          title={t('documents.title')}
          subtitle={t('tabs.labs')}
        >
          <h3 className={styles.blockTitle}>{t('labsPanel.labOrders')}</h3>
          <PortalDataTable
            headers={[
              t('labsPanel.test'),
              t('workspace.priority'),
              t('financial.status'),
              t('workspace.orderedAt'),
              t('workspace.targetDate'),
            ]}
            rows={patient.labOrders.map((item) => [
              item.testName,
              enumLabel(item.priority),
              enumLabel(item.status),
              formatDate(item.orderedAt, locale),
              formatDate(item.targetDate, locale),
            ])}
            emptyText={t('labsPanel.emptyLabOrders')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('labsPanel.scanOrders')}</h3>
          <PortalDataTable
            headers={[
              t('labsPanel.study'),
              t('labsPanel.modality'),
              t('workspace.bodyPart'),
              t('financial.status'),
              t('workspace.orderedAt'),
            ]}
            rows={patient.imagingOrders.map((item) => [
              item.studyName,
              item.modality ?? '-',
              item.bodyPart ?? '-',
              enumLabel(item.status),
              formatDate(item.orderedAt, locale),
            ])}
            emptyText={t('labsPanel.emptyScanOrders')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('documents.title')}</h3>
          <PortalDataTable
            headers={[
              t('documents.title'),
              t('workspace.category'),
              t('workspace.recordDate'),
              t('workspace.fileStatus'),
            ]}
            rows={patient.documents.map((doc) => [
              <Link
                key={`${doc.id}-title`}
                href={`/${locale}/portal/documents/${doc.id}`}
                className={styles.documentLink}
              >
                <LucideIcon iconClass="fa-solid fa-file-lines" aria-hidden="true" />
                <span>{doc.title}</span>
              </Link>,
              doc.category,
              formatDate(doc.createdAt, locale),
              doc.storagePath ? (
                <span key={`${doc.id}-status`} className={styles.statusReady}>
                  {t('documents.ready')}
                </span>
              ) : (
                <span key={`${doc.id}-status`} className={styles.statusPending}>
                  {t('documents.pending')}
                </span>
              ),
            ])}
            emptyText={t('documents.emptyLabs')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />
        </PortalSectionCard>
      ),
    },
    {
      id: 'financial',
      label: t('nav.financial'),
      icon: 'fa-solid fa-credit-card',
      count: outstandingInvoices.length,
      content: (
        <PortalSectionCard
          className={styles.panelCard}
          title={t('tabs.financial')}
          subtitle={t('financial.subtitle')}
        >
          <h3 className={styles.blockTitle}>{t('financial.invoices')}</h3>
          <PortalDataTable
            headers={[
              t('financial.invoiceCode'),
              t('financial.invoiceDate'),
              t('financial.amount'),
              t('financial.status'),
              t('financial.dueDate'),
            ]}
            rows={patient.invoices.map((invoice) => [
              invoice.code,
              formatDate(invoice.invoiceDate, locale),
              formatMoney(invoice.netAmountEgp, locale),
              <span key={`${invoice.id}-status`} className={styles.statusBadge}>{enumLabel(invoice.status)}</span>,
              formatDate(invoice.dueDate, locale),
            ])}
            emptyText={t('financial.emptyInvoices')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('financial.receipts')}</h3>
          <PortalDataTable
            headers={[
              t('financial.receiptCode'),
              t('financial.paymentDate'),
              t('financial.amount'),
              t('financial.paymentMethod'),
              t('financial.reference'),
            ]}
            rows={patient.payments.map((payment) => [
              payment.code,
              formatDate(payment.paymentDate, locale),
              formatMoney(payment.amountEgp, locale),
              payment.paymentMethod.name,
              payment.referenceNumber ?? payment.invoice.code,
            ])}
            emptyText={t('financial.emptyReceipts')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <div className={styles.twoCol}>
            <div className={styles.infoTile}>
              <h3>{t('financial.insurance')}</h3>
              <p>{patient.insuranceProvider ?? t('none')}</p>
            </div>
            <div className={styles.infoTile}>
              <h3>{t('financial.policy')}</h3>
              <p>{patient.insurancePolicyNumber ?? patient.insuranceMemberId ?? t('none')}</p>
              <small>{t('financial.expiry')}: {formatDate(patient.insuranceExpiry, locale)}</small>
            </div>
          </div>
        </PortalSectionCard>
      ),
    },
    {
      id: 'care',
      label: t('nav.care'),
      icon: 'fa-solid fa-shield-halved',
      count: patient.careTasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length + patient.physioSessionReports.length,
      content: (
        <PortalSectionCard
          className={styles.panelCard}
          title={t('tabs.care')}
          subtitle={t('care.subtitle')}
        >
          <h3 className={styles.blockTitle}>{t('care.tasks')}</h3>
          <PortalDataTable
            headers={[
              t('care.task'),
              t('workspace.category'),
              t('workspace.priority'),
              t('financial.status'),
              t('workspace.targetDate'),
            ]}
            rows={patient.careTasks.map((task) => [
              task.title,
              enumLabel(task.taskType),
              enumLabel(task.priority),
              enumLabel(task.status),
              formatDate(task.dueAt, locale),
            ])}
            emptyText={t('care.emptyTasks')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('orders.title')}</h3>
          <PortalDataTable
            headers={[
              t('orders.orderType'),
              t('orders.item'),
              t('orders.frequency'),
              t('financial.status'),
              t('workspace.orderedAt'),
            ]}
            rows={[
              ...patient.medicationOrders.map((item) => [
                t('orders.medications'),
                item.medicationName,
                item.frequency ?? '-',
                enumLabel(item.status),
                formatDate(item.orderedAt, locale),
              ]),
              ...patient.nursingOrders.map((item) => [
                t('orders.nursing'),
                item.orderTitle,
                item.frequency ?? '-',
                enumLabel(item.status),
                formatDate(item.orderedAt, locale),
              ]),
              ...patient.physioOrders.map((item) => [
                t('orders.physio'),
                item.orderTitle,
                item.frequency ?? '-',
                enumLabel(item.status),
                formatDate(item.orderedAt, locale),
              ]),
            ].slice(0, 12)}
            emptyText={t('orders.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('care.riskFlags')}</h3>
          <PortalDataTable
            headers={[
              t('care.flag'),
              t('workspace.severity'),
              t('workspace.notes'),
            ]}
            rows={patient.riskFlags.map((flag) => [
              enumLabel(flag.code),
              enumLabel(flag.severity),
              flag.notes ?? '-',
            ])}
            emptyText={t('care.emptyFlags')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />

          <h3 className={styles.blockTitle}>{t('physio.title')}</h3>
          <PortalDataTable
            headers={[
              t('physio.session'),
              t('physio.date'),
              t('physio.interventions'),
              t('physio.painBefore'),
              t('physio.painAfter'),
              t('physio.response'),
            ]}
            rows={patient.physioSessionReports.map((s) => [
              `#${s.sessionNumber}`,
              formatDate(s.sessionDate, locale),
              s.interventions,
              s.painScoreBefore !== null ? `${s.painScoreBefore}/10` : '-',
              s.painScoreAfter !== null ? `${s.painScoreAfter}/10` : '-',
              s.response ?? s.mobilityNote ?? '-',
            ])}
            emptyText={t('physio.empty')}
            wrapperClassName={styles.tableWrap}
            tableClassName={styles.table}
          />
        </PortalSectionCard>
      ),
    },
  ];

  // ── Personalized greeting ─────────────────────────────────────────────────
  const greetingLine = t(`greetings.${getGreetingKey()}`);
  const patientFirstName = getFirstName(patient.fullName);

  const notices = (
    <>
      {query.updated ? <p className={styles.noticeSuccess}>{t('messages.updated')}</p> : null}
      {query.error ? <p className={styles.noticeError}>{t('messages.error')}</p> : null}
    </>
  );

  const heroHeader = (
    <header className={styles.hero}>
      <div>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>
      <div className={styles.heroActions}>
        <span className={styles.statusPill}>{t(`status.${patient.status}`)}</span>
      </div>
    </header>
  );

  return (
    <PortalShell
      sections={sections}
      defaultSectionId="overview"
      navLabel={t('workspace.tabsLabel')}
      logoSrc="/assets/img/anees-logo.png"
      logoAlt={t('brand.logoAlt')}
      brandHref={`/${locale}`}
      greetingLine={greetingLine}
      patientName={patientFirstName}
      homeHref={`/${locale}`}
      homeLabel={t('nav.home')}
      exportPdfLabel={t('actions.exportPdf')}
      switchLocaleHref={`/${locale === 'en' ? 'ar' : 'en'}/portal`}
      switchLocaleLabel={locale === 'en' ? 'العربية' : 'English'}
      notices={notices}
      header={heroHeader}
    />
  );
}
