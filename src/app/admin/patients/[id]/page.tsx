import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import { canBypassPatientAssignment, canAccessPatientRecord } from '@/lib/auth/record-access';
import { buildChartTimeline } from '@/lib/ehr/chart';
import { getPatientEhrSnapshot } from '@/lib/ehr/patient-snapshot';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  addAllergyAction,
  addAiTriageCaseAction,
  addCareTeamMessageAction,
  addDiagnosisAction,
  addProgressNoteAddendumAction,
  addNurseDailyReportAction,
  addPhysioSessionReportAction,
  assignStaffToPatientAction,
  createCallRoutingTicketAction,
  signProgressNoteAction,
  removeStaffAssignmentAction,
  addMedicationAction,
  addProgressNoteAction,
  addVitalSignsAction,
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
  const currentStaffRole = session.user.staffRole ?? 'viewer';
  const canDoctorWrite = ['superadmin', 'admin', 'doctor'].includes(currentStaffRole);
  const canPhysioWrite = ['superadmin', 'admin', 'physiotherapist'].includes(currentStaffRole);
  const canNurseWrite = ['superadmin', 'admin', 'nurse'].includes(currentStaffRole);
  const canOpsWrite = ['superadmin', 'admin', 'operator'].includes(currentStaffRole);

  const patient = await getPatientEhrSnapshot(id);

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

  const chartTimeline = buildChartTimeline(patient);
  const activeDiagnoses = patient.diagnoses.filter((item) => !item.status || /active|chronic/i.test(item.status));
  const activeCarePlans = patient.carePlans.filter((item) => item.status === 'active');
  const activeMedications = patient.medications.filter((item) => item.isActive);

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
          <div className={styles.headerActions}>
            <Link href={`/admin/patients/${patient.id}/export`} className={styles.navLink}>Export PDF</Link>
            <Link href="/admin/patients" className={styles.navLink}>Back to patients</Link>
          </div>
        </header>

        {query.updated && <p className={styles.successBanner}>Saved successfully.</p>}

        <section className={styles.timelineGrid}>
          <article className={styles.card}>
            <h2>Chart Timeline</h2>
            <p className={styles.metaLine}>Merged chronology of encounters, notes, vitals, meds, documents, messages, and task events.</p>
            {chartTimeline.length === 0 ? (
              <p className={styles.emptyText}>No timeline events yet.</p>
            ) : (
              <ul className={styles.timelineList}>
                {chartTimeline.slice(0, 18).map((event) => (
                  <li key={event.id}>
                    <span className={styles.timelineType}>{event.type.replace(/-/g, ' ')}</span>
                    <strong>{formatDate(event.timestamp)}</strong>
                    <p className={styles.timelineTitle}>{event.title}</p>
                    <p className={styles.timelineSubtitle}>{event.subtitle}</p>
                    {event.detail && <p dir="auto">{event.detail}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Structured Snapshot</h2>
            <p className={styles.metaLine}>Active problem, medication, allergy, and care-plan surfaces for quick chart review.</p>
            <div className={styles.snapshotGrid}>
              <section>
                <h3>Problem List</h3>
                {activeDiagnoses.length === 0 ? (
                  <p className={styles.emptyText}>No active problems captured.</p>
                ) : (
                  <ul className={styles.compactList}>
                    {activeDiagnoses.map((item) => (
                      <li key={item.id}>
                        <strong>{item.diagnosisName}</strong>
                        <span>{item.icd10Code ?? '-'} • {item.status ?? 'active'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3>Medications</h3>
                {activeMedications.length === 0 ? (
                  <p className={styles.emptyText}>No active medications.</p>
                ) : (
                  <ul className={styles.compactList}>
                    {activeMedications.map((item) => (
                      <li key={item.id}>
                        <strong>{item.medicationName}</strong>
                        <span>{item.dose ?? '-'} • {item.frequency ?? '-'} • {formatDate(item.startDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3>Allergies</h3>
                {patient.allergies.length === 0 ? (
                  <p className={styles.emptyText}>No allergies recorded.</p>
                ) : (
                  <ul className={styles.compactList}>
                    {patient.allergies.map((item) => (
                      <li key={item.id}>
                        <strong>{item.allergen}</strong>
                        <span>{item.severity ?? '-'} • {item.reaction ?? '-'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3>Active Care Plans</h3>
                {activeCarePlans.length === 0 ? (
                  <p className={styles.emptyText}>No active care plans.</p>
                ) : (
                  <ul className={styles.compactList}>
                    {activeCarePlans.map((item) => (
                      <li key={item.id}>
                        <strong>{item.planName}</strong>
                        <span>{item.code} • {formatDate(item.startDate)} → {formatDate(item.endDate)} • {item.totalVisitsPlanned} visits</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </article>
        </section>

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

          {canDoctorWrite && (
            <article className={styles.card}>
              <h2>Doctor: Add Diagnosis</h2>
              <form action={addDiagnosisAction} className={styles.formGrid}>
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
                  Diagnosis name
                  <input name="diagnosisName" required />
                </label>
                <label>
                  ICD-10 code
                  <input name="icd10Code" placeholder="e.g. I10" />
                </label>
                <label>
                  Status
                  <input name="status" placeholder="active / resolved / chronic" />
                </label>
                <label>
                  Diagnosed on
                  <input type="date" name="diagnosedOn" />
                </label>
                <label>
                  Notes
                  <textarea name="notes" rows={3} dir="auto" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Add diagnosis</button>
              </form>
            </article>
          )}

          {canPhysioWrite && (
            <article className={styles.card}>
              <h2>Physio: Session Report</h2>
              <form action={addPhysioSessionReportAction} className={styles.formGrid}>
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
                  Session date
                  <input type="date" name="sessionDate" required />
                </label>
                <label>
                  Session number
                  <input type="number" min={1} name="sessionNumber" required />
                </label>
                <label>
                  Treatment plan
                  <textarea name="treatmentPlan" rows={2} dir="auto" />
                </label>
                <label>
                  Interventions performed
                  <textarea name="interventions" rows={3} required dir="auto" />
                </label>
                <label>
                  Patient response
                  <textarea name="response" rows={2} dir="auto" />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Pain before (0-10)
                    <input type="number" min={0} max={10} name="painScoreBefore" />
                  </label>
                  <label>
                    Pain after (0-10)
                    <input type="number" min={0} max={10} name="painScoreAfter" />
                  </label>
                </div>
                <label>
                  Mobility note
                  <textarea name="mobilityNote" rows={2} dir="auto" />
                </label>
                <label>
                  Home exercise plan
                  <textarea name="homeExercisePlan" rows={2} dir="auto" />
                </label>
                <label>
                  Next session date
                  <input type="date" name="nextSessionDate" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Save physio session</button>
              </form>
            </article>
          )}

          {canNurseWrite && (
            <article className={styles.card}>
              <h2>Nurse: Daily Report</h2>
              <form action={addNurseDailyReportAction} className={styles.formGrid}>
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
                <div className={styles.twoCol}>
                  <label>
                    Report date
                    <input type="date" name="reportDate" required />
                  </label>
                  <label>
                    Shift
                    <select name="shiftType" defaultValue="day">
                      <option value="day">day</option>
                      <option value="evening">evening</option>
                      <option value="night">night</option>
                    </select>
                  </label>
                </div>
                <label>
                  General condition
                  <input name="generalCondition" placeholder="stable / needs review" />
                </label>
                <label>
                  Intake/output
                  <textarea name="intakeOutput" rows={2} dir="auto" />
                </label>
                <label>
                  Medication given
                  <textarea name="medicationGiven" rows={2} dir="auto" />
                </label>
                <label>
                  Wound care
                  <textarea name="woundCare" rows={2} dir="auto" />
                </label>
                <label>
                  Falls risk
                  <input name="fallsRisk" placeholder="low / medium / high" />
                </label>
                <label className={styles.inlineCheck}>
                  <input type="checkbox" name="escalationFlag" />
                  Escalation required
                </label>
                <label>
                  Escalation reason
                  <textarea name="escalationReason" rows={2} dir="auto" />
                </label>
                <label>
                  Nursing notes
                  <textarea name="nursingNotes" rows={3} required dir="auto" />
                </label>
                <label>
                  Follow-up instructions
                  <textarea name="followUpInstructions" rows={2} dir="auto" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Save nurse report</button>
              </form>
            </article>
          )}

          {canNurseWrite && (
            <article className={styles.card}>
              <h2>Nurse: Quick Vitals</h2>
              <form action={addVitalSignsAction} className={styles.formGrid}>
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
                  Measured at
                  <input type="datetime-local" name="measuredAt" />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Systolic
                    <input type="number" name="systolicBp" />
                  </label>
                  <label>
                    Diastolic
                    <input type="number" name="diastolicBp" />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Heart rate
                    <input type="number" name="heartRate" />
                  </label>
                  <label>
                    SpO2
                    <input type="number" name="oxygenSaturation" />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Temperature C
                    <input type="number" step="0.1" name="temperatureC" />
                  </label>
                  <label>
                    Weight kg
                    <input type="number" step="0.1" name="weightKg" />
                  </label>
                </div>
                <label>
                  Notes
                  <textarea name="notes" rows={2} dir="auto" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Save vitals</button>
              </form>
            </article>
          )}

          {(canOpsWrite || canDoctorWrite || canManageAssignments) && (
            <article className={styles.card}>
              <h2>Care Ops: Messaging, Routing, AI Scaffold</h2>
              <form action={addCareTeamMessageAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <label>
                  Channel
                  <select name="channelType" defaultValue="in_app">
                    <option value="in_app">in_app</option>
                    <option value="phone">phone</option>
                    <option value="whatsapp">whatsapp</option>
                  </select>
                </label>
                <label>
                  Visibility
                  <select name="visibilityScope" defaultValue="care_team">
                    <option value="care_team">care_team</option>
                    <option value="doctor_only">doctor_only</option>
                    <option value="patient_safe">patient_safe</option>
                  </select>
                </label>
                <label>
                  Message
                  <textarea name="messageBody" rows={3} required dir="auto" />
                </label>
                <label className={styles.inlineCheck}>
                  <input type="checkbox" name="requiresFollowUp" />
                  Requires follow-up
                </label>
                <label>
                  Follow-up due
                  <input type="datetime-local" name="followUpDueAt" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Post care message</button>
              </form>

              <form action={createCallRoutingTicketAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <h3 className={styles.subHead}>Call Routing Ticket</h3>
                <label>
                  Source channel
                  <select name="sourceChannel" defaultValue="phone" required>
                    <option value="phone">phone</option>
                    <option value="whatsapp">whatsapp</option>
                    <option value="website">website</option>
                    <option value="external-hospital">external-hospital</option>
                  </select>
                </label>
                <label>
                  Reason category
                  <input name="reasonCategory" required placeholder="symptom-update / medication / urgent" />
                </label>
                <label>
                  Priority
                  <select name="triagePriority" defaultValue="routine">
                    <option value="routine">routine</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </label>
                <label>
                  Summary
                  <textarea name="summary" rows={2} dir="auto" />
                </label>
                <label>
                  Callback target
                  <input type="datetime-local" name="targetCallbackAt" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Create routing ticket</button>
              </form>

              {canDoctorWrite && (
                <form action={addAiTriageCaseAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <h3 className={styles.subHead}>AI Triage Candidate</h3>
                  <label>
                    Symptom summary
                    <textarea name="symptomSummary" rows={3} required dir="auto" />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Risk score (0-100)
                      <input type="number" step="0.1" min={0} max={100} name="riskScore" />
                    </label>
                    <label>
                      Urgency level
                      <select name="urgencyLevel" defaultValue="medium">
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Suggested disposition
                    <input name="recommendedDisposition" placeholder="home monitoring / ER now" />
                  </label>
                  <label>
                    Suggested specialty
                    <input name="recommendedSpecialty" placeholder="cardiology / neurology" />
                  </label>
                  <label>
                    Reasoning
                    <textarea name="reasoning" rows={3} dir="auto" />
                  </label>
                  <label>
                    Model version
                    <input name="modelVersion" placeholder="triage-v0-scaffold" />
                  </label>
                  <button type="submit" className={styles.primaryBtn}>Save triage candidate</button>
                </form>
              )}
            </article>
          )}
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
            <h2>Diagnoses</h2>
            {patient.diagnoses.length === 0 ? (
              <p className={styles.emptyText}>No diagnoses recorded.</p>
            ) : (
              <ul className={styles.list}>
                {patient.diagnoses.map((item) => (
                  <li key={item.id}>
                    <strong>{item.diagnosisName}</strong>
                    <span>
                      {item.icd10Code ?? '-'} • {item.status ?? '-'} • {formatDate(item.diagnosedOn)} • {item.enteredByStaff?.name ?? '-'}
                    </span>
                    {item.notes && <p dir="auto">{item.notes}</p>}
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
                    <div className={styles.noteMetaRow}>
                      <strong>{formatDate(note.createdAt)}</strong>
                      <span className={note.signedOffAt ? styles.lockedBadge : styles.draftBadge}>
                        {note.signedOffAt ? 'Signed and locked' : 'Draft'}
                      </span>
                    </div>
                    <p dir="auto">{note.noteBody}</p>
                    {note.addendums.length > 0 && (
                      <div className={styles.noteAddendums}>
                        <p className={styles.noteSubhead}>Addenda</p>
                        <ul className={styles.inlineList}>
                          {note.addendums.map((addendum) => (
                            <li key={addendum.id}>
                              <strong>{formatDate(addendum.createdAt)}</strong>
                              <span>{addendum.enteredByStaff?.name ?? 'Staff addendum'}</span>
                              <p dir="auto">{addendum.addendumBody}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {note.signedOffAt ? (
                      <form action={addProgressNoteAddendumAction} className={styles.inlineNoteForm}>
                        <input type="hidden" name="patientId" value={patient.id} />
                        <input type="hidden" name="progressNoteId" value={note.id} />
                        <label>
                          Addendum
                          <textarea name="addendumBody" rows={2} required dir="auto" placeholder="Correction, clarification, or follow-up..." />
                        </label>
                        <button type="submit" className={styles.secondaryBtn}>Add addendum</button>
                      </form>
                    ) : (
                      <form action={signProgressNoteAction} className={styles.inlineNoteForm}>
                        <input type="hidden" name="patientId" value={patient.id} />
                        <input type="hidden" name="progressNoteId" value={note.id} />
                        <button type="submit" className={styles.secondaryBtn}>Sign and lock note</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Vitals Timeline</h2>
            {patient.vitalSigns.length === 0 ? (
              <p className={styles.emptyText}>No vitals recorded.</p>
            ) : (
              <ul className={styles.list}>
                {patient.vitalSigns.map((vital) => (
                  <li key={vital.id}>
                    <strong>{formatDate(vital.measuredAt)}</strong>
                    <span>
                      BP {vital.systolicBp ?? '-'} / {vital.diastolicBp ?? '-'} • HR {vital.heartRate ?? '-'} • SpO2 {vital.oxygenSaturation ?? '-'}
                    </span>
                    <p>
                      Temp {vital.temperatureC?.toString() ?? '-'} C • Weight {vital.weightKg?.toString() ?? '-'} kg
                    </p>
                    {vital.notes && <p dir="auto">{vital.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Physio Session Reports</h2>
            {patient.physioSessionReports.length === 0 ? (
              <p className={styles.emptyText}>No physiotherapy sessions reported.</p>
            ) : (
              <ul className={styles.list}>
                {patient.physioSessionReports.map((report) => (
                  <li key={report.id}>
                    <strong>Session #{report.sessionNumber} • {formatDate(report.sessionDate)}</strong>
                    <span>
                      Pain {report.painScoreBefore ?? '-'} {'->'} {report.painScoreAfter ?? '-'} • Next {formatDate(report.nextSessionDate)} • {report.enteredByStaff?.name ?? '-'}
                    </span>
                    <p dir="auto">{report.interventions}</p>
                    {report.response && <p dir="auto">Response: {report.response}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Nurse Daily Reports</h2>
            {patient.nurseDailyReports.length === 0 ? (
              <p className={styles.emptyText}>No nurse reports recorded.</p>
            ) : (
              <ul className={styles.list}>
                {patient.nurseDailyReports.map((report) => (
                  <li key={report.id}>
                    <strong>{formatDate(report.reportDate)} • {report.shiftType ?? '-'}</strong>
                    <span>
                      Condition: {report.generalCondition ?? '-'} • Escalation: {report.escalationFlag ? 'Yes' : 'No'} • {report.enteredByStaff?.name ?? '-'}
                    </span>
                    <p dir="auto">{report.nursingNotes}</p>
                    {report.escalationReason && <p dir="auto">Escalation reason: {report.escalationReason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Care Team Messages</h2>
            {patient.careTeamMessages.length === 0 ? (
              <p className={styles.emptyText}>No care messages yet.</p>
            ) : (
              <ul className={styles.list}>
                {patient.careTeamMessages.map((message) => (
                  <li key={message.id}>
                    <strong>{formatDate(message.createdAt)} • {message.authorStaff?.name ?? '-'}</strong>
                    <span>
                      {message.channelType} • {message.visibilityScope} • {message.requiresFollowUp ? 'Follow-up required' : 'No follow-up'}
                    </span>
                    <p dir="auto">{message.messageBody}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>Call Routing Tickets</h2>
            {patient.callRoutingTickets.length === 0 ? (
              <p className={styles.emptyText}>No routing tickets yet.</p>
            ) : (
              <ul className={styles.list}>
                {patient.callRoutingTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <strong>{ticket.reasonCategory}</strong>
                    <span>
                      {ticket.sourceChannel} • {ticket.triagePriority} • {ticket.status} • Callback {formatDate(ticket.targetCallbackAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className={styles.card}>
            <h2>AI Triage Drafts</h2>
            {patient.aiTriageCases.length === 0 ? (
              <p className={styles.emptyText}>No AI triage drafts yet.</p>
            ) : (
              <ul className={styles.list}>
                {patient.aiTriageCases.map((item) => (
                  <li key={item.id}>
                    <strong>{item.urgencyLevel ?? '-'} • score {item.riskScore?.toString() ?? '-'}</strong>
                    <span>
                      {item.recommendedSpecialty ?? '-'} • {item.recommendedDisposition ?? '-'} • {item.status}
                    </span>
                    <p dir="auto">{item.symptomSummary}</p>
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

          <article className={styles.card}>
            <h2>Export Verification</h2>
            <p className={styles.metaLine}>Printable export with tamper-evident hash and QR verification link.</p>
            <div className={styles.exportCtaRow}>
              <Link href={`/admin/patients/${patient.id}/export`} className={styles.primaryLinkBtn}>Open export template</Link>
              <Link href={`/admin/patients/${patient.id}/export/verify`} className={styles.secondaryLinkBtn}>Open verification page</Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
