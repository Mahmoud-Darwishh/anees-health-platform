import { requireStaffPermission } from '@/lib/auth';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import { DistributionCard, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
import { prisma } from '@/lib/db/prisma';
import { buildDailySeries } from '@/lib/ehr/dashboard-metrics';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './queues.module.scss';

export const metadata: Metadata = {
  title: 'Work Queues | Anees Admin',
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

export default async function AdminQueuesPage() {
  const session = await requireStaffPermission('patients.read');
  const referenceNow = new Date(session.expires);
  const dueCutoff = new Date(referenceNow.getTime() + 1000 * 60 * 60 * 24);
  const role = session.user.staffRole ?? 'viewer';
  const canDoctorBoard = ['superadmin', 'admin', 'doctor'].includes(role);
  const canNurseBoard = ['superadmin', 'admin', 'nurse'].includes(role);
  const canPhysioBoard = ['superadmin', 'admin', 'physiotherapist'].includes(role);
  const canCareBoard = ['superadmin', 'admin', 'operator', 'doctor', 'nurse', 'physiotherapist'].includes(role);

  const [unsignedNotes, nurseEscalations, physioPlans, careFollowUps, triageDrafts] = await Promise.all([
    prisma.progressNote.findMany({
      where: { deletedAt: null, signedOffAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        noteBody: true,
        patient: { select: { id: true, code: true, fullName: true } },
        enteredByStaff: { select: { name: true } },
      },
    }),
    prisma.nurseDailyReport.findMany({
      where: { deletedAt: null, escalationFlag: true },
      orderBy: { reportDate: 'desc' },
      take: 8,
      select: {
        id: true,
        reportDate: true,
        escalationReason: true,
        nursingNotes: true,
        patient: { select: { id: true, code: true, fullName: true } },
        enteredByStaff: { select: { name: true } },
      },
    }),
    prisma.physioSessionReport.findMany({
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
        enteredByStaff: { select: { name: true } },
      },
    }),
    prisma.careTeamMessage.findMany({
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
        authorStaff: { select: { name: true, role: true } },
      },
    }),
    prisma.aiTriageCase.findMany({
      where: { status: 'draft' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        urgencyLevel: true,
        riskScore: true,
        symptomSummary: true,
        patient: { select: { id: true, code: true, fullName: true } },
        submittedByStaff: { select: { name: true } },
      },
    }),
  ]);

  const queueTotal = unsignedNotes.length + triageDrafts.length + nurseEscalations.length + physioPlans.length + careFollowUps.length;
  const urgentQueue = nurseEscalations.length + triageDrafts.filter((item) => item.urgencyLevel === 'high').length;
  const dueIn24h = careFollowUps.filter((item) => {
    if (!item.followUpDueAt) return false;
    return item.followUpDueAt >= referenceNow && item.followUpDueAt <= dueCutoff;
  }).length;

  const queueTrend = await buildDailySeries(async (start, end) => {
    const [doctorNotes, triageCases, nurseCases, physioCases, opsCases] = await Promise.all([
      prisma.progressNote.count({ where: { deletedAt: null, signedOffAt: null, createdAt: { gte: start, lt: end } } }),
      prisma.aiTriageCase.count({ where: { status: 'draft', createdAt: { gte: start, lt: end } } }),
      prisma.nurseDailyReport.count({ where: { deletedAt: null, escalationFlag: true, reportDate: { gte: start, lt: end } } }),
      prisma.physioSessionReport.count({ where: { deletedAt: null, nextSessionDate: { not: null }, sessionDate: { gte: start, lt: end } } }),
      prisma.careTeamMessage.count({ where: { requiresFollowUp: true, createdAt: { gte: start, lt: end } } }),
    ]);

    return doctorNotes + triageCases + nurseCases + physioCases + opsCases;
  }, 7);

  return (
    <AdminDashboardShell
      title="Work Queues"
      subtitle="Cross-role queue board for doctor, nurse, physio, and care-coordination follow-up."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/dashboards/doctor': unsignedNotes.length + triageDrafts.length,
        '/admin/dashboards/physio': physioPlans.length,
        '/admin/dashboards/nurse': nurseEscalations.length,
        '/admin/dashboards/medical-ops': careFollowUps.length,
        '/admin/queues': unsignedNotes.length + triageDrafts.length + nurseEscalations.length + physioPlans.length + careFollowUps.length,
      }}
      metrics={[
        { label: 'Unsigned Notes', value: unsignedNotes.length, hint: 'Doctor review', tone: 'sky' },
        { label: 'Nurse Escalations', value: nurseEscalations.length, hint: 'Needs bedside follow-up', tone: 'amber' },
        { label: 'Physio Follow-ups', value: physioPlans.length, hint: 'Upcoming continuity', tone: 'mint' },
        { label: 'Care Follow-ups', value: careFollowUps.length, hint: 'Task closure required', tone: 'violet' },
      ]}
      quickLinks={[
        { href: '/admin/patients', label: 'Patient Registry' },
        { href: '/admin/dashboards', label: 'Role Dashboards' },
        { href: '/admin/queues', label: 'Queue Board', tone: 'primary' },
      ]}
    >
      <section className={styles.stack}>
        <header className={styles.headerRow}>
          <div>
            <h2>Work Queues</h2>
            <p>Dedicated dashboards for clinical roles, escalation follow-up, and locked-note review.</p>
          </div>
          <Link href="/admin/patients" className={styles.backLink}>Back to patients</Link>
        </header>

        <section className={styles.visualGrid}>
          <div className={styles.visualSpanTwo}>
            <SparklineCard
              title="7-Day Queue Trend"
              subtitle="Daily queue creation across all workboards"
              points={queueTrend}
              tone="navy"
            />
          </div>

          <DistributionCard
            title="Board Distribution"
            subtitle="Current queue by discipline"
            items={[
              { label: 'Doctor', value: unsignedNotes.length + triageDrafts.length, tone: 'navy' },
              { label: 'Nurse', value: nurseEscalations.length, tone: 'gold' },
              { label: 'Physio', value: physioPlans.length, tone: 'teal' },
              { label: 'Care Ops', value: careFollowUps.length, tone: 'slate' },
            ]}
          />

          <RingProgressCard
            title="Urgent Load"
            subtitle="High-priority share requiring fast response"
            value={urgentQueue + dueIn24h}
            total={queueTotal}
            detail={`${urgentQueue + dueIn24h}/${queueTotal || 0}`}
            tone="gold"
          />
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryTile}>
            <p>Unsigned notes</p>
            <strong>{unsignedNotes.length}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Nurse escalations</p>
            <strong>{nurseEscalations.length}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Physio follow-ups</p>
            <strong>{physioPlans.length}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Care follow-ups</p>
            <strong>{careFollowUps.length}</strong>
          </article>
        </section>

        <section className={styles.boardGrid}>
          {canDoctorBoard && (
            <article className={styles.boardCard}>
              <h2>Doctor Queue</h2>
              <p className={styles.boardSubhead}>Unsigned notes and AI triage drafts.</p>
              {unsignedNotes.length === 0 && triageDrafts.length === 0 ? (
                <p className={styles.emptyText}>No doctor queue items right now.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Case</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Updated</th>
                        <th>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unsignedNotes.map((note) => (
                        <tr key={note.id}>
                          <td>{note.patient.fullName}</td>
                          <td>{note.patient.code}</td>
                          <td>Unsigned note</td>
                          <td>-</td>
                          <td>{formatDate(note.createdAt)}</td>
                          <td><Link href={`/admin/patients/${note.patient.id}`} className={styles.openLink}>Open</Link></td>
                        </tr>
                      ))}
                      {triageDrafts.map((caseItem) => (
                        <tr key={caseItem.id}>
                          <td>{caseItem.patient.fullName}</td>
                          <td>{caseItem.patient.code}</td>
                          <td>AI triage</td>
                          <td>{caseItem.urgencyLevel ?? '-'}</td>
                          <td>{formatDate(caseItem.createdAt)}</td>
                          <td><Link href={`/admin/patients/${caseItem.patient.id}`} className={styles.openLink}>Open</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}

          {canNurseBoard && (
            <article className={styles.boardCard}>
              <h2>Nurse Shift Board</h2>
              <p className={styles.boardSubhead}>Escalations requiring bedside follow-up.</p>
              {nurseEscalations.length === 0 ? (
                <p className={styles.emptyText}>No escalations in the current queue.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Case</th>
                        <th>Reported</th>
                        <th>Escalation</th>
                        <th>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nurseEscalations.map((report) => (
                        <tr key={report.id}>
                          <td>{report.patient.fullName}</td>
                          <td>{report.patient.code}</td>
                          <td>{formatDate(report.reportDate)}</td>
                          <td dir="auto">{(report.escalationReason ?? report.nursingNotes).slice(0, 80)}</td>
                          <td><Link href={`/admin/patients/${report.patient.id}`} className={styles.openLink}>Open</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}

          {canPhysioBoard && (
            <article className={styles.boardCard}>
              <h2>Physio Plan Board</h2>
              <p className={styles.boardSubhead}>Upcoming sessions and follow-ups.</p>
              {physioPlans.length === 0 ? (
                <p className={styles.emptyText}>No physio plans waiting on follow-up.</p>
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
                      {physioPlans.map((report) => (
                        <tr key={report.id}>
                          <td>{report.patient.fullName}</td>
                          <td>{report.patient.code}</td>
                          <td>#{report.sessionNumber}</td>
                          <td>{formatDate(report.nextSessionDate)}</td>
                          <td><Link href={`/admin/patients/${report.patient.id}`} className={styles.openLink}>Open</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}

          {canCareBoard && (
            <article className={styles.boardCard}>
              <h2>Care Coordination Board</h2>
              <p className={styles.boardSubhead}>Follow-up messages and due callbacks.</p>
              {careFollowUps.length === 0 ? (
                <p className={styles.emptyText}>No active care follow-ups.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Case</th>
                        <th>Channel</th>
                        <th>Due</th>
                        <th>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {careFollowUps.map((message) => (
                        <tr key={message.id}>
                          <td>{message.patient.fullName}</td>
                          <td>{message.patient.code}</td>
                          <td>{message.channelType}</td>
                          <td>{formatDate(message.followUpDueAt)}</td>
                          <td><Link href={`/admin/patients/${message.patient.id}`} className={styles.openLink}>Open</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}
        </section>
      </section>
    </AdminDashboardShell>
  );
}