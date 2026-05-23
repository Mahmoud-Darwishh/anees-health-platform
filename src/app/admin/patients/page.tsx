import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import { hasPermission } from '@/lib/auth/permissions';
import { getAccessiblePatientWhere } from '@/lib/auth/record-access';
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

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <h1>Patient Registry</h1>
            <p>Operational dashboard for patient profiles and EHR updates.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/admin/dashboards" className={styles.queueLink}>
              Clinical Dashboards
            </Link>
            <Link href="/admin/queues" className={styles.queueLink}>
              Work Queues
            </Link>
            {canViewAudit && (
              <Link href="/admin/audit-logs" className={styles.auditLink}>
                View Audit Logs
              </Link>
            )}
          </div>
        </header>

        {query.forbidden && (
          <p className={styles.errorBanner}>You do not have permission to access that admin section.</p>
        )}

        <form className={styles.searchRow}>
          <input name="q" placeholder="Search by patient name, case ID, or phone" defaultValue={q} />
          <button type="submit">Search</button>
        </form>

        <section className={styles.tableWrap}>
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
                  <td>{patient.fullName}</td>
                  <td>{patient.phone}</td>
                  <td>{patient.status}</td>
                  <td>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(patient.updatedAt)}</td>
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
      </section>
    </main>
  );
}
