import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { getAccessiblePatientWhere } from '@/lib/auth/record-access';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './patients.module.scss';

type Props = {
  searchParams: Promise<{ q?: string; forbidden?: string }>;
};

export const metadata: Metadata = {
  title: 'Patients | Anees Admin',
  robots: { index: false, follow: false },
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function toStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
}

function toStatusClass(status: string): string {
  if (status === 'active') return styles.statusActive;
  if (status === 'new') return styles.statusNew;
  if (status === 'lapsed') return styles.statusLapsed;
  return styles.statusInactive;
}

export default async function AdminPatientsPage({ searchParams }: Props) {
  const session = await requireStaffPermission('patients.read');
  const query = await searchParams;
  const q = query.q?.trim() ?? '';
  const accessibleWhere = await getAccessiblePatientWhere(session);

  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: null,
      ...accessibleWhere,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      code: true,
      fullName: true,
      phone: true,
      status: true,
      updatedAt: true,
    },
  });

  const canViewAudit = hasPermission(session.user.staffRole, 'audit.read');

  const referenceNow = new Date(session.expires);
  const lastSevenDays = new Date(referenceNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  const totalPatients = patients.length;
  const activePatients = patients.filter((patient) => patient.status === 'active').length;
  const newPatients = patients.filter((patient) => patient.status === 'new').length;
  const refreshedLastWeek = patients.filter((patient) => patient.updatedAt >= lastSevenDays).length;
  const isPhysiotherapist = session.user.staffRole === 'physiotherapist';
  const quickLinks = isPhysiotherapist
    ? [
        { href: '/admin/physio', label: 'Physio Workspace', tone: 'primary' as const },
        { href: '/admin/patients', label: 'My Cases' },
      ]
    : [
        { href: '/admin/dashboards', label: 'Clinical Dashboards' },
        { href: '/admin/queues', label: 'Work Queues' },
        ...(canViewAudit ? [{ href: '/admin/audit-logs', label: 'Audit Logs', tone: 'primary' as const }] : []),
      ];

  return (
    <AdminDashboardShell
      title="Patient Registry"
      subtitle="Find and open EHR profiles quickly."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/patients': totalPatients,
      }}
      metrics={[
        { label: 'Visible Patients', value: totalPatients, hint: 'Current query scope', tone: 'sky' },
        { label: 'Active', value: activePatients, hint: 'Care-ready profiles', tone: 'mint' },
        { label: 'New Cases', value: newPatients, hint: 'Needs first review', tone: 'amber' },
        { label: 'Updated 7 Days', value: refreshedLastWeek, hint: 'Recently touched charts', tone: 'violet' },
      ]}
      quickLinks={quickLinks}
    >
      <section className={styles.stack}>
        <header className={styles.headerRow}>
          <div>
            <h2>Registry Workspace</h2>
          </div>
          <span className={styles.rangeBadge}>Showing up to 100 profiles</span>
        </header>

        {query.forbidden && (
          <p className={styles.errorBanner}>You do not have permission to access that admin section.</p>
        )}

        <section className={styles.searchCard}>
          <form className={styles.searchRow}>
            <label className={styles.searchField}>
              <span>Find patient</span>
              <input
                name="q"
                placeholder="Search by patient name, case ID, or phone"
                defaultValue={q}
                aria-label="Search patients by name, case ID, or phone"
              />
            </label>
            <button type="submit" className={styles.searchBtn}>Search</button>
          </form>
        </section>

        {patients.length === 0 ? (
          <section className={styles.emptyState}>
            <h3>No patients found</h3>
            <p>Try a broader search term or clear filters to see all assigned patients.</p>
          </section>
        ) : (
          <>
            <section className={styles.tableWrap} aria-label="Patient registry table">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.code}</td>
                      <td>
                        <strong className={styles.patientName}>{patient.fullName}</strong>
                      </td>
                      <td>{patient.phone}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${toStatusClass(patient.status)}`}>
                          {toStatusLabel(patient.status)}
                        </span>
                      </td>
                      <td>{formatDate(patient.updatedAt)}</td>
                      <td>
                        <Link href={`/admin/patients/${patient.id}`} className={styles.openLink}>
                          Open Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={styles.mobileCards} aria-label="Patient registry cards">
              {patients.map((patient) => (
                <article className={styles.mobileCard} key={`mobile-${patient.id}`}>
                  <p className={styles.mobileCase}>{patient.code}</p>
                  <h3>{patient.fullName}</h3>
                  <dl>
                    <div>
                      <dt>Phone</dt>
                      <dd>{patient.phone}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className={`${styles.statusBadge} ${toStatusClass(patient.status)}`}>
                          {toStatusLabel(patient.status)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDate(patient.updatedAt)}</dd>
                    </div>
                  </dl>
                  <Link href={`/admin/patients/${patient.id}`} className={styles.openCardLink}>
                    Open Profile
                  </Link>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </AdminDashboardShell>
  );
}
