import { requireStaffPermission } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../dashboard.module.scss';

type Props = {
  params: Promise<{ role: string }>;
};

const ROLE_META: Record<string, { title: string; summary: string; subtitle: string }> = {
  doctor: {
    title: 'Doctor Dashboard',
    summary: 'Signed-note review, triage, and active problem management.',
    subtitle: 'This view emphasizes note locking, diagnosis review, and the chart timeline.',
  },
  physio: {
    title: 'Physio Dashboard',
    summary: 'Session plans, exercise continuity, and upcoming follow-up dates.',
    subtitle: 'Use this view for rehabilitation scheduling and patient progress follow-through.',
  },
  nurse: {
    title: 'Nurse Dashboard',
    summary: 'Escalations, vitals, shift handoff, and bedside follow-up.',
    subtitle: 'Use this view for rounding, escalation closure, and timely documentation.',
  },
  'medical-ops': {
    title: 'Medical Ops Dashboard',
    summary: 'Follow-up tasks, call routing, assignments, and coordination work.',
    subtitle: 'Use this view for operational triage and closing the loop on patient tasks.',
  },
};

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(value);
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
  await requireStaffPermission('patients.read');
  const { role } = await params;
  const meta = ROLE_META[role];

  if (!meta) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.headerRow}>
            <div>
              <h1>Clinical Dashboard</h1>
              <p>Unknown dashboard role.</p>
            </div>
            <Link href="/admin/dashboards" className={styles.backLink}>Back to dashboards</Link>
          </header>
        </section>
      </main>
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

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <h1>{meta.title}</h1>
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

        <p className={styles.subhead}>{meta.subtitle}</p>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryTile}>
            <p>Open queue</p>
            <strong>{role === 'doctor' ? unsignedNotes.length + activeCarePlans.length : role === 'physio' ? physioPlans.length : role === 'nurse' ? nurseEscalations.length : careFollowUps.length}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Focus</p>
            <strong>{role === 'doctor' ? 'Charts' : role === 'physio' ? 'Plans' : role === 'nurse' ? 'Escalations' : 'Tasks'}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Review window</p>
            <strong>Today</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Status</p>
            <strong>Live</strong>
          </article>
        </section>

        <section className={styles.boardGrid}>
          {role === 'doctor' && (
            <>
              <article className={styles.card}>
                <h2>Unsigned Notes</h2>
                <p className={styles.subhead}>Notes waiting for sign-off or addenda review.</p>
                {unsignedNotes.length === 0 ? (
                  <p className={styles.emptyText}>No unsigned notes.</p>
                ) : (
                  <ul className={styles.list}>
                    {unsignedNotes.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <Link href={`/admin/patients/${item.patient.id}`} className={styles.link}>
                          <strong>{item.patient.fullName}</strong>
                          <span>{item.patient.code} • {formatDate(item.createdAt)}</span>
                          <p dir="auto">{item.noteBody}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className={styles.card}>
                <h2>Active Care Plans</h2>
                <p className={styles.subhead}>Ongoing plans and visit targets.</p>
                {activeCarePlans.length === 0 ? (
                  <p className={styles.emptyText}>No active care plans.</p>
                ) : (
                  <ul className={styles.list}>
                    {activeCarePlans.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <Link href={`/admin/patients/${item.patient.id}`} className={styles.link}>
                          <strong>{item.planName}</strong>
                          <span>{item.patient.fullName} • {item.code} • {formatDate(item.startDate)} → {formatDate(item.endDate)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </>
          )}

          {role === 'physio' && (
            <article className={styles.card}>
              <h2>Physio Follow-ups</h2>
              <p className={styles.subhead}>Rehabilitation sessions that need continuity.</p>
              {physioPlans.length === 0 ? (
                <p className={styles.emptyText}>No physio follow-ups.</p>
              ) : (
                <ul className={styles.list}>
                  {physioPlans.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <Link href={`/admin/patients/${item.patient.id}`} className={styles.link}>
                        <strong>{item.patient.fullName}</strong>
                        <span>{item.patient.code} • session #{item.sessionNumber} • next {formatDate(item.nextSessionDate)}</span>
                        <p dir="auto">{item.interventions}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {role === 'nurse' && (
            <article className={styles.card}>
              <h2>Shift Escalations</h2>
              <p className={styles.subhead}>Bedside follow-up and handoff items.</p>
              {nurseEscalations.length === 0 ? (
                <p className={styles.emptyText}>No escalations.</p>
              ) : (
                <ul className={styles.list}>
                  {nurseEscalations.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <Link href={`/admin/patients/${item.patient.id}`} className={styles.link}>
                        <strong>{item.patient.fullName}</strong>
                        <span>{item.patient.code} • {formatDate(item.reportDate)}</span>
                        <p dir="auto">{item.escalationReason ?? item.nursingNotes}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {role === 'medical-ops' && (
            <>
              <article className={styles.card}>
                <h2>Follow-up Tasks</h2>
                <p className={styles.subhead}>Messages requiring follow-up or closure.</p>
                {careFollowUps.length === 0 ? (
                  <p className={styles.emptyText}>No open follow-up messages.</p>
                ) : (
                  <ul className={styles.list}>
                    {careFollowUps.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <Link href={`/admin/patients/${item.patient.id}`} className={styles.link}>
                          <strong>{item.patient.fullName}</strong>
                          <span>{item.patient.code} • due {formatDate(item.followUpDueAt)} • {item.channelType}</span>
                          <p dir="auto">{item.messageBody}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className={styles.card}>
                <h2>Active Assignments</h2>
                <p className={styles.subhead}>Current staff-to-patient responsibilities.</p>
                {openAssignments.length === 0 ? (
                  <p className={styles.emptyText}>No active assignments.</p>
                ) : (
                  <ul className={styles.list}>
                    {openAssignments.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <strong>{item.patient.fullName}</strong>
                        <span>{item.patient.code} • {item.staff.name} ({item.staff.role}) • {formatDate(item.assignedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </>
          )}
        </section>
      </section>
    </main>
  );
}