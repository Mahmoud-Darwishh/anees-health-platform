import { requireStaffPermission } from '@/lib/auth';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import { DistributionCard, MiniSparkline, RingProgressCard, SparklineCard } from '@/components/admin/EhrCharts';
import { prisma } from '@/lib/db/prisma';
import { buildDailySeries } from '@/lib/ehr/dashboard-metrics';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './queues.module.scss';

type PatientQueueProfile = {
  notes: number;
  triage: number;
  nurse: number;
  physio: number;
  care: number;
};

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

  const patientQueueProfiles = new Map<string, PatientQueueProfile>();

  const ensureProfile = (patientId: string): PatientQueueProfile => {
    const existing = patientQueueProfiles.get(patientId);
    if (existing) return existing;

    const created: PatientQueueProfile = {
      notes: 0,
      triage: 0,
      nurse: 0,
      physio: 0,
      care: 0,
    };
    patientQueueProfiles.set(patientId, created);
    return created;
  };

  unsignedNotes.forEach((item) => {
    ensureProfile(item.patient.id).notes += 1;
  });
  triageDrafts.forEach((item) => {
    ensureProfile(item.patient.id).triage += 1;
  });
  nurseEscalations.forEach((item) => {
    ensureProfile(item.patient.id).nurse += 1;
  });
  physioPlans.forEach((item) => {
    ensureProfile(item.patient.id).physio += 1;
  });
  careFollowUps.forEach((item) => {
    ensureProfile(item.patient.id).care += 1;
  });

  const profileFor = (patientId: string): PatientQueueProfile => (
    patientQueueProfiles.get(patientId)
    ?? {
      notes: 0,
      triage: 0,
      nurse: 0,
      physio: 0,
      care: 0,
    }
  );

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
              <p className={styles.boardSubhead}>Unsigned notes and AI triage drafts that need physician review.</p>
              {unsignedNotes.length === 0 && triageDrafts.length === 0 ? (
                <p className={styles.emptyText}>No doctor queue items right now.</p>
              ) : (
                <ul className={styles.itemList}>
                  {unsignedNotes.map((note) => (
                    <li key={note.id} className={styles.itemCard}>
                      <Link href={`/admin/patients/${note.patient.id}`} className={styles.itemLink}>
                        <strong>{note.patient.fullName}</strong>
                        <span>{note.patient.code} • unsigned note • {formatDate(note.createdAt)}</span>
                        <p dir="auto">{note.noteBody}</p>
                        <div className={styles.itemTrendRow}>
                          <MiniSparkline
                            points={Object.values(profileFor(note.patient.id)).map((value) => ({ value }))}
                            tone="navy"
                            ariaLabel={`Queue profile for ${note.patient.fullName}`}
                          />
                          <small>Profile N/T/NR/P/C</small>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {triageDrafts.map((caseItem) => (
                    <li key={caseItem.id} className={styles.itemCard}>
                      <Link href={`/admin/patients/${caseItem.patient.id}`} className={styles.itemLink}>
                        <strong>{caseItem.patient.fullName}</strong>
                        <span>{caseItem.patient.code} • triage {caseItem.urgencyLevel ?? '-'} • score {caseItem.riskScore?.toString() ?? '-'}</span>
                        <p dir="auto">{caseItem.symptomSummary}</p>
                        <div className={styles.itemTrendRow}>
                          <MiniSparkline
                            points={Object.values(profileFor(caseItem.patient.id)).map((value) => ({ value }))}
                            tone="gold"
                            ariaLabel={`Queue profile for ${caseItem.patient.fullName}`}
                          />
                          <small>Profile N/T/NR/P/C</small>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {canNurseBoard && (
            <article className={styles.boardCard}>
              <h2>Nurse Shift Board</h2>
              <p className={styles.boardSubhead}>Escalations that need bedside follow-up or shift handoff.</p>
              {nurseEscalations.length === 0 ? (
                <p className={styles.emptyText}>No escalations in the current queue.</p>
              ) : (
                <ul className={styles.itemList}>
                  {nurseEscalations.map((report) => (
                    <li key={report.id} className={styles.itemCard}>
                      <Link href={`/admin/patients/${report.patient.id}`} className={styles.itemLink}>
                        <strong>{report.patient.fullName}</strong>
                        <span>{report.patient.code} • {formatDate(report.reportDate)}</span>
                        <p dir="auto">{report.escalationReason ?? report.nursingNotes}</p>
                        <div className={styles.itemTrendRow}>
                          <MiniSparkline
                            points={Object.values(profileFor(report.patient.id)).map((value) => ({ value }))}
                            tone="gold"
                            ariaLabel={`Queue profile for ${report.patient.fullName}`}
                          />
                          <small>Profile N/T/NR/P/C</small>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {canPhysioBoard && (
            <article className={styles.boardCard}>
              <h2>Physio Plan Board</h2>
              <p className={styles.boardSubhead}>Upcoming plan dates and follow-up sessions for rehabilitation continuity.</p>
              {physioPlans.length === 0 ? (
                <p className={styles.emptyText}>No physio plans waiting on follow-up.</p>
              ) : (
                <ul className={styles.itemList}>
                  {physioPlans.map((report) => (
                    <li key={report.id} className={styles.itemCard}>
                      <Link href={`/admin/patients/${report.patient.id}`} className={styles.itemLink}>
                        <strong>{report.patient.fullName}</strong>
                        <span>{report.patient.code} • next {formatDate(report.nextSessionDate)} • session #{report.sessionNumber}</span>
                        <p dir="auto">{report.interventions}</p>
                        <div className={styles.itemTrendRow}>
                          <MiniSparkline
                            points={Object.values(profileFor(report.patient.id)).map((value) => ({ value }))}
                            tone="navy"
                            ariaLabel={`Queue profile for ${report.patient.fullName}`}
                          />
                          <small>Profile N/T/NR/P/C</small>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}

          {canCareBoard && (
            <article className={styles.boardCard}>
              <h2>Care Coordination Board</h2>
              <p className={styles.boardSubhead}>Messages that require follow-up, assignment, or call-routing escalation.</p>
              {careFollowUps.length === 0 ? (
                <p className={styles.emptyText}>No active care follow-ups.</p>
              ) : (
                <ul className={styles.itemList}>
                  {careFollowUps.map((message) => (
                    <li key={message.id} className={styles.itemCard}>
                      <Link href={`/admin/patients/${message.patient.id}`} className={styles.itemLink}>
                        <strong>{message.patient.fullName}</strong>
                        <span>{message.patient.code} • {message.channelType} • due {formatDate(message.followUpDueAt)}</span>
                        <p dir="auto">{message.messageBody}</p>
                        <div className={styles.itemTrendRow}>
                          <MiniSparkline
                            points={Object.values(profileFor(message.patient.id)).map((value) => ({ value }))}
                            tone="navy"
                            ariaLabel={`Queue profile for ${message.patient.fullName}`}
                          />
                          <small>Profile N/T/NR/P/C</small>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}
        </section>
      </section>
    </AdminDashboardShell>
  );
}