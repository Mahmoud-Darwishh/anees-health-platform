import { requireStaffPermission } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
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

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <h1>Work Queues</h1>
            <p>Dedicated dashboards for clinical roles, escalation follow-up, and locked-note review.</p>
          </div>
          <Link href="/admin/patients" className={styles.backLink}>Back to patients</Link>
        </header>

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
                      </Link>
                    </li>
                  ))}
                  {triageDrafts.map((caseItem) => (
                    <li key={caseItem.id} className={styles.itemCard}>
                      <Link href={`/admin/patients/${caseItem.patient.id}`} className={styles.itemLink}>
                        <strong>{caseItem.patient.fullName}</strong>
                        <span>{caseItem.patient.code} • triage {caseItem.urgencyLevel ?? '-'} • score {caseItem.riskScore?.toString() ?? '-'}</span>
                        <p dir="auto">{caseItem.symptomSummary}</p>
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
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}
        </section>
      </section>
    </main>
  );
}