import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { prisma } from '@/lib/db/prisma';
import { formatBytes } from '@/lib/utils/format-bytes';
import styles from './documents.module.scss';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'lab_result', label: 'Lab result' },
  { value: 'imaging', label: 'Imaging / scan' },
  { value: 'discharge_summary', label: 'Discharge summary' },
  { value: 'referral', label: 'Referral letter' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'consent', label: 'Consent form' },
  { value: 'insurance', label: 'Insurance / paperwork' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((opt) => [opt.value, opt.label]),
);

const ERROR_MESSAGES: Record<string, string> = {
  missing_file: 'No file was attached.',
  file_too_large: 'File exceeds the 25 MB upload limit.',
  unsupported_type: 'File type not supported. Allowed: PDF, JPEG, PNG, WEBP, DICOM (.dcm).',
  storage_failed: 'Could not save the file. Please try again.',
  db_failed: 'File saved but the database record failed. Contact an admin.',
  delete_failed: 'Could not delete the document.',
};

const SUCCESS_MESSAGES: Record<string, string> = {
  uploaded: 'Document uploaded successfully.',
  deleted: 'Document removed.',
};

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PatientDocumentsPage({ params, searchParams }: Props) {
  const session = await requireStaffPermission('clinical.read');
  const { id: patientId } = await params;
  const sp = await searchParams;

  if (!(await canAccessPatientRecord(session, patientId))) {
    notFound();
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: {
      id: true,
      code: true,
      fullName: true,
      visits: {
        orderBy: { bookedDate: 'desc' },
        take: 50,
        select: { id: true, bookedDate: true, scheduledDate: true, status: true },
      },
    },
  });

  if (!patient) notFound();

  const canWrite = ['superadmin', 'admin', 'doctor', 'physiotherapist', 'nurse'].includes(
    session.user.staffRole ?? '',
  );

  const documents = await prisma.document.findMany({
    where: { patientId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      mimeType: true,
      fileSizeBytes: true,
      createdAt: true,
      visitId: true,
      uploadedByStaff: { select: { name: true } },
    },
  });

  const successKey = sp.success ?? '';
  const errorKey = sp.error ?? '';
  const successMsg = SUCCESS_MESSAGES[successKey];
  const errorMsg = ERROR_MESSAGES[errorKey];

  return (
    <AdminDashboardShell
      title="Patient Documents"
      subtitle="Private EHR files — labs, imaging, discharge summaries, consents, insurance."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      quickLinks={[
        { href: `/admin/patients/${patient.id}`, label: 'Back to Patient' },
        { href: '/admin/patients', label: 'Patient Registry' },
      ]}
    >
      <Suspense>
        <section className={styles.stack}>
          <header className={styles.hero}>
            <div>
              <p className={styles.kicker}>Patient Files</p>
              <h2>{patient.fullName}</h2>
              <p className={styles.heroSubline}>
                {patient.code} • {documents.length} active document{documents.length === 1 ? '' : 's'}
              </p>
            </div>
            <Link href={`/admin/patients/${patient.id}`} className={styles.secondaryLink}>
              Open patient chart
            </Link>
          </header>

          {successMsg ? <div className={styles.banner} data-tone="success">{successMsg}</div> : null}
          {errorMsg ? <div className={styles.banner} data-tone="error">{errorMsg}</div> : null}

          {canWrite ? (
            <article className={styles.card}>
              <h3>Upload a new document</h3>
              <p className={styles.metaLine}>
                Max 25&nbsp;MB. PDF, JPEG, PNG, WEBP, and DICOM (.dcm) are supported. Files are
                stored privately and never served from a public URL.
              </p>
              <form
                action={`/api/admin/patients/${patient.id}/documents`}
                method="POST"
                encType="multipart/form-data"
                className={styles.uploadForm}
              >
                <div className={styles.field}>
                  <label htmlFor="file">File</label>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.dcm,application/pdf,image/jpeg,image/png,image/webp,application/dicom"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    maxLength={200}
                    placeholder="e.g. Lumbar MRI — 12 Nov 2025"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="category">Category</label>
                  <select id="category" name="category" defaultValue="other" required>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="visitId">Link to visit (optional)</label>
                  <select id="visitId" name="visitId" defaultValue="">
                    <option value="">— Not linked —</option>
                    {patient.visits.map((v) => {
                      const when = v.scheduledDate ?? v.bookedDate;
                      return (
                        <option key={v.id} value={v.id}>
                          {when ? formatDate(when) : v.id} — {v.status}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className={styles.actions}>
                  <button type="submit" className={styles.primaryBtn}>Upload</button>
                </div>
              </form>
            </article>
          ) : (
            <article className={styles.card}>
              <p className={styles.metaLine}>
                Your role has read-only access to documents. Contact an admin to upload files.
              </p>
            </article>
          )}

          <article className={styles.card}>
            <h3>All documents</h3>
            {documents.length === 0 ? (
              <p className={styles.emptyText}>No documents uploaded yet.</p>
            ) : (
              <ul className={styles.docList}>
                {documents.map((doc) => (
                  <li key={doc.id} className={styles.docRow}>
                    <div className={styles.docInfo}>
                      <strong>{doc.title}</strong>
                      <p className={styles.docMeta}>
                        {CATEGORY_LABEL[doc.category] ?? doc.category}
                        {' • '}
                        {formatDate(doc.createdAt)}
                        {doc.fileSizeBytes ? ` • ${formatBytes(doc.fileSizeBytes)}` : ''}
                        {doc.uploadedByStaff?.name ? ` • by ${doc.uploadedByStaff.name}` : ''}
                      </p>
                    </div>
                    <div className={styles.docActions}>
                      <a
                        href={`/api/admin/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.secondaryBtn}
                      >
                        View
                      </a>
                      <a
                        href={`/api/admin/documents/${doc.id}/file?download=1`}
                        className={styles.secondaryBtn}
                      >
                        Download
                      </a>
                      {canWrite ? (
                        <form
                          action={`/api/admin/patients/${patient.id}/documents/${doc.id}/delete`}
                          method="POST"
                          className={styles.inlineDangerForm}
                        >
                          <button
                            type="submit"
                            className={styles.dangerBtn}
                            data-confirm="Delete this document?"
                          >
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </Suspense>
    </AdminDashboardShell>
  );
}
