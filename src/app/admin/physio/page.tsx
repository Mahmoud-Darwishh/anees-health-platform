import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import { type Prisma } from '@prisma/client';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { addPhysioWorkspaceReportAction, recordPhysioAttendanceAction } from './actions';
import styles from './physio.module.scss';

type Props = {
  searchParams: Promise<{ forbidden?: string; updated?: string }>;
};

export const metadata: Metadata = {
  title: 'Physio Workspace | Anees Admin',
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function formatDateTime(value: Date | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function toCurrency(value: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value);
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toVisitStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
}

function summarizeHash(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export default async function AdminPhysioWorkspacePage({ searchParams }: Props) {
  const session = await requireStaffPermission('physio.write');
  if (session.user.staffRole !== 'physiotherapist') {
    redirect('/admin/patients?forbidden=1');
  }
  const query = await searchParams;
  const staffId = session.user.staffId;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const last30Days = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  const assignments = staffId
    ? await prisma.staffPatientAssignment.findMany({
        where: { staffId },
        orderBy: [{ isActive: 'desc' }, { assignedAt: 'desc' }],
        select: {
          id: true,
          isActive: true,
          assignedAt: true,
          patient: {
            select: {
              id: true,
              code: true,
              fullName: true,
              status: true,
              updatedAt: true,
            },
          },
        },
      })
    : [];

  const currentAssignments = assignments.filter((assignment) => assignment.isActive);
  const previousAssignments = assignments.filter((assignment) => !assignment.isActive);
  const currentPatientIds = currentAssignments.map((assignment) => assignment.patient.id);
  const assignedPatientIds = assignments.map((assignment) => assignment.patient.id);

  const [staffProfile, latestReports, upcomingVisits, recentProofs, reportsLoggedThisWeek] = await Promise.all([
    staffId
      ? prisma.staff.findUnique({
          where: { id: staffId },
          select: {
            id: true,
            providerId: true,
            provider: {
              select: {
                id: true,
                code: true,
                fullName: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    assignedPatientIds.length > 0
      ? prisma.physioSessionReport.findMany({
          where: {
            deletedAt: null,
            patientId: { in: assignedPatientIds },
          },
          orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
          distinct: ['patientId'],
          select: {
            patientId: true,
            sessionDate: true,
            sessionNumber: true,
            nextSessionDate: true,
            painScoreBefore: true,
            painScoreAfter: true,
          },
        })
      : Promise.resolve([]),
    currentPatientIds.length > 0
      ? prisma.visit.findMany({
          where: {
            patientId: { in: currentPatientIds },
            scheduledDate: { gte: startOfToday },
            status: { in: ['scheduled', 'in_progress', 'rescheduled'] },
          },
          orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
          take: 24,
          select: {
            id: true,
            patientId: true,
            scheduledDate: true,
            scheduledTime: true,
            status: true,
            service: { select: { name: true } },
            area: { select: { name: true } },
            patient: { select: { id: true, code: true, fullName: true } },
          },
        })
      : Promise.resolve([]),
    assignedPatientIds.length > 0
      ? prisma.physioAttendanceProof.findMany({
          where: {
            patientId: { in: assignedPatientIds },
          },
          orderBy: { attendedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            patientId: true,
            attendanceEvent: true,
            attendedAt: true,
            gpsLatitude: true,
            gpsLongitude: true,
            faceIdConfidenceScore: true,
            selfieEvidenceHash: true,
            faceIdEvidenceHash: true,
            signedAuditBundle: true,
            verificationNotes: true,
            patient: {
              select: {
                fullName: true,
                code: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    staffId
      ? prisma.physioSessionReport.count({
          where: {
            enteredByStaffId: staffId,
            deletedAt: null,
            createdAt: { gte: startOfWeek },
          },
        })
      : Promise.resolve(0),
  ]);

  const linkedProvider = staffProfile?.provider ?? null;

  const latestReportByPatientId = new Map(latestReports.map((report) => [report.patientId, report]));

  const [visitFinancials, payoutLifetime, payoutLast30Days, payoutHistory] = linkedProvider
    ? await Promise.all([
        prisma.visit.aggregate({
          where: {
            providerId: linkedProvider.id,
            status: { in: ['in_progress', 'completed'] },
          },
          _count: { id: true },
          _sum: {
            netPriceEgp: true,
            providerPayoutEgp: true,
          },
        }),
        prisma.providerPayout.aggregate({
          where: {
            providerId: linkedProvider.id,
          },
          _sum: {
            netAmountEgp: true,
          },
        }),
        prisma.providerPayout.aggregate({
          where: {
            providerId: linkedProvider.id,
            payoutDate: { gte: last30Days },
          },
          _sum: {
            netAmountEgp: true,
          },
        }),
        prisma.providerPayout.findMany({
          where: {
            providerId: linkedProvider.id,
          },
          orderBy: { payoutDate: 'desc' },
          take: 6,
          select: {
            id: true,
            code: true,
            payoutDate: true,
            periodStart: true,
            periodEnd: true,
            totalVisits: true,
            netAmountEgp: true,
          },
        }),
      ])
    : [
        {
          _count: { id: 0 },
          _sum: { netPriceEgp: null, providerPayoutEgp: null },
        },
        { _sum: { netAmountEgp: null } },
        { _sum: { netAmountEgp: null } },
        [],
      ];

  const totalRevenueEgp = toNumber(visitFinancials._sum.netPriceEgp);
  const expectedPayoutEgp = toNumber(visitFinancials._sum.providerPayoutEgp);
  const totalTransferredEgp = toNumber(payoutLifetime._sum.netAmountEgp);
  const last30TransferredEgp = toNumber(payoutLast30Days._sum.netAmountEgp);

  const updatedState = query.updated;

  return (
    <AdminDashboardShell
      title="Physiotherapy Workspace"
      subtitle="Single workspace for assigned cases, attendance capture, session reporting, and payout visibility."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/physio': currentAssignments.length,
        '/admin/patients': currentAssignments.length,
      }}
      metrics={[
        { label: 'Active Cases', value: currentAssignments.length, hint: 'Currently assigned', tone: 'sky' },
        { label: 'Upcoming Sessions', value: upcomingVisits.length, hint: 'Scheduled or in progress', tone: 'mint' },
        { label: 'Reports This Week', value: reportsLoggedThisWeek, hint: 'Entered by you', tone: 'amber' },
        { label: 'Total Transferred', value: `${toCurrency(totalTransferredEgp)} • 0 USD`, hint: 'Provider payouts', tone: 'violet' },
      ]}
      quickLinks={[
        { href: '/admin/physio', label: 'Physio Workspace', tone: 'primary' },
        { href: '/admin/patients', label: 'My Cases' },
        { href: '/en', label: 'Return Home' },
      ]}
    >
      <section className={styles.stack}>
        {query.forbidden ? (
          <p className={styles.bannerWarning}>Your role can only access the physiotherapy workspace and assigned patient records.</p>
        ) : null}

        {updatedState === 'attendance' ? (
          <p className={styles.bannerSuccess}>Attendance has been recorded successfully.</p>
        ) : null}

        {updatedState === 'report' ? (
          <p className={styles.bannerSuccess}>Session report has been saved successfully.</p>
        ) : null}

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <p>Current Cases</p>
            <strong>{currentAssignments.length}</strong>
            <span>Active physiotherapy case ownership</span>
          </article>
          <article className={styles.summaryCard}>
            <p>Previous Cases</p>
            <strong>{previousAssignments.length}</strong>
            <span>Archived assignments in your history</span>
          </article>
          <article className={styles.summaryCard}>
            <p>Expected Payout</p>
            <strong>{toCurrency(expectedPayoutEgp)}</strong>
            <span>From in-progress + completed visits</span>
          </article>
          <article className={styles.summaryCard}>
            <p>Transferred (30 Days)</p>
            <strong>{toCurrency(last30TransferredEgp)}</strong>
            <span>Provider payouts in the last month</span>
          </article>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>My Current Cases</h2>
              <p>Only assigned patients are shown here.</p>
            </div>
            <Link href="/admin/patients" className={styles.linkButton}>
              Open Registry
            </Link>
          </div>

          {currentAssignments.length === 0 ? (
            <p className={styles.emptyState}>No active assignments yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Case Code</th>
                    <th>Status</th>
                    <th>Latest Session</th>
                    <th>Next Session</th>
                    <th>Open EHR</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAssignments.map((assignment) => {
                    const latest = latestReportByPatientId.get(assignment.patient.id);
                    return (
                      <tr key={assignment.id}>
                        <td>{assignment.patient.fullName}</td>
                        <td>{assignment.patient.code}</td>
                        <td>{assignment.patient.status}</td>
                        <td>
                          {latest ? (
                            <>
                              {formatDate(latest.sessionDate)}
                              <span className={styles.rowSubline}>Session #{latest.sessionNumber}</span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{formatDate(latest?.nextSessionDate)}</td>
                        <td>
                          <Link href={`/admin/patients/${assignment.patient.id}`} className={styles.inlineLink}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Session Attendance</h2>
              <p>Capture check-in/check-out and keep a verified timestamp trail.</p>
            </div>
          </div>

          {upcomingVisits.length === 0 ? (
            <p className={styles.emptyState}>No upcoming physiotherapy sessions for your active cases.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Service</th>
                    <th>Area</th>
                    <th>Status</th>
                    <th>Attendance Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        {formatDate(visit.scheduledDate)}
                        <span className={styles.rowSubline}>{visit.scheduledTime ?? 'Time not set'}</span>
                      </td>
                      <td>
                        {visit.patient.fullName}
                        <span className={styles.rowSubline}>{visit.patient.code}</span>
                      </td>
                      <td>{visit.service.name}</td>
                      <td>{visit.area?.name ?? '-'}</td>
                      <td>{toVisitStatusLabel(visit.status)}</td>
                      <td>
                        <form action={recordPhysioAttendanceAction} className={styles.inlineForm}>
                          <input type="hidden" name="patientId" value={visit.patientId} />
                          <input type="hidden" name="visitId" value={visit.id} />
                          <select name="attendanceAction" defaultValue="check_in" aria-label="Attendance action">
                            <option value="check_in">Check In</option>
                            <option value="check_out">Check Out</option>
                          </select>
                          <input
                            name="attendanceNote"
                            placeholder="Optional note"
                            aria-label="Attendance note"
                            maxLength={800}
                          />
                          <input name="gpsLatitude" placeholder="Lat" aria-label="GPS latitude" />
                          <input name="gpsLongitude" placeholder="Lng" aria-label="GPS longitude" />
                          <input name="gpsAccuracyMeters" placeholder="GPS m" aria-label="GPS accuracy meters" />
                          <input name="selfieEvidenceHash" placeholder="Selfie hash" aria-label="Selfie evidence hash" maxLength={320} />
                          <input name="faceIdEvidenceHash" placeholder="Face hash" aria-label="Face ID evidence hash" maxLength={320} />
                          <input
                            name="faceIdConfidenceScore"
                            placeholder="Face %"
                            aria-label="Face ID confidence score"
                          />
                          <input
                            name="signedAuditBundle"
                            placeholder="Signed audit bundle"
                            aria-label="Signed audit bundle"
                            maxLength={8000}
                          />
                          <button type="submit">Save</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.dualGrid}>
          <article className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Log Session Report</h2>
                <p>Fast reporting without leaving the workspace.</p>
              </div>
            </div>

            <form action={addPhysioWorkspaceReportAction} className={styles.reportGrid}>
              <label>
                <span>Patient</span>
                <select name="patientId" required defaultValue="">
                  <option value="" disabled>
                    Select patient
                  </option>
                  {currentAssignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.patient.id}>
                      {assignment.patient.fullName} ({assignment.patient.code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Related Visit (optional)</span>
                <select name="visitId" defaultValue="">
                  <option value="">Not linked</option>
                  {upcomingVisits.map((visit) => (
                    <option key={visit.id} value={visit.id}>
                      {visit.patient.fullName} - {formatDate(visit.scheduledDate)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Session Date</span>
                <input type="date" name="sessionDate" required />
              </label>

              <label>
                <span>Session Number</span>
                <input type="number" name="sessionNumber" min={1} max={1200} required />
              </label>

              <label className={styles.fullWidth}>
                <span>Interventions</span>
                <textarea name="interventions" rows={3} required maxLength={3000} />
              </label>

              <label className={styles.fullWidth}>
                <span>Treatment Plan</span>
                <textarea name="treatmentPlan" rows={2} maxLength={1200} />
              </label>

              <label className={styles.fullWidth}>
                <span>Response</span>
                <textarea name="response" rows={2} maxLength={2000} />
              </label>

              <label>
                <span>Pain Before</span>
                <input type="number" name="painScoreBefore" min={0} max={10} />
              </label>

              <label>
                <span>Pain After</span>
                <input type="number" name="painScoreAfter" min={0} max={10} />
              </label>

              <label>
                <span>Next Session Date</span>
                <input type="date" name="nextSessionDate" />
              </label>

              <label className={styles.fullWidth}>
                <span>Mobility Note</span>
                <textarea name="mobilityNote" rows={2} maxLength={1200} />
              </label>

              <label className={styles.fullWidth}>
                <span>Home Exercise Plan</span>
                <textarea name="homeExercisePlan" rows={2} maxLength={1500} />
              </label>

              <div className={styles.formActions}>
                <button type="submit">Save Session Report</button>
              </div>
            </form>
          </article>

          <article className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Attendance & Verification Trail</h2>
                <p>Recent attendance events for your assigned cases.</p>
              </div>
            </div>

            {recentProofs.length === 0 ? (
              <p className={styles.emptyState}>No attendance logs yet.</p>
            ) : (
              <ul className={styles.timeline}>
                {recentProofs.map((item) => (
                  <li key={item.id}>
                    <p>
                      <strong>{item.patient.fullName}</strong> ({item.patient.code})
                    </p>
                    <p>{item.attendanceEvent === 'check_in' ? 'Check In' : 'Check Out'}</p>
                    <p>
                      GPS: {item.gpsLatitude ? item.gpsLatitude.toString() : '-'}, {item.gpsLongitude ? item.gpsLongitude.toString() : '-'}
                    </p>
                    <p>
                      Face ID Confidence: {item.faceIdConfidenceScore ? item.faceIdConfidenceScore.toString() : '-'}
                    </p>
                    <p>
                      Selfie Hash: {summarizeHash(item.selfieEvidenceHash)} | Face Hash: {summarizeHash(item.faceIdEvidenceHash)}
                    </p>
                    <p>Audit Bundle: {summarizeHash(item.signedAuditBundle)}</p>
                    {item.verificationNotes ? <p>Notes: {item.verificationNotes}</p> : null}
                    <span>{formatDateTime(item.attendedAt)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.futureCard}>
              <h3>Future Attendance Proof Integrations</h3>
              <p>Planned: geo-validation and Face ID confidence check before session close.</p>
              <div className={styles.futureList}>
                <span>Location radius check against patient map pin</span>
                <span>Face ID verification capture before check-out</span>
                <span>Signed evidence packet linked to AuditLog</span>
              </div>
              <button type="button" disabled>
                Calendar + Face ID Integration (Coming Soon)
              </button>
            </div>
          </article>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>My Financials</h2>
              <p>Provider-linked revenue and payout visibility for physiotherapy work.</p>
            </div>
          </div>

          {!linkedProvider ? (
            <p className={styles.bannerWarning}>
              Provider profile is not linked to this staff account yet. Set Staff.providerId to enable deterministic finance ownership.
            </p>
          ) : null}

          <section className={styles.financeGrid}>
            <article>
              <p>Total Revenue</p>
              <strong>{toCurrency(totalRevenueEgp)}</strong>
              <span>{visitFinancials._count.id} visits counted</span>
            </article>
            <article>
              <p>Expected Payout</p>
              <strong>{toCurrency(expectedPayoutEgp)}</strong>
              <span>From visit payout values</span>
            </article>
            <article>
              <p>Total Transferred</p>
              <strong>{toCurrency(totalTransferredEgp)}</strong>
              <span>Settled provider payouts</span>
            </article>
            <article>
              <p>Transferred Last 30 Days</p>
              <strong>{toCurrency(last30TransferredEgp)}</strong>
              <span>Recent payout history</span>
            </article>
          </section>

          {payoutHistory.length === 0 ? (
            <p className={styles.emptyState}>No payout records found yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Payout</th>
                    <th>Period</th>
                    <th>Payout Date</th>
                    <th>Total Visits</th>
                    <th>Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout) => (
                    <tr key={payout.id}>
                      <td>{payout.code}</td>
                      <td>
                        {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                      </td>
                      <td>{formatDate(payout.payoutDate)}</td>
                      <td>{payout.totalVisits}</td>
                      <td>{toCurrency(toNumber(payout.netAmountEgp))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {previousAssignments.length > 0 ? (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Previous Cases</h2>
                <p>Closed or reassigned patient links for your review history.</p>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Case Code</th>
                    <th>Status</th>
                    <th>Unassigned At</th>
                  </tr>
                </thead>
                <tbody>
                  {previousAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>{assignment.patient.fullName}</td>
                      <td>{assignment.patient.code}</td>
                      <td>{assignment.patient.status}</td>
                      <td>{formatDate(assignment.assignedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </AdminDashboardShell>
  );
}
