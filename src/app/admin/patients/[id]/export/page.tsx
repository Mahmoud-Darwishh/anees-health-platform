import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { config } from '@/lib/config';
import { buildPatientExportManifest, createExportVerificationToken, hashExportPayload } from '@/lib/ehr/export';
import { getPatientEhrSnapshot } from '@/lib/ehr/patient-snapshot';
import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'qrcode';
import styles from './export.module.scss';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Patient Export | Anees Admin',
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(value);
}

export default async function PatientExportPage({ params }: Props) {
  const session = await requireStaffPermission('patients.read');
  const { id } = await params;

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

  const generatedAt = new Date();
  const manifest = buildPatientExportManifest(patient, generatedAt);
  const exportHash = hashExportPayload(manifest);
  const verificationPayload = {
    patientId: patient.id,
    generatedAt: generatedAt.toISOString(),
    exportHash,
  };
  const verificationToken = createExportVerificationToken(verificationPayload);
  const verificationUrl = new URL(`/admin/patients/${patient.id}/export/verify?token=${verificationToken}`, config.api.baseUrl).toString();
  const qrSvg = await QRCode.toString(verificationUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <h1>Patient Export Template</h1>
            <p>Printable record summary with QR verification and tamper-evident export hash.</p>
          </div>
          <div className={styles.actions}>
            <Link href={`/admin/patients/${patient.id}/export/verify?token=${verificationToken}`} className={styles.actionLink}>Open verification</Link>
            <Link href={`/admin/patients/${patient.id}`} className={styles.backLink}>Back to patient</Link>
          </div>
        </header>

        <p className={styles.notice}>Print this page to save it as PDF. The hash should match the verification page when scanned from the QR code.</p>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryTile}>
            <p>Patient</p>
            <strong>{patient.fullName}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Case ID</p>
            <strong>{patient.code}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Generated</p>
            <strong>{formatDate(generatedAt)}</strong>
          </article>
          <article className={styles.summaryTile}>
            <p>Sections</p>
            <strong>{manifest.counts.progressNotes} notes</strong>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Clinical Snapshot</h2>
            <ul className={styles.metaList}>
              <li>
                <strong>Phone</strong>
                <span>{patient.phone}</span>
              </li>
              <li>
                <strong>Status</strong>
                <span>{patient.status}</span>
              </li>
              <li>
                <strong>Date of birth</strong>
                <span>{formatDate(patient.dateOfBirth)}</span>
              </li>
              <li>
                <strong>Chief complaint</strong>
                <p dir="auto">{patient.chiefComplaint ?? '-'}</p>
              </li>
              <li>
                <strong>Latest visit</strong>
                <span>{manifest.highlights.latestVisit ? `${manifest.highlights.latestVisit.code} • ${manifest.highlights.latestVisit.serviceName} • ${manifest.highlights.latestVisit.status}` : '-'}</span>
              </li>
              <li>
                <strong>Latest progress note</strong>
                <span>{manifest.highlights.latestProgressNote ? `${formatDate(manifest.highlights.latestProgressNote.createdAt)} • ${manifest.highlights.latestProgressNote.addendaCount} addenda` : '-'}</span>
              </li>
            </ul>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Verification QR</h2>
            <p className={styles.subtle}>QR target: {verificationUrl}</p>
            <div className={styles.qrFrame} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Export Hash</h2>
            <div className={styles.hashBox}>
              <p className={styles.subtle}>Verification status is based on a hash of the exported snapshot. Any later mutation will change it.</p>
              <p className={styles.mono}>{exportHash}</p>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Manifest Payload</h2>
            <p className={styles.subtle}>Token: {verificationToken}</p>
            <pre className={styles.mono}>{JSON.stringify(manifest, null, 2)}</pre>
          </article>
        </section>
      </section>
    </main>
  );
}