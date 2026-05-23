import { requireStaffPermission } from '@/lib/auth';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import { DistributionCard, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
import { prisma } from '@/lib/db/prisma';
import { buildDailySeries, type DailySeriesPoint } from '@/lib/ehr/dashboard-metrics';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../dashboard.module.scss';

type Props = {
  params: Promise<{ role: string }>;
};

const ROLE_META: Record<string, { title: string; summary: string }> = {
  doctor: {
    title: 'Doctor Dashboard',
    summary: 'Signed-note review, triage, and active problem management.',
  },
  physio: {
    title: 'Physio Dashboard',
    summary: 'Session plans, exercise continuity, and upcoming follow-up dates.',
  },
  nurse: {
    title: 'Nurse Dashboard',
    summary: 'Escalations, vitals, shift handoff, and bedside follow-up.',
  },
  'medical-ops': {
    title: 'Medical Ops Dashboard',
    summary: 'Follow-up tasks, call routing, assignments, and coordination work.',
  },
};

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(value);
}

function preview(value: string, max = 100): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}...`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params;
  const meta = ROLE_META[role];
  return {
    title: meta?.title ?? 'Clinical Dashboard | Anees Admin',
    robots: { index: false, follow: false },
  };
}

export default async function RoleDashboardPage({ params }: Props) {
  const session = await requireStaffPermission('patients.read');
  const { role } = await params;
  const meta = ROLE_META[role];

  if (!meta) {
    return (
      <AdminDashboardShell
        title="Clinical Dashboard"
        subtitle="Unknown dashboard role"
        staffName={session.user.name ?? 'Anees Staff'}
        roleLabel={session.user.staffRole}
        quickLinks={[
          { href: '/admin/patients', label: 'Patient Registry' },
          { href: '/admin/queues', label: 'Work Queues' },
          { href: '/admin/dashboards', label: 'Dashboard Hub', tone: 'primary' },
        ]}
      >
        <section className={styles.stack}>
          <header className={styles.headerRow}>
            <div>
              <h2>Clinical Dashboard</h2>
              <p>Unknown dashboard role.</p>
            </div>
            <Link href="/admin/dashboards" className={styles.backLink}>Back to dashboards</Link>
          </header>
        </section>
      </AdminDashboardShell>
    );
  }

  const [unsignedNotes, physioPlans, nurseEscalations, careFollowUps, openAssignments, activeCarePlans] = await Promise.all([
    role === 'doctor'
      ? prisma.progressNote.findMany({
          where: { deletedAt: null, signedOffAt: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            createdAt: true,
            noteBody: true,
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : [],
    role === 'physio'
      ? prisma.physioSessionReport.findMany({
          where: { deletedAt: null, nextSessionDate: { not: null } },
          orderBy: { nextSessionDate: 'asc' },
          take: 8,
          select: {
            id: true,
            sessionDate: true,
            sessionNumber: true,
            nextSessionDate: true,
            interventions: true,
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : [],
    role === 'nurse'
      ? prisma.nurseDailyReport.findMany({
          where: { deletedAt: null, escalationFlag: true },
          orderBy: { reportDate: 'desc' },
          take: 8,
          select: {
            id: true,
            reportDate: true,
            escalationReason: true,
            nursingNotes: true,
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : [],
    role === 'medical-ops'
      ? prisma.careTeamMessage.findMany({
          where: { requiresFollowUp: true },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            createdAt: true,
            followUpDueAt: true,
            channelType: true,
            messageBody: true,
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : [],
    role === 'medical-ops'
      ? prisma.staffPatientAssignment.findMany({
          where: { isActive: true },
          orderBy: { assignedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            assignedAt: true,
            staff: { select: { name: true, role: true } },
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : [],
    role === 'doctor'
      ? prisma.carePlan.findMany({
          where: { status: 'active' },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            code: true,
            planName: true,
            startDate: true,
            endDate: true,
            totalVisitsPlanned: true,
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : [],
  ]);

  const roleLinks = [
    { href: '/admin/dashboards/doctor', label: 'Doctor' },
    { href: '/admin/dashboards/physio', label: 'Physio' },
    { href: '/admin/dashboards/nurse', label: 'Nurse' },
    { href: '/admin/dashboards/medical-ops', label: 'Medical Ops' },
  ];

  const openQueueCount = role === 'doctor'
    ? unsignedNotes.length + activeCarePlans.length
    : role === 'physio'
      ? physioPlans.length
      : role === 'nurse'
        ? nurseEscalations.length
        : careFollowUps.length + openAssignments.length;

  const totalItems = unsignedNotes.length
    + activeCarePlans.length
    + physioPlans.length
    + nurseEscalations.length
    + careFollowUps.length
    + openAssignments.length;

  const coverageCount = new Set([
    ...unsignedNotes.map((item) => item.patient.id),
    ...activeCarePlans.map((item) => item.patient.id),
    ...physioPlans.map((item) => item.patient.id),
    ...nurseEscalations.map((item) => item.patient.id),
    ...careFollowUps.map((item) => item.patient.id),
    ...openAssignments.map((item) => item.patient.id),
  ]).size;

  const doctorCount = unsignedNotes.length + activeCarePlans.length;
  const physioCount = physioPlans.length;
  const nurseCount = nurseEscalations.length;
  const medicalOpsCount = careFollowUps.length + openAssignments.length;
  const referenceNow = new Date(session.expires);
  const physioCutoff = new Date(referenceNow.getTime() + 1000 * 60 * 60 * 72);
  const opsCutoff = new Date(referenceNow.getTime() + 1000 * 60 * 60 * 24);

  const roleTrend: DailySeriesPoint[] = await buildDailySeries(async (start, end) => {
    if (role === 'doctor') {
      const [noteCount, carePlanUpdates] = await Promise.all([
        prisma.progressNote.count({ where: { deletedAt: null, signedOffAt: null, createdAt: { gte: start, lt: end } } }),
        prisma.carePlan.count({ where: { status: 'active', updatedAt: { gte: start, lt: end } } }),
      ]);
      return noteCount + carePlanUpdates;
    }

    if (role === 'physio') {
      return prisma.physioSessionReport.count({
        where: {
          deletedAt: null,
          nextSessionDate: { not: null },
          sessionDate: { gte: start, lt: end },
        },
      });
    }

    if (role === 'nurse') {
      return prisma.nurseDailyReport.count({
        where: {
          deletedAt: null,
          escalationFlag: true,
          reportDate: { gte: start, lt: end },
        },
      });
    }

    const [messageLoad, assignmentLoad] = await Promise.all([
      prisma.careTeamMessage.count({ where: { requiresFollowUp: true, createdAt: { gte: start, lt: end } } }),
      prisma.staffPatientAssignment.count({ where: { isActive: true, assignedAt: { gte: start, lt: end } } }),
    ]);
    return messageLoad + assignmentLoad;
  }, 7);

  const totalPatientsTouched = coverageCount;
  const physioDueSoon = physioPlans.filter((item) => {
    if (!item.nextSessionDate) return false;
    return item.nextSessionDate >= referenceNow && item.nextSessionDate <= physioCutoff;
  }).length;
  const nurseReasonedEscalations = nurseEscalations.filter((item) => Boolean(item.escalationReason?.trim())).length;
  const opsDueIn24h = careFollowUps.filter((item) => {
    if (!item.followUpDueAt) return false;
    return item.followUpDueAt >= referenceNow && item.followUpDueAt <= opsCutoff;
  }).length;

  const roleDistribution = role === 'doctor'
    ? [
        { label: 'Unsigned Notes', value: unsignedNotes.length, tone: 'navy' as const },
        { label: 'Active Care Plans', value: activeCarePlans.length, tone: 'gold' as const },
        { label: 'Patient Coverage', value: totalPatientsTouched, tone: 'slate' as const },
      ]
    : role === 'physio'
      ? [
          { label: 'Follow-up Sessions', value: physioPlans.length, tone: 'teal' as const },
          { label: 'Due in 72h', value: physioDueSoon, tone: 'gold' as const },
          { label: 'Patient Coverage', value: totalPatientsTouched, tone: 'slate' as const },
        ]
      : role === 'nurse'
        ? [
            { label: 'Escalations', value: nurseEscalations.length, tone: 'gold' as const },
            { label: 'Reason Documented', value: nurseReasonedEscalations, tone: 'navy' as const },
            { label: 'Patient Coverage', value: totalPatientsTouched, tone: 'slate' as const },
          ]
        : [
            { label: 'Follow-up Messages', value: careFollowUps.length, tone: 'navy' as const },
            { label: 'Assignments', value: openAssignments.length, tone: 'teal' as const },
            { label: 'Due in 24h', value: opsDueIn24h, tone: 'gold' as const },
          ];

  const ringValue = role === 'doctor'
    ? unsignedNotes.length
    : role === 'physio'
      ? physioDueSoon
      : role === 'nurse'
        ? nurseReasonedEscalations
        : opsDueIn24h;

  const ringTotal = role === 'doctor'
    ? Math.max(doctorCount, 1)
    : role === 'physio'
      ? Math.max(physioPlans.length, 1)
      : role === 'nurse'
        ? Math.max(nurseEscalations.length, 1)
        : Math.max(careFollowUps.length, 1);

  const ringDetail = role === 'doctor'
    ? 'Unsigned in queue'
    : role === 'physio'
      ? 'Due in 72 hours'
      : role === 'nurse'
        ? 'With documented reason'
        : 'Follow-ups due in 24h';

  return (
    <AdminDashboardShell
      title={meta.title}
      subtitle={meta.summary}
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/dashboards/doctor': doctorCount,
        '/admin/dashboards/physio': physioCount,
        '/admin/dashboards/nurse': nurseCount,
        '/admin/dashboards/medical-ops': medicalOpsCount,
        '/admin/queues': doctorCount + physioCount + nurseCount + medicalOpsCount,
      }}
      metrics={[
        { label: 'Open Queue', value: openQueueCount, hint: 'Needs review', tone: 'sky' },
        { label: 'Role Focus', value: role === 'medical-ops' ? 'Tasks' : role === 'doctor' ? 'Charts' : role === 'physio' ? 'Plans' : 'Escalations', hint: 'Current workspace', tone: 'mint' },
        { label: 'Board Items', value: totalItems, hint: 'Visible records', tone: 'amber' },
        { label: 'Patient Coverage', value: coverageCount, hint: 'Unique patients', tone: 'violet' },
      ]}
      quickLinks={[
        { href: '/admin/dashboards?calendar=future', label: 'Calendar Integration (Soon)' },
        { href: '/admin/patients', label: 'Patient Registry' },
        { href: '/admin/queues', label: 'Work Queues' },
        { href: '/admin/dashboards', label: 'All Dashboards', tone: 'primary' },
      ]}
    >
      <section className={styles.stack}>
        <header className={styles.headerRow}>
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.summary}</p>
          </div>
          <Link href="/admin/dashboards" className={styles.backLink}>All dashboards</Link>
        </header>

        <div className={styles.roleNav}>
          {roleLinks.map((item) => (
            <Link key={item.href} href={item.href} className={item.href.endsWith(role) ? styles.roleLinkActive : styles.roleLink}>
              {item.label}
            </Link>
          ))}
        </div>

        <section className={styles.visualGrid}>
          <div className={styles.visualSpanTwo}>
            <SparklineCard
              title="7-Day Workload Trend"
              subtitle="Daily operational activity for this role"
              points={roleTrend}
              tone={role === 'doctor' || role === 'medical-ops' ? 'navy' : 'gold'}
            />
          </div>

          <DistributionCard
            title="Role Distribution"
            subtitle="How today’s load is distributed"
            items={roleDistribution}
          />

          <RingProgressCard
            title="Priority Focus"
            subtitle="Critical share for immediate tracking"
            value={ringValue}
            total={ringTotal}
            detail={ringDetail}
            tone={role === 'nurse' || role === 'physio' ? 'gold' : 'navy'}
          />
        </section>

        <section className={styles.boardGrid}>
          {role === 'doctor' && (
            <>
              <article className={styles.card}>
                <h2>Unsigned Notes</h2>
                {unsignedNotes.length === 0 ? (
                  <p className={styles.emptyText}>No unsigned notes.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Case</th>
                          <th>Updated</th>
                          <th>Note</th>
                          <th>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unsignedNotes.map((item) => (
                          <tr key={item.id}>
                            <td>{item.patient.fullName}</td>
                            <td>{item.patient.code}</td>
                            <td>{formatDate(item.createdAt)}</td>
                            <td dir="auto">{preview(item.noteBody)}</td>
                            <td>
                              <Link href={`/admin/patients/${item.patient.id}`} className={styles.openLink}>Open</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className={styles.card}>
                <h2>Active Care Plans</h2>
                {activeCarePlans.length === 0 ? (
                  <p className={styles.emptyText}>No active care plans.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Patient</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCarePlans.map((item) => (
                          <tr key={item.id}>
                            <td>{item.planName}</td>
                            <td>{item.patient.fullName}</td>
                            <td>{formatDate(item.startDate)}</td>
                            <td>{formatDate(item.endDate)}</td>
                            <td>
                              <Link href={`/admin/patients/${item.patient.id}`} className={styles.openLink}>Open</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </>
          )}

          {role === 'physio' && (
            <article className={styles.card}>
              <h2>Physio Follow-ups</h2>
              {physioPlans.length === 0 ? (
                <p className={styles.emptyText}>No physio follow-ups.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Case</th>
                        <th>Session</th>
                        <th>Next Date</th>
                        <th>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {physioPlans.map((item) => (
                        <tr key={item.id}>
                          <td>{item.patient.fullName}</td>
                          <td>{item.patient.code}</td>
                          <td>#{item.sessionNumber}</td>
                          <td>{formatDate(item.nextSessionDate)}</td>
                          <td>
                            <Link href={`/admin/patients/${item.patient.id}`} className={styles.openLink}>Open</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}

          {role === 'nurse' && (
            <article className={styles.card}>
              <h2>Shift Escalations</h2>
              {nurseEscalations.length === 0 ? (
                <p className={styles.emptyText}>No escalations.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Case</th>
                        <th>Reported</th>
                        <th>Reason</th>
                        <th>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nurseEscalations.map((item) => (
                        <tr key={item.id}>
                          <td>{item.patient.fullName}</td>
                          <td>{item.patient.code}</td>
                          <td>{formatDate(item.reportDate)}</td>
                          <td dir="auto">{preview(item.escalationReason ?? item.nursingNotes)}</td>
                          <td>
                            <Link href={`/admin/patients/${item.patient.id}`} className={styles.openLink}>Open</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}

          {role === 'medical-ops' && (
            <>
              <article className={styles.card}>
                <h2>Follow-up Tasks</h2>
                {careFollowUps.length === 0 ? (
                  <p className={styles.emptyText}>No open follow-up messages.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Case</th>
                          <th>Due</th>
                          <th>Channel</th>
                          <th>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {careFollowUps.map((item) => (
                          <tr key={item.id}>
                            <td>{item.patient.fullName}</td>
                            <td>{item.patient.code}</td>
                            <td>{formatDate(item.followUpDueAt)}</td>
                            <td>{item.channelType}</td>
                            <td>
                              <Link href={`/admin/patients/${item.patient.id}`} className={styles.openLink}>Open</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className={styles.card}>
                <h2>Active Assignments</h2>
                {openAssignments.length === 0 ? (
                  <p className={styles.emptyText}>No active assignments.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Case</th>
                          <th>Staff</th>
                          <th>Role</th>
                          <th>Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openAssignments.map((item) => (
                          <tr key={item.id}>
                            <td>{item.patient.fullName}</td>
                            <td>{item.patient.code}</td>
                            <td>{item.staff.name}</td>
                            <td>{item.staff.role}</td>
                            <td>{formatDate(item.assignedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </>
          )}
        </section>
      </section>
    </AdminDashboardShell>
  );
}