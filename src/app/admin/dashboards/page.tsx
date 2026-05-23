import { requireStaffPermission } from '@/lib/auth';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import { DistributionCard, MiniSparkline, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
import { prisma } from '@/lib/db/prisma';
import { buildDailySeries } from '@/lib/ehr/dashboard-metrics';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './dashboard.module.scss';

export const metadata: Metadata = {
  title: 'Clinical Dashboards | Anees Admin',
  robots: { index: false, follow: false },
};

const dashboardLinks = [
  {
    key: 'doctor',
    href: '/admin/dashboards/doctor',
    label: 'Doctor Dashboard',
    focus: 'Unsigned notes and active care plans',
  },
  {
    key: 'physio',
    href: '/admin/dashboards/physio',
    label: 'Physio Dashboard',
    focus: 'Session follow-ups and rehab continuity',
  },
  {
    key: 'nurse',
    href: '/admin/dashboards/nurse',
    label: 'Nurse Dashboard',
    focus: 'Escalations and handoff readiness',
  },
  {
    key: 'medical-ops',
    href: '/admin/dashboards/medical-ops',
    label: 'Medical Ops Dashboard',
    focus: 'Follow-up closure and assignment routing',
  },
];

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatSignedMoney(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatMoney(Math.abs(value))}`;
}

function calculateAge(dateOfBirth: Date | null | undefined, now: Date): number | null {
  if (!dateOfBirth) return null;

  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const dobMonth = dateOfBirth.getMonth();
  const dobDate = dateOfBirth.getDate();

  let age = now.getFullYear() - dateOfBirth.getFullYear();
  if (todayMonth < dobMonth || (todayMonth === dobMonth && todayDate < dobDate)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function buildTrend(values: Array<number | null | undefined>): Array<{ value: number }> {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  if (valid.length === 0) return [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }];
  return [...valid].reverse().map((value) => ({ value }));
}

function toGenderLabel(value: 'M' | 'F' | 'other' | null | undefined): string {
  if (value === 'M') return 'Male';
  if (value === 'F') return 'Female';
  if (value === 'other') return 'Other';
  return 'Not set';
}

function toVisitStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateCompact(value: Date | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

export default async function DashboardsHomePage() {
  const session = await requireStaffPermission('patients.read');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    unsignedNotes,
    physioFollowUps,
    nurseEscalations,
    careFollowUps,
    visitStatusGroups,
    invoiceStatusGroups,
    payoutTransferredAgg,
    payoutLast30Agg,
    paymentLast30Agg,
    expenseLast30Agg,
    spotlightPatient,
  ] = await Promise.all([
    prisma.progressNote.count({ where: { deletedAt: null, signedOffAt: null } }),
    prisma.physioSessionReport.count({ where: { deletedAt: null, nextSessionDate: { not: null } } }),
    prisma.nurseDailyReport.count({ where: { deletedAt: null, escalationFlag: true } }),
    prisma.careTeamMessage.count({ where: { requiresFollowUp: true } }),
    prisma.visit.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.invoice.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.providerPayout.aggregate({ _sum: { netAmountEgp: true } }),
    prisma.providerPayout.aggregate({
      where: { payoutDate: { gte: thirtyDaysAgo } },
      _sum: { netAmountEgp: true },
    }),
    prisma.payment.aggregate({
      where: { paymentDate: { gte: thirtyDaysAgo } },
      _sum: { amountEgp: true },
    }),
    prisma.expense.aggregate({
      where: { expenseDate: { gte: thirtyDaysAgo } },
      _sum: { amountEgp: true },
    }),
    prisma.patient.findFirst({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        code: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        updatedAt: true,
        visits: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            service: { select: { name: true } },
            provider: { select: { fullName: true } },
          },
        },
        vitalSigns: {
          where: { deletedAt: null },
          orderBy: { measuredAt: 'desc' },
          take: 7,
          select: {
            measuredAt: true,
            systolicBp: true,
            diastolicBp: true,
            heartRate: true,
            oxygenSaturation: true,
            temperatureC: true,
            weightKg: true,
          },
        },
      },
    }),
  ]);

  const visitStatusCounts = visitStatusGroups.reduce<Record<string, number>>((acc, group) => {
    acc[group.status] = group._count._all;
    return acc;
  }, {});

  const invoiceStatusCounts = invoiceStatusGroups.reduce<Record<string, number>>((acc, group) => {
    acc[group.status] = group._count._all;
    return acc;
  }, {});

  const completedVisits = visitStatusCounts.completed ?? 0;
  const scheduledVisits = visitStatusCounts.scheduled ?? 0;
  const inProgressVisits = visitStatusCounts.in_progress ?? 0;
  const rescheduledVisits = visitStatusCounts.rescheduled ?? 0;
  const cancelledVisits = visitStatusCounts.cancelled ?? 0;
  const noShowVisits = visitStatusCounts.no_show ?? 0;

  const invoicesPaid = invoiceStatusCounts.paid ?? 0;
  const invoicesPartial = invoiceStatusCounts.partial ?? 0;
  const invoicesIssued = invoiceStatusCounts.issued ?? 0;
  const invoicesOverdue = invoiceStatusCounts.overdue ?? 0;
  const invoiceTrackedTotal = invoicesPaid + invoicesPartial + invoicesIssued + invoicesOverdue;

  const totalTransferredEgp = decimalToNumber(payoutTransferredAgg._sum.netAmountEgp);
  const totalTransferredUsd = 0;
  const payoutsLast30DaysEgp = decimalToNumber(payoutLast30Agg._sum.netAmountEgp);
  const paymentsLast30DaysEgp = decimalToNumber(paymentLast30Agg._sum.amountEgp);
  const expensesLast30DaysEgp = decimalToNumber(expenseLast30Agg._sum.amountEgp);
  const netCashflowLast30DaysEgp = paymentsLast30DaysEgp - expensesLast30DaysEgp;

  const latestVitals = spotlightPatient?.vitalSigns[0] ?? null;
  const heartRateNow = latestVitals?.heartRate ?? null;
  const oxygenNow = latestVitals?.oxygenSaturation ?? null;
  const temperatureNow = latestVitals ? decimalToNumber(latestVitals.temperatureC) : null;
  const weightNow = latestVitals ? decimalToNumber(latestVitals.weightKg) : null;
  const bpNow = latestVitals?.systolicBp && latestVitals?.diastolicBp
    ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}`
    : '-';
  const ageNow = calculateAge(spotlightPatient?.dateOfBirth, now);

  const heartTrend = buildTrend((spotlightPatient?.vitalSigns ?? []).map((item) => item.heartRate));
  const oxygenTrend = buildTrend((spotlightPatient?.vitalSigns ?? []).map((item) => item.oxygenSaturation));
  const temperatureTrend = buildTrend((spotlightPatient?.vitalSigns ?? []).map((item) => decimalToNumber(item.temperatureC)));

  const roleQueueCounts: Record<string, number> = {
    doctor: unsignedNotes,
    physio: physioFollowUps,
    nurse: nurseEscalations,
    'medical-ops': careFollowUps,
  };

  const totalQueue = unsignedNotes + physioFollowUps + nurseEscalations + careFollowUps;
  const escalationQueue = nurseEscalations + careFollowUps;

  const [weeklyRoleIntake, weeklyPayoutTransfers, weeklyCollections] = await Promise.all([
    buildDailySeries(async (start, end) => {
      const [doctor, physio, nurse, medicalOps] = await Promise.all([
        prisma.progressNote.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
        prisma.physioSessionReport.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
        prisma.nurseDailyReport.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
        prisma.careTeamMessage.count({ where: { createdAt: { gte: start, lt: end } } }),
      ]);

      return doctor + physio + nurse + medicalOps;
    }, 7),
    buildDailySeries(async (start, end) => {
      const aggregate = await prisma.providerPayout.aggregate({
        where: { payoutDate: { gte: start, lt: end } },
        _sum: { netAmountEgp: true },
      });

      return decimalToNumber(aggregate._sum.netAmountEgp);
    }, 7),
    buildDailySeries(async (start, end) => {
      const aggregate = await prisma.payment.aggregate({
        where: { paymentDate: { gte: start, lt: end } },
        _sum: { amountEgp: true },
      });

      return decimalToNumber(aggregate._sum.amountEgp);
    }, 7),
  ]);

  return (
    <AdminDashboardShell
      title="Clinical Dashboards"
      subtitle="Role workload overview."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/dashboards/doctor': unsignedNotes,
        '/admin/dashboards/physio': physioFollowUps,
        '/admin/dashboards/nurse': nurseEscalations,
        '/admin/dashboards/medical-ops': careFollowUps,
        '/admin/queues': unsignedNotes + physioFollowUps + nurseEscalations + careFollowUps,
      }}
      metrics={[
        {
          label: 'Total Transferred',
          value: `${formatMoney(totalTransferredEgp)} EGP | ${formatMoney(totalTransferredUsd)} USD`,
          hint: 'Provider payouts settled',
          tone: 'sky',
        },
        {
          label: 'Payments (30d)',
          value: `${formatMoney(paymentsLast30DaysEgp)} EGP`,
          hint: 'Collected from invoices',
          tone: 'mint',
        },
        {
          label: 'Expenses (30d)',
          value: `${formatMoney(expensesLast30DaysEgp)} EGP`,
          hint: 'Operating spend',
          tone: 'amber',
        },
        {
          label: 'Net Cashflow (30d)',
          value: `${formatSignedMoney(netCashflowLast30DaysEgp)} EGP`,
          hint: 'Payments minus expenses',
          tone: 'violet',
        },
      ]}
      quickLinks={[
        { href: '/admin/dashboards?calendar=future', label: 'Calendar Integration (Soon)' },
        { href: '/admin/patients', label: 'Patient Registry' },
        { href: '/admin/queues', label: 'Work Queues' },
        { href: '/admin/dashboards', label: 'Dashboard Hub', tone: 'primary' },
      ]}
    >
      <section className={styles.stack}>
        <header className={styles.headerRow}>
          <div>
            <h2>Choose Role Workspace</h2>
          </div>
          <div className={styles.headerActions}>
            <Link href="/admin/patients" className={styles.backLink}>Go to patient registry</Link>
            <Link href="/admin/dashboards?calendar=future" className={styles.calendarLink}>
              Future Calendar Integration
            </Link>
          </div>
        </header>

        <section className={styles.cockpitShell} aria-label="Patient insight cockpit">
          <header className={styles.cockpitHeader}>
            <div>
              <h3>Patient Insight Cockpit</h3>
              <p>Live snapshot for rapid clinical context.</p>
            </div>
            {spotlightPatient ? (
              <Link href={`/admin/patients/${spotlightPatient.id}`} className={styles.openLink}>Open Full EHR</Link>
            ) : null}
          </header>

          {spotlightPatient ? (
            <div className={styles.cockpitGrid}>
              <article className={styles.cockpitProfilePane}>
                <div className={styles.profileHero}>
                  <div className={styles.profileAvatar} aria-hidden="true">
                    {spotlightPatient.fullName.trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4>{spotlightPatient.fullName}</h4>
                    <p>{spotlightPatient.code}</p>
                  </div>
                </div>

                <dl className={styles.profileMeta}>
                  <div>
                    <dt>Gender</dt>
                    <dd>{toGenderLabel(spotlightPatient.gender)}</dd>
                  </div>
                  <div>
                    <dt>Age</dt>
                    <dd>{ageNow !== null ? `${ageNow} y.o.` : '-'}</dd>
                  </div>
                  <div>
                    <dt>Blood Group</dt>
                    <dd>{spotlightPatient.bloodGroup ?? '-'}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatDateCompact(spotlightPatient.updatedAt)}</dd>
                  </div>
                </dl>

                <div className={styles.historyPanel}>
                  <h5>Appointment History</h5>
                  {spotlightPatient.visits.length === 0 ? (
                    <p className={styles.emptyText}>No appointments available.</p>
                  ) : (
                    <ul className={styles.historyList}>
                      {spotlightPatient.visits.map((visit) => (
                        <li key={visit.id}>
                          <strong>{visit.service.name}</strong>
                          <span>{visit.provider?.fullName ?? 'Unassigned provider'}</span>
                          <span>{formatDateCompact(visit.scheduledDate)}</span>
                          <span className={styles.statusChip}>{toVisitStatusLabel(visit.status)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>

              <article className={styles.cockpitVitalsPane}>
                <div className={styles.vitalsStats}>
                  <article className={styles.vitalStatCard}>
                    <p>Heart Rate</p>
                    <strong>{heartRateNow ?? '-'}</strong>
                    <span>bpm</span>
                  </article>
                  <article className={styles.vitalStatCard}>
                    <p>Weight</p>
                    <strong>{weightNow !== null && weightNow > 0 ? formatMoney(weightNow) : '-'}</strong>
                    <span>kg</span>
                  </article>
                  <article className={styles.vitalStatCard}>
                    <p>Oxygen</p>
                    <strong>{oxygenNow ?? '-'}</strong>
                    <span>% SpO2</span>
                  </article>
                  <article className={styles.vitalStatCard}>
                    <p>Blood Pressure</p>
                    <strong>{bpNow}</strong>
                    <span>mmHg</span>
                  </article>
                </div>

                <div className={styles.trendGrid}>
                  <article className={styles.trendCard}>
                    <header>
                      <h5>Heart Rate Trend</h5>
                      <span>{heartRateNow ?? '-'} bpm</span>
                    </header>
                    <MiniSparkline points={heartTrend} tone="navy" ariaLabel="Heart rate trend" />
                  </article>

                  <article className={styles.trendCard}>
                    <header>
                      <h5>Oxygen Trend</h5>
                      <span>{oxygenNow ?? '-'}%</span>
                    </header>
                    <MiniSparkline points={oxygenTrend} tone="gold" ariaLabel="Oxygen trend" />
                  </article>

                  <article className={styles.trendCard}>
                    <header>
                      <h5>Temperature Trend</h5>
                      <span>{temperatureNow !== null && temperatureNow > 0 ? `${temperatureNow.toFixed(1)} C` : '-'}</span>
                    </header>
                    <MiniSparkline points={temperatureTrend} tone="navy" ariaLabel="Temperature trend" />
                  </article>
                </div>
              </article>

              <article className={styles.cockpitBodyPane}>
                <h4>Body Focus</h4>
                <div className={styles.systemTabs}>
                  <span className={styles.systemTabActive}>Pulmonary</span>
                  <span>Cardio</span>
                  <span>Vitals</span>
                </div>

                <dl className={styles.focusList}>
                  <div>
                    <dt>Oxygen Level</dt>
                    <dd>{oxygenNow ?? '-'}%</dd>
                  </div>
                  <div>
                    <dt>Heart Rate</dt>
                    <dd>{heartRateNow ?? '-'} bpm</dd>
                  </div>
                  <div>
                    <dt>Temperature</dt>
                    <dd>{temperatureNow !== null && temperatureNow > 0 ? `${temperatureNow.toFixed(1)} C` : '-'}</dd>
                  </div>
                  <div>
                    <dt>BP</dt>
                    <dd>{bpNow}</dd>
                  </div>
                </dl>

                <Link href="/admin/dashboards?calendar=future" className={styles.calendarLink}>
                  Calendar Integration (Future)
                </Link>
              </article>
            </div>
          ) : (
            <article className={styles.emptyStateCard}>
              <h4>No patient spotlight yet</h4>
              <p>As soon as patient profiles are active, this cockpit will show live insights and trends.</p>
            </article>
          )}
        </section>

        <section className={styles.visualGrid}>
          <div className={styles.visualSpanTwo}>
            <SparklineCard
              title="7-Day Clinical Intake"
              subtitle="Daily chart activity across all care roles"
              points={weeklyRoleIntake}
              tone="navy"
            />
          </div>

          <DistributionCard
            title="Queue Distribution"
            subtitle="Current operational load by role"
            items={[
              { label: 'Doctor', value: unsignedNotes, tone: 'navy' },
              { label: 'Physio', value: physioFollowUps, tone: 'teal' },
              { label: 'Nurse', value: nurseEscalations, tone: 'gold' },
              { label: 'Medical Ops', value: careFollowUps, tone: 'slate' },
            ]}
          />

          <RingProgressCard
            title="Escalation Pressure"
            subtitle="Share of queue needing follow-up"
            value={escalationQueue}
            total={totalQueue}
            detail={`${escalationQueue}/${totalQueue || 0}`}
            tone="gold"
          />
        </section>

        <section className={styles.visualGrid}>
          <div className={styles.visualSpanTwo}>
            <SparklineCard
              title="7-Day Payout Transfers"
              subtitle="Net provider payout transfer trend"
              points={weeklyPayoutTransfers}
              tone="gold"
            />
          </div>

          <DistributionCard
            title="Visit Status Mix"
            subtitle="Operational visits by status"
            items={[
              { label: 'Completed', value: completedVisits, tone: 'teal' },
              { label: 'Scheduled', value: scheduledVisits, tone: 'navy' },
              { label: 'In Progress', value: inProgressVisits, tone: 'gold' },
              { label: 'Rescheduled', value: rescheduledVisits, tone: 'slate' },
              { label: 'Cancelled', value: cancelledVisits, tone: 'navy' },
              { label: 'No Show', value: noShowVisits, tone: 'gold' },
            ]}
          />

          <RingProgressCard
            title="Invoice Paid Rate"
            subtitle="Paid share of tracked invoices"
            value={invoicesPaid}
            total={invoiceTrackedTotal}
            detail={`${invoicesPaid}/${invoiceTrackedTotal || 0}`}
            tone="navy"
          />
        </section>

        <section className={styles.visualGrid}>
          <div className={styles.visualSpanTwo}>
            <SparklineCard
              title="7-Day Collections"
              subtitle="Daily payment collections from invoices"
              points={weeklyCollections}
              tone="navy"
            />
          </div>

          <DistributionCard
            title="Finance Mix (30d)"
            subtitle="Movement split for finance operations"
            items={[
              { label: 'Payments', value: paymentsLast30DaysEgp, tone: 'teal' },
              { label: 'Expenses', value: expensesLast30DaysEgp, tone: 'gold' },
              { label: 'Payout Transfers', value: payoutsLast30DaysEgp, tone: 'navy' },
            ]}
          />

          <RingProgressCard
            title="Escalation Pressure"
            subtitle="Share of queue needing follow-up"
            value={escalationQueue}
            total={totalQueue}
            detail={`${escalationQueue}/${totalQueue || 0}`}
            tone="gold"
          />
        </section>

        <section className={styles.tableWrap} aria-label="Role dashboards table">
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Role</th>
                <th>Focus</th>
                <th>Queue</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {dashboardLinks.map((item) => (
                <tr key={item.href}>
                  <td>{item.label}</td>
                  <td>{item.focus}</td>
                  <td>{roleQueueCounts[item.key]}</td>
                  <td>
                    <Link href={item.href} className={styles.openLink}>Open workspace</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </AdminDashboardShell>
  );
}