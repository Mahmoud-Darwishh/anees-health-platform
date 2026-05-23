import { requireStaffPermission } from '@/lib/auth';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import { DistributionCard, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
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
    description: 'Unsigned notes, triage review, and active care-plan continuity.',
    toneClass: 'toneDoctor',
    highlights: ['Unsigned note lock/sign workflow', 'Problem and diagnosis review', 'Active care-plan progress'],
  },
  {
    key: 'physio',
    href: '/admin/dashboards/physio',
    label: 'Physio Dashboard',
    description: 'Session cadence, intervention follow-up, and rehab continuity.',
    toneClass: 'tonePhysio',
    highlights: ['Next-session visibility', 'Intervention tracking', 'Home-exercise continuity'],
  },
  {
    key: 'nurse',
    href: '/admin/dashboards/nurse',
    label: 'Nurse Dashboard',
    description: 'Escalation management, bedside follow-up, and handoff readiness.',
    toneClass: 'toneNurse',
    highlights: ['Escalation-first triage', 'Vitals-aware rounding context', 'Shift handoff clarity'],
  },
  {
    key: 'medical-ops',
    href: '/admin/dashboards/medical-ops',
    label: 'Medical Ops Dashboard',
    description: 'Follow-ups, call routing, assignments, and operational closure loops.',
    toneClass: 'toneOps',
    highlights: ['Task closure tracking', 'Care-team follow-up queue', 'Assignment visibility by role'],
  },
];

export default async function DashboardsHomePage() {
  const session = await requireStaffPermission('patients.read');

  const [unsignedNotes, physioFollowUps, nurseEscalations, careFollowUps] = await Promise.all([
    prisma.progressNote.count({ where: { deletedAt: null, signedOffAt: null } }),
    prisma.physioSessionReport.count({ where: { deletedAt: null, nextSessionDate: { not: null } } }),
    prisma.nurseDailyReport.count({ where: { deletedAt: null, escalationFlag: true } }),
    prisma.careTeamMessage.count({ where: { requiresFollowUp: true } }),
  ]);

  const roleQueueCounts: Record<string, number> = {
    doctor: unsignedNotes,
    physio: physioFollowUps,
    nurse: nurseEscalations,
    'medical-ops': careFollowUps,
  };

  const totalQueue = unsignedNotes + physioFollowUps + nurseEscalations + careFollowUps;
  const escalationQueue = nurseEscalations + careFollowUps;

  const weeklyRoleIntake = await buildDailySeries(async (start, end) => {
    const [doctor, physio, nurse, medicalOps] = await Promise.all([
      prisma.progressNote.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
      prisma.physioSessionReport.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
      prisma.nurseDailyReport.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
      prisma.careTeamMessage.count({ where: { createdAt: { gte: start, lt: end } } }),
    ]);

    return doctor + physio + nurse + medicalOps;
  }, 7);

  return (
    <AdminDashboardShell
      title="Clinical Dashboards"
      subtitle="Role-based command center for doctors, physios, nurses, and medical operations."
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
        { label: 'Doctor Queue', value: unsignedNotes, hint: 'Unsigned notes', tone: 'sky' },
        { label: 'Physio Follow-ups', value: physioFollowUps, hint: 'Upcoming sessions', tone: 'mint' },
        { label: 'Nurse Escalations', value: nurseEscalations, hint: 'Needs bedside review', tone: 'amber' },
        { label: 'Ops Follow-ups', value: careFollowUps, hint: 'Requires closure', tone: 'violet' },
      ]}
      quickLinks={[
        { href: '/admin/patients', label: 'Patient Registry' },
        { href: '/admin/queues', label: 'Work Queues' },
        { href: '/admin/dashboards', label: 'Dashboard Hub', tone: 'primary' },
      ]}
    >
      <section className={styles.stack}>
        <header className={styles.headerRow}>
          <div>
            <h2>Choose Role Workspace</h2>
            <p>Each dashboard is tuned for role-specific context, queue pressure, and next actions.</p>
          </div>
          <Link href="/admin/patients" className={styles.backLink}>Go to patient registry</Link>
        </header>

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

        <section className={styles.roleCards}>
          {dashboardLinks.map((item) => (
            <article key={item.href} className={`${styles.roleCard} ${styles[item.toneClass]}`}>
              <div className={styles.roleCardHead}>
                <span className={styles.roleTag}>Role Workspace</span>
                <h3>{item.label}</h3>
              </div>

              <p className={styles.subhead}>{item.description}</p>

              <ul className={styles.featureList}>
                {item.highlights.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <footer className={styles.roleCardFooter}>
                <span className={styles.roleStat}>{roleQueueCounts[item.key]} active items</span>
                <Link href={item.href} className={styles.roleAction}>Open workspace</Link>
              </footer>
            </article>
          ))}
        </section>
      </section>
    </AdminDashboardShell>
  );
}