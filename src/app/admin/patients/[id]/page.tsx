import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import { canBypassPatientAssignment, canAccessPatientRecord } from '@/lib/auth/record-access';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  addAllergyAction,
  assignStaffToPatientAction,
  removeStaffAssignmentAction,
  addMedicationAction,
  addProgressNoteAction,
  updatePatientCoreAction,
} from './actions';
import styles from './patient-detail.module.scss';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
};

export const metadata: Metadata = {
  title: 'Patient Profile | Anees Admin',
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

export default async function AdminPatientDetailPage({ params, searchParams }: Props) {
  const session = await requireStaffPermission('patients.read');
  const { id } = await params;
  const query = await searchParams;

  const allowed = await canAccessPatientRecord(session, id);
  if (!allowed) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <p className={styles.errorBanner}>You are not assigned to this patient record.</p>
          <Link href="/admin/patients" className={styles.navLink}>Back to patients</Link>
        </section>
      </main>
    );
  }

  const canManageAssignments = canBypassPatientAssignment(session);

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      code: true,
      fullName: true,
      phone: true,
      status: true,
      dateOfBirth: true,
      registrationDate: true,
      chiefComplaint: true,
      notes: true,
      visits: {
        orderBy: { scheduledDate: 'desc' },
        take: 10,
        select: {
          id: true,
          code: true,
          scheduledDate: true,
          status: true,
          service: { select: { name: true } },
        },
      },
      allergies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          allergen: true,
          severity: true,
          reaction: true,
          createdAt: true,
        },
      },
      medications: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          medicationName: true,
          dose: true,
          frequency: true,
          isActive: true,
          startDate: true,
        },
      },
      progressNotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          noteBody: true,
          createdAt: true,
          signedOffAt: true,
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
        },
      },
      staffAssignments: {
        where: { isActive: true },
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          assignedAt: true,
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  const assignableStaff = canManageAssignments
    ? await prisma.staff.findMany({
        where: {
          status: 'active',
          id: { notIn: patient?.staffAssignments.map((item) => item.staff.id) ?? [] },
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, role: true },
      })
    : [];

  if (!patient) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <p className={styles.errorBanner}>Patient not found.</p>
          <Link href="/admin/patients" className={styles.navLink}>Back to patients</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <p className={styles.kicker}>Patient EHR</p>
            <h1>{patient.fullName}</h1>
            <p>
              {patient.code} • {patient.phone}
            </p>
          </div>
          <Link href="/admin/patients" className={styles.navLink}>Back to patients</Link>
        </header>

        {query.updated && <p className={styles.successBanner}>Saved successfully.</p>}

        {canManageAssignments && (
          <article className={styles.card}>
            <h2>Staff Access Assignment</h2>

            <form action={assignStaffToPatientAction} className={styles.assignRow}>
              <input type="hidden" name="patientId" value={patient.id} />
              <select name="staffId" required>
                <option value="">Select staff member</option>
                {assignableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.primaryBtn}>Assign Access</button>
            </form>

            {patient.staffAssignments.length === 0 ? (
              <p className={styles.emptyText}>No active staff assignments.</p>
            ) : (
              <ul className={styles.list}>
                {patient.staffAssignments.map((assignment) => (
                  <li key={assignment.id}>
                    <strong>{assignment.staff.name}</strong>
                    <span>{assignment.staff.role} • {assignment.staff.email} • {formatDate(assignment.assignedAt)}</span>
                    <form action={removeStaffAssignmentAction} className={styles.inlineDangerForm}>
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <input type="hidden" name="patientId" value={patient.id} />
                      <button type="submit" className={styles.dangerBtn}>Remove Access</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Core Profile</h2>
            <p className={styles.metaLine}>DOB: {formatDate(patient.dateOfBirth)} • Registered: {formatDate(patient.registrationDate)}</p>
            <form action={updatePatientCoreAction} className={styles.formGrid}>
              <input type="hidden" name="patientId" value={patient.id} />
              <label>
                Status
                <select name="status" defaultValue={patient.status}>
                  <option value="new">new</option>
                  <option value="active">active</option>
                  <option value="lapsed">lapsed</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <label>
                Chief complaint
                <textarea name="chiefComplaint" rows={2} defaultValue={patient.chiefComplaint ?? ''} />
              </label>
              <label>
                Notes
                <textarea name="notes" rows={3} defaultValue={patient.notes ?? ''} />
              </label>
              <button type="submit" className={styles.primaryBtn}>Save core profile</button>
            </form>
          </article>

          <article className={styles.card}>
            <h2>Add Allergy</h2>
            <form action={addAllergyAction} className={styles.formGrid}>
              <input type="hidden" name="patientId" value={patient.id} />
              <label>
                Allergen
                <input name="allergen" required />
              </label>
              <label>
                Severity
                <input name="severity" placeholder="mild / moderate / severe" />
              </label>
              <label>
                Reaction
                <input name="reaction" placeholder="rash, breathing difficulty..." />
              </label>
              <label>
                Notes
                <textarea name="notes" rows={2} />
              </label>
              <button type="submit" className={styles.primaryBtn}>Add allergy</button>
            </form>
          </article>

          <article className={styles.card}>
            <h2>Add Medication</h2>
            <form action={addMedicationAction} className={styles.formGrid}>
              <input type="hidden" name="patientId" value={patient.id} />
              <label>
                Medication
                <input name="medicationName" required />
              </label>
              <label>
                Dose
                <input name="dose" placeholder="e.g. 5 mg" />
              </label>
              <label>
                Frequency
                <input name="frequency" placeholder="e.g. once daily" />
              </label>
              <label>
                Route
                <input name="route" placeholder="oral / IV / topical" />
              </label>
              <label>
                Start date
                <input type="date" name="startDate" />
              </label>
              <label>
                Notes
                <textarea name="notes" rows={2} />
              </label>
              <button type="submit" className={styles.primaryBtn}>Add medication</button>
            </form>
          </article>

          <article className={styles.card}>
            <h2>Add Progress Note</h2>
            <form action={addProgressNoteAction} className={styles.formGrid}>
              <input type="hidden" name="patientId" value={patient.id} />
              <label>
                Related visit (optional)
                <select name="visitId" defaultValue="">
                  <option value="">No linked visit</option>
                  {patient.visits.map((visit) => (
                    <option value={visit.id} key={visit.id}>
                      {visit.code} - {formatDate(visit.scheduledDate)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Clinical note
                <textarea name="noteBody" rows={4} required dir="auto" />
              </label>
              <label className={styles.inlineCheck}>
                <input type="checkbox" name="signedOff" />
                Sign off now
              </label>
              <button type="submit" className={styles.primaryBtn}>Add progress note</button>
            </form>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Allergies</h2>
            {patient.allergies.length === 0 ? (
              <p className={styles.emptyText}>No allergies recorded.</p>
            ) : (
              <ul className={styles.list}>
                {patient.allergies.map((allergy) => (
                  <li key={allergy.id}>
                    <strong>{allergy.allergen}</strong>
                    <span>{allergy.severity ?? '-'} • {allergy.reaction ?? '-'} • {formatDate(allergy.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Medications</h2>
            {patient.medications.length === 0 ? (
              <p className={styles.emptyText}>No medications recorded.</p>
            ) : (
              <ul className={styles.list}>
                {patient.medications.map((medication) => (
                  <li key={medication.id}>
                    <strong>{medication.medicationName}</strong>
                    <span>
                      {medication.dose ?? '-'} • {medication.frequency ?? '-'} • {medication.isActive ? 'active' : 'inactive'} • {formatDate(medication.startDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Progress Notes</h2>
            {patient.progressNotes.length === 0 ? (
              <p className={styles.emptyText}>No progress notes recorded.</p>
            ) : (
              <ul className={styles.list}>
                {patient.progressNotes.map((note) => (
                  <li key={note.id}>
                    <strong>{formatDate(note.createdAt)}</strong>
                    <span>{note.signedOffAt ? 'Signed' : 'Draft'}</span>
                    <p dir="auto">{note.noteBody}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Documents</h2>
            {patient.documents.length === 0 ? (
              <p className={styles.emptyText}>No documents uploaded yet.</p>
            ) : (
              <ul className={styles.list}>
                {patient.documents.map((doc) => (
                  <li key={doc.id}>
                    <strong>{doc.title}</strong>
                    <span>{doc.category} • {formatDate(doc.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
