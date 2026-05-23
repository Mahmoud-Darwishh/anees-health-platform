import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { buildPatientExportManifest, decodeExportVerificationToken, hashExportPayload } from '@/lib/ehr/export';
import { getPatientEhrSnapshot } from '@/lib/ehr/patient-snapshot';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../export.module.scss';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  title: 'Export Verification | Anees Admin',
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(value);
}

export default async function ExportVerificationPage({ params, searchParams }: Props) {
  const session = await requireStaffPermission('patients.read');
  const { id } = await params;
  const query = await searchParams;
  const token = query.token?.trim() ?? '';
  const decoded = token ? decodeExportVerificationToken(token) : null;

  if (!(await canAccessPatientRecord(session, id))) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <p className={styles.dangerNotice}>You are not assigned to this patient record.</p>
          <Link href="/admin/patients" className={styles.backLink}>Back to patients</Link>
        </section>
      </main>
    );
  }

  const patient = await getPatientEhrSnapshot(id);

  if (!patient) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <p className={styles.dangerNotice}>Patient not found.</p>
          <Link href="/admin/patients" className={styles.backLink}>Back to patients</Link>
        </section>
      </main>
    );
  }

  if (!decoded || decoded.patientId !== patient.id) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.headerRow}>
            <div>
              <h1>Export Verification</h1>
              <p>{patient.fullName} • {patient.code}</p>
            </div>
            <Link href={`/admin/patients/${patient.id}/export`} className={styles.backLink}>Back to export</Link>
          </header>
          <p className={styles.dangerNotice}>The verification token is missing or invalid.</p>
        </section>
      </main>
    );
  }

  const generatedAt = new Date(decoded.generatedAt);
  const manifest = buildPatientExportManifest(patient, generatedAt);
  const liveHash = hashExportPayload(manifest);
  const verified = liveHash === decoded.exportHash;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <h1>Export Verification</h1>
            <p>{patient.fullName} • {patient.code}</p>
          </div>
          <div className={styles.actions}>
            <Link href={`/admin/patients/${patient.id}/export`} className={styles.actionLink}>Open export</Link>
            <Link href={`/admin/patients/${patient.id}`} className={styles.backLink}>Back to patient</Link>
          </div>
        </header>

        <p className={verified ? styles.notice : styles.dangerNotice}>
          {verified ? 'The export snapshot is verified against the live record.' : 'The export hash does not match the current live record.'}
        </p>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryTile}>
            <p>Status</p>
            <strong>{verified ? 'Verified' : 'Mismatch'}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Generated</p>
            <strong>{formatDate(generatedAt)}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Current notes</p>
            <strong>{manifest.counts.progressNotes}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Token patient</p>
            <strong>{decoded.patientId}</strong>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Token Payload</h2>
            <pre className={styles.mono}>{JSON.stringify(decoded, null, 2)}</pre>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Live Hash</h2>
            <p className={styles.subtle}>If the patient chart changes after export, this value changes and the verification page will flag the mismatch.</p>
            <p className={styles.mono}>{liveHash}</p>
          </article>
        </section>
      </section>
    </main>
  );
}