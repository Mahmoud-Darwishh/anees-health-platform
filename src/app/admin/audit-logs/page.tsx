import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import styles from './audit-logs.module.scss';

type Props = {
  searchParams: Promise<{ table?: string; actor?: string }>;
};

export const metadata: Metadata = {
  title: 'Audit Logs | Anees Admin',
  robots: { index: false, follow: false },
};

function formatJsonValue(value: Prisma.JsonValue | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, Prisma.JsonValue>;
}

function getFieldDiffs(log: {
  changedFields: Prisma.JsonValue | null;
  previousData: Prisma.JsonValue | null;
  newData: Prisma.JsonValue | null;
}) {
  const changedFields = Array.isArray(log.changedFields)
    ? log.changedFields.filter((field): field is string => typeof field === 'string')
    : [];

  const before = asRecord(log.previousData);
  const after = asRecord(log.newData);

  const fields = changedFields.length > 0 ? changedFields : Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return fields.map((field) => ({
    field,
    before: formatJsonValue(before[field]),
    after: formatJsonValue(after[field]),
  }));
}

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  const session = await requireStaffPermission('audit.read');
  const query = await searchParams;
  const table = query.table?.trim() ?? '';
  const actor = query.actor?.trim() ?? '';

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(table ? { tableName: { equals: table, mode: 'insensitive' } } : {}),
      ...(actor ? { changedBy: { contains: actor, mode: 'insensitive' } } : {}),
    },
    orderBy: { changedAt: 'desc' },
    take: 200,
  });

  const createCount = logs.filter((item) => item.action === 'create').length;
  const updateCount = logs.filter((item) => item.action === 'update').length;
  const deleteCount = logs.filter((item) => item.action === 'delete').length;
  const uniqueTables = new Set(logs.map((item) => item.tableName)).size;

  return (
    <AdminDashboardShell
      title="Audit Logs"
      subtitle="Compact, queryable trail of clinical and patient record changes."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/audit-logs': logs.length,
      }}
      metrics={[
        { label: 'Rows', value: logs.length, hint: 'Current filter', tone: 'sky' },
        { label: 'Create', value: createCount, hint: 'Insert actions', tone: 'mint' },
        { label: 'Update', value: updateCount, hint: 'Mutation actions', tone: 'amber' },
        { label: 'Tables', value: uniqueTables, hint: 'Touched models', tone: 'violet' },
      ]}
      quickLinks={[
        { href: '/admin/patients', label: 'Patient Registry' },
        { href: '/admin/queues', label: 'Work Queues' },
        { href: '/admin/audit-logs', label: 'Audit Logs', tone: 'primary' },
      ]}
    >
      <section className={styles.stack}>
        <header className={styles.headerRow}>
          <div>
            <h2>Audit Trail</h2>
            <p>Filter by model and actor, then inspect field-level change snapshots.</p>
          </div>
          <Link href="/admin/patients" className={styles.navLink}>Back to patients</Link>
        </header>

        <form className={styles.searchRow}>
          <input name="table" placeholder="Filter by table (e.g. Patient, Allergy)" defaultValue={table} />
          <input name="actor" placeholder="Filter by actor ID" defaultValue={actor} />
          <button type="submit">Filter</button>
        </form>

        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Table</th>
                <th>Action</th>
                <th>Record ID</th>
                <th>Changed By</th>
                <th>Changed Fields</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const diffs = getFieldDiffs(log);

                return (
                  <tr key={log.id}>
                    <td>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(log.changedAt)}</td>
                    <td>{log.tableName}</td>
                    <td>{log.action}</td>
                    <td>{log.recordId}</td>
                    <td>{log.changedBy ?? '-'}</td>
                    <td>{Array.isArray(log.changedFields) ? log.changedFields.join(', ') : '-'}</td>
                    <td>
                      <details className={styles.diffDetails}>
                        <summary>View</summary>
                        <div className={styles.diffList}>
                          {diffs.map((item) => (
                            <section key={`${log.id}-${item.field}`} className={styles.diffItem}>
                              <p className={styles.diffField}>{item.field}</p>
                              <p>
                                <strong>Before:</strong> {item.before}
                              </p>
                              <p>
                                <strong>After:</strong> {item.after}
                              </p>
                            </section>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className={styles.mobileCards} aria-label="Audit log cards">
          {logs.map((log) => (
            <article className={styles.mobileCard} key={`card-${log.id}`}>
              <p className={styles.mobileKicker}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(log.changedAt)}</p>
              <h3>{log.tableName} • {log.action}</h3>
              <p>{log.recordId}</p>
              <p>{log.changedBy ?? '-'}</p>
              <details className={styles.diffDetails}>
                <summary>View diff</summary>
                <div className={styles.diffList}>
                  {getFieldDiffs(log).map((item) => (
                    <section key={`mobile-${log.id}-${item.field}`} className={styles.diffItem}>
                      <p className={styles.diffField}>{item.field}</p>
                      <p>
                        <strong>Before:</strong> {item.before}
                      </p>
                      <p>
                        <strong>After:</strong> {item.after}
                      </p>
                    </section>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </section>
      </section>
    </AdminDashboardShell>
  );
}
