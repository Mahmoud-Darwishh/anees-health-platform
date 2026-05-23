import { prisma } from '@/lib/db/prisma';
import { requireStaffPermission } from '@/lib/auth';
import { canBypassPatientAssignment, canAccessPatientRecord } from '@/lib/auth/record-access';
import { buildChartTimeline } from '@/lib/ehr/chart';
import { getPatientEhrSnapshot, type PatientEhrSnapshot } from '@/lib/ehr/patient-snapshot';
import PatientTimelineInsights from '@/components/admin/PatientTimelineInsights';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  addCaregiverAction,
  addCareTaskAction,
  addAllergyAction,
  addAiTriageCaseAction,
  addCareTeamMessageAction,
  addImagingOrderAction,
  addLabOrderAction,
  addMedicationOrderAction,
  addDiagnosisAction,
  addNursingOrderAction,
  addProgressNoteAddendumAction,
  addNurseDailyReportAction,
  addPhysioOrderAction,
  addPhysioSessionReportAction,
  addRiskFlagAction,
  addSocialHistoryAction,
  addVaccinationRecordAction,
  assignStaffToPatientAction,
  createCallRoutingTicketAction,
  resolveRiskFlagAction,
  signProgressNoteAction,
  removeStaffAssignmentAction,
  addMedicationAction,
  addProgressNoteAction,
  addVitalSignsAction,
  updateCareTaskStatusAction,
  updatePatientCoreAction,
} from './actions';
import styles from './patient-detail.module.scss';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; tab?: string }>;
};

const EHR_TABS = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Unified timeline, alerts, and quick status across all care roles.',
  },
  {
    key: 'profile',
    label: 'Master Profile',
    description: 'Permanent patient identity, contact context, and risk visibility.',
  },
  {
    key: 'history',
    label: 'Longitudinal History',
    description: 'Medical conditions, allergies, medications, and chronic context.',
  },
  {
    key: 'doctor',
    label: 'Doctor Module',
    description: 'Diagnoses, SOAP-style notes, plan updates, and ordering context.',
  },
  {
    key: 'nursing',
    label: 'Nursing Module',
    description: 'Shift reports, vitals cadence, escalations, and care continuity.',
  },
  {
    key: 'physio',
    label: 'Physiotherapy',
    description: 'Assessment progression, rehab session tracking, and outcomes.',
  },
  {
    key: 'coordination',
    label: 'Coordination',
    description: 'Team messaging, routing tasks, triage, and cross-role follow-up.',
  },
  {
    key: 'governance',
    label: 'Governance',
    description: 'Access assignment, exports, legal/compliance controls, and roadmap.',
  },
] as const;

type EhrTabKey = (typeof EHR_TABS)[number]['key'];

type RiskFlagTone = 'critical' | 'high' | 'watch';

type RiskFlag = {
  id?: string;
  label: string;
  tone: RiskFlagTone;
  detail?: string;
  isActive?: boolean;
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

function formatDateTime(value: Date | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function calculateAge(dateOfBirth: Date | null): string {
  if (!dateOfBirth) return '-';
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return Number.isNaN(age) ? '-' : `${age}`;
}

function resolveTab(tab: string | undefined): EhrTabKey {
  const match = EHR_TABS.find((item) => item.key === tab);
  return match?.key ?? 'overview';
}

function buildTabHref(patientId: string, tab: EhrTabKey, updated?: string): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (updated) {
    params.set('updated', updated);
  }
  return `/admin/patients/${patientId}?${params.toString()}`;
}

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return '-';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
}

function formatNullable(value: string | null | undefined, fallback = 'Not captured yet'): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (item) => item.toUpperCase());
}

function deriveRiskFlags(patient: PatientEhrSnapshot): RiskFlag[] {
  const flags = patient.riskFlags.map((item) => {
    const tone: RiskFlagTone = item.severity === 'critical'
      ? 'critical'
      : item.severity === 'high'
        ? 'high'
        : 'watch';

    return {
      id: item.id,
      label: item.label || toTitleCase(item.code),
      tone,
      detail: item.notes ?? undefined,
      isActive: item.isActive,
    } satisfies RiskFlag;
  });

  if (flags.length > 0) {
    return flags;
  }

  return [{
    label: 'No deterministic risk flags recorded yet',
    tone: 'watch',
    detail: 'Use Add Risk Flag to configure explicit safety flags for this patient.',
    isActive: false,
  }];
}

function riskFlagToneClass(tone: RiskFlagTone): string {
  switch (tone) {
    case 'critical':
      return styles.riskCritical;
    case 'high':
      return styles.riskHigh;
    default:
      return styles.riskWatch;
  }
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
  const activeTab = resolveTab(query.tab);
  const activeTabDefinition = EHR_TABS.find((item) => item.key === activeTab) ?? EHR_TABS[0];
  const riskFlags = deriveRiskFlags(patient);
  const activeRiskFlags = patient.riskFlags.filter((item) => item.isActive);
  const openTasks = patient.careTasks.filter((item) => item.status !== 'completed' && item.status !== 'cancelled');

  const unsignedNotes = patient.progressNotes.filter((item) => !item.signedOffAt).length;
  const followUpMessages = patient.careTeamMessages.filter((item) => item.requiresFollowUp).length;
  const escalationLast72h = patient.nurseDailyReports.filter((report) => {
    const seventyTwoHoursAgo = Date.now() - 72 * 60 * 60 * 1000;
    return report.escalationFlag && report.reportDate.getTime() >= seventyTwoHoursAgo;
  }).length;
  const latestVisit = patient.visits[0] ?? null;

  const masterProfileRows = [
    { label: 'Full Name', value: patient.fullName },
    { label: 'Arabic Name', value: formatNullable(patient.arabicName) },
    { label: 'MRN', value: patient.code },
    {
      label: 'National ID / Passport',
      value: patient.nationalId ?? patient.passportNumber ?? 'Not captured yet',
    },
    { label: 'DOB', value: formatDate(patient.dateOfBirth) },
    { label: 'Age', value: calculateAge(patient.dateOfBirth) },
    { label: 'Gender', value: formatNullable(patient.gender ?? null, '-') },
    { label: 'Blood Group', value: formatNullable(patient.bloodGroup ? toTitleCase(patient.bloodGroup) : null) },
    { label: 'Marital Status', value: formatNullable(patient.maritalStatus ? toTitleCase(patient.maritalStatus) : null) },
    { label: 'Preferred Language', value: formatNullable(patient.preferredLanguage ? patient.preferredLanguage.toUpperCase() : null) },
    { label: 'Religion', value: formatNullable(patient.religion) },
    { label: 'Occupation', value: formatNullable(patient.occupation) },
    {
      label: 'Insurance Information',
      value: patient.insuranceProvider
        ? `${patient.insuranceProvider}${patient.insuranceMemberId ? ` • ${patient.insuranceMemberId}` : ''}`
        : 'Not captured yet',
    },
    { label: 'DNR Status', value: formatNullable(patient.dnrStatus ? toTitleCase(patient.dnrStatus) : null) },
  ];

  const roadmapLayers = [
    {
      title: 'Clinical Layer',
      detail: 'EHR, notes, orders, medications, and vitals are active foundations in this profile.',
      status: 'active',
    },
    {
      title: 'Operations Layer',
      detail: 'Scheduling, dispatching, and shift optimization need dedicated modules.',
      status: 'planned',
    },
    {
      title: 'Care Coordination Layer',
      detail: 'Unified timeline, tasks, and alerts are partially active and ready to scale.',
      status: 'active',
    },
    {
      title: 'Partner Integration Layer',
      detail: 'Labs, imaging, hospitals, and insurance integrations should target HL7/FHIR.',
      status: 'planned',
    },
    {
      title: 'Analytics Layer',
      detail: 'Outcomes, compliance, readmission, and recovery analytics are roadmap priorities.',
      status: 'planned',
    },
  ];

  const isPhysiotherapist = currentStaffRole === 'physiotherapist';
  const shellQuickLinks = isPhysiotherapist
    ? [
        { href: '/admin/physio', label: 'Physio Workspace', tone: 'primary' as const },
        { href: '/admin/patients', label: 'My Cases' },
        { href: `/admin/patients/${patient.id}/export`, label: 'Export Profile' },
      ]
    : [
        { href: '/admin/patients', label: 'Patient Registry' },
        { href: '/admin/queues', label: 'Work Queues' },
        { href: `/admin/patients/${patient.id}/export`, label: 'Export Profile', tone: 'primary' as const },
      ];

  return (
    <AdminDashboardShell
      title="Patient EHR Workspace"
      subtitle="Workflow-first charting with module navigation across profile, clinical care, and operations."
      staffName={session.user.name ?? 'Anees Staff'}
      roleLabel={session.user.staffRole}
      navBadges={{
        '/admin/queues': unsignedNotes + followUpMessages + escalationLast72h + openTasks.length,
      }}
      metrics={[
        { label: 'Risk Flags', value: activeRiskFlags.length, hint: `${patient.riskFlags.length} total`, tone: 'rose' },
        { label: 'Unsigned Notes', value: unsignedNotes, hint: 'Doctor queue', tone: 'sky' },
        { label: 'Escalations 72h', value: escalationLast72h, hint: 'Nursing urgency', tone: 'amber' },
        { label: 'Open Tasks', value: openTasks.length, hint: 'Coordination workload', tone: 'violet' },
      ]}
      quickLinks={shellQuickLinks}
    >
      <section className={styles.stack}>
        <header className={styles.patientHero}>
          <div>
            <p className={styles.kicker}>Patient Master Record</p>
            <h2>{patient.fullName}</h2>
            <p className={styles.heroSubline}>
              {patient.code} • {patient.phone} • Status {patient.status}
            </p>
          </div>

          <div className={styles.heroMetaGrid}>
            <article>
              <span>Last Visit</span>
              <strong>{latestVisit ? formatDate(latestVisit.scheduledDate) : '-'}</strong>
            </article>
            <article>
              <span>Primary Area</span>
              <strong>{patient.area?.name ?? '-'}</strong>
            </article>
            <article>
              <span>Caregiver</span>
              <strong>{formatNullable(patient.primaryCaregiver, '-')}</strong>
            </article>
            <article>
              <span>Age</span>
              <strong>{calculateAge(patient.dateOfBirth)}</strong>
            </article>
          </div>
        </header>

        {query.updated && <p className={styles.successBanner}>Saved successfully.</p>}

        <section className={styles.riskPanel}>
          <div>
            <h3>Risk Flags</h3>
            <p>
              These flags stay visible across modules to protect continuity and safety during visits,
              handovers, and tele-coordination.
            </p>
          </div>
          <div className={styles.riskFlagRow}>
            {riskFlags.map((flag) => (
              <span key={flag.id ?? flag.label} className={`${styles.riskFlag} ${riskFlagToneClass(flag.tone)}`}>
                {flag.label}
              </span>
            ))}
          </div>
          {(canDoctorWrite || canNurseWrite) && (
            <form action={addRiskFlagAction} className={styles.formGrid}>
              <input type="hidden" name="patientId" value={patient.id} />
              <input type="hidden" name="tab" value={activeTab} />
              <div className={styles.twoCol}>
                <label>
                  Risk code
                  <select name="code" defaultValue="fall_risk">
                    <option value="fall_risk">fall_risk</option>
                    <option value="bedridden">bedridden</option>
                    <option value="dementia">dementia</option>
                    <option value="stroke_history">stroke_history</option>
                    <option value="aggressive_behavior">aggressive_behavior</option>
                    <option value="oxygen_dependent">oxygen_dependent</option>
                    <option value="infection_risk">infection_risk</option>
                    <option value="pressure_ulcer_risk">pressure_ulcer_risk</option>
                    <option value="diabetic_foot_risk">diabetic_foot_risk</option>
                    <option value="custom">custom</option>
                  </select>
                </label>
                <label>
                  Severity
                  <select name="severity" defaultValue="high">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </label>
              </div>
              <label>
                Label
                <input name="label" required placeholder="e.g. Oxygen dependent" />
              </label>
              <label>
                Source
                <input name="source" placeholder="doctor / nurse / caregiver" />
              </label>
              <label>
                Notes
                <textarea name="notes" rows={2} dir="auto" placeholder="Short clinical context for the flag" />
              </label>
              <button type="submit" className={styles.primaryBtn}>Add risk flag</button>
            </form>
          )}

          {activeRiskFlags.length > 0 && (
            <ul className={styles.inlineList}>
              {activeRiskFlags.map((flag) => (
                <li key={flag.id}>
                  <strong>{flag.label}</strong>
                  <span>{flag.severity} • {flag.source ?? 'manual'} • {formatDateTime(flag.flaggedAt)}</span>
                  {flag.notes && <p dir="auto">{flag.notes}</p>}
                  {(canDoctorWrite || canNurseWrite) && (
                    <form action={resolveRiskFlagAction} className={styles.inlineNoteForm}>
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="riskFlagId" value={flag.id} />
                      <input type="hidden" name="tab" value={activeTab} />
                      <label>
                        Resolution note
                        <textarea name="resolutionNote" rows={2} dir="auto" placeholder="Reason for resolving this risk flag" />
                      </label>
                      <button type="submit" className={styles.secondaryBtn}>Resolve flag</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <nav className={styles.tabNav} aria-label="Patient EHR navigation tabs">
          {EHR_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildTabHref(patient.id, tab.key, query.updated)}
              className={activeTab === tab.key ? styles.tabLinkActive : styles.tabLink}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <section className={styles.tabIntroCard}>
          <h3>{activeTabDefinition.label}</h3>
          <p>{activeTabDefinition.description}</p>
        </section>

        {activeTab === 'overview' && (
          <>
            <section className={styles.timelineGrid}>
              <article className={styles.card}>
                <h2>Unified Timeline</h2>
                <p className={styles.metaLine}>
                  Chronological stream across visits, notes, vitals, meds, nursing updates, and coordination tasks.
                </p>
                <PatientTimelineInsights
                  events={chartTimeline.map((event) => ({
                    id: event.id,
                    type: event.type,
                    timestamp: event.timestamp.toISOString(),
                    title: event.title,
                    subtitle: event.subtitle,
                    detail: event.detail,
                  }))}
                  vitals={patient.vitalSigns.map((item) => ({
                    measuredAt: item.measuredAt.toISOString(),
                    systolicBp: item.systolicBp,
                    heartRate: item.heartRate,
                    oxygenSaturation: item.oxygenSaturation,
                  }))}
                />
              </article>

              <article className={styles.card}>
                <h2>Structured Snapshot</h2>
                <p className={styles.metaLine}>
                  Active problem, medication, allergy, and care-plan surfaces for fast chart review.
                </p>
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
                            <span>
                              {item.code} • {formatDate(item.startDate)} → {formatDate(item.endDate)} • {item.totalVisitsPlanned} visits
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </article>
            </section>

            <section className={styles.grid}>
              <article className={styles.card}>
                <h2>Visit Orchestration</h2>
                {patient.visits.length === 0 ? (
                  <p className={styles.emptyText}>No recent visits in this chart.</p>
                ) : (
                  <ul className={styles.list}>
                    {patient.visits.map((visit) => (
                      <li key={visit.id}>
                        <strong>{visit.code}</strong>
                        <span>
                          {visit.service.name} • {formatDate(visit.scheduledDate)} • {visit.visitType} • {visit.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className={styles.card}>
                <h2>Immediate Alerts</h2>
                <ul className={styles.inlineList}>
                  <li>
                    <strong>Unsigned doctor notes</strong>
                    <span>{unsignedNotes}</span>
                  </li>
                  <li>
                    <strong>Nursing escalations (72h)</strong>
                    <span>{escalationLast72h}</span>
                  </li>
                  <li>
                    <strong>Care follow-ups due</strong>
                    <span>{followUpMessages}</span>
                  </li>
                </ul>
              </article>
            </section>
          </>
        )}

        {activeTab === 'profile' && (
          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>Core Patient Profile (Master Record)</h2>
              <p className={styles.metaLine}>Permanent identity and baseline demographic context.</p>
              <dl className={styles.definitionList}>
                {masterProfileRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className={styles.card}>
              <h2>Contact, Location, and Caregiver</h2>
              <dl className={styles.definitionList}>
                <div>
                  <dt>Phone</dt>
                  <dd>{patient.phone}</dd>
                </div>
                <div>
                  <dt>Home Address</dt>
                  <dd>{formatNullable(patient.addressDetail)}</dd>
                </div>
                <div>
                  <dt>Landmark</dt>
                  <dd>{formatNullable(patient.landmark)}</dd>
                </div>
                <div>
                  <dt>Area / District</dt>
                  <dd>{patient.area ? `${patient.area.name} (${patient.area.governorate})` : 'Not captured yet'}</dd>
                </div>
                <div>
                  <dt>GPS</dt>
                  <dd>
                    {patient.gpsLatitude && patient.gpsLongitude
                      ? `${patient.gpsLatitude.toString()}, ${patient.gpsLongitude.toString()}`
                      : 'Not captured yet'}
                  </dd>
                </div>
                <div>
                  <dt>Map URL</dt>
                  <dd>{formatNullable(patient.addressMapUrl)}</dd>
                </div>
                <div>
                  <dt>Emergency Contact</dt>
                  <dd>{formatNullable(patient.emergencyContactName)}</dd>
                </div>
                <div>
                  <dt>Emergency Phone</dt>
                  <dd>{formatNullable(patient.emergencyContactPhone)}</dd>
                </div>
                <div>
                  <dt>Emergency Relation</dt>
                  <dd>{formatNullable(patient.emergencyContactRelation)}</dd>
                </div>
                <div>
                  <dt>Primary Caregiver</dt>
                  <dd>{formatNullable(patient.primaryCaregiver)}</dd>
                </div>
                <div>
                  <dt>Caregiver Relation</dt>
                  <dd>{formatNullable(patient.caregiverRelation)}</dd>
                </div>
                <div>
                  <dt>Caregiver Phone</dt>
                  <dd>{formatNullable(patient.primaryCaregiverPhone)}</dd>
                </div>
                <div>
                  <dt>Caregiver WhatsApp</dt>
                  <dd>{formatNullable(patient.primaryCaregiverWhatsapp)}</dd>
                </div>
                <div>
                  <dt>Caregiver Email</dt>
                  <dd>{formatNullable(patient.primaryCaregiverEmail)}</dd>
                </div>
                <div>
                  <dt>Family Group</dt>
                  <dd>{patient.family?.code ?? 'Not linked'}</dd>
                </div>
              </dl>
            </article>

            <article className={styles.card}>
              <h2>Core Profile Update</h2>
              <p className={styles.metaLine}>
                DOB: {formatDate(patient.dateOfBirth)} • Registered: {formatDate(patient.registrationDate)}
              </p>
              <form action={updatePatientCoreAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
                <div className={styles.twoCol}>
                  <label>
                    Full name
                    <input name="fullName" defaultValue={patient.fullName} required />
                  </label>
                  <label>
                    Arabic name
                    <input name="arabicName" defaultValue={patient.arabicName ?? ''} dir="auto" />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Phone
                    <input name="phone" defaultValue={patient.phone} required />
                  </label>
                  <label>
                    DOB
                    <input
                      type="date"
                      name="dateOfBirth"
                      defaultValue={patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : ''}
                    />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Gender
                    <select name="gender" defaultValue={patient.gender ?? ''}>
                      <option value="">Not set</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <label>
                    Blood group
                    <select name="bloodGroup" defaultValue={patient.bloodGroup ?? ''}>
                      <option value="">Not set</option>
                      <option value="A_POSITIVE">A+</option>
                      <option value="A_NEGATIVE">A-</option>
                      <option value="B_POSITIVE">B+</option>
                      <option value="B_NEGATIVE">B-</option>
                      <option value="AB_POSITIVE">AB+</option>
                      <option value="AB_NEGATIVE">AB-</option>
                      <option value="O_POSITIVE">O+</option>
                      <option value="O_NEGATIVE">O-</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Marital status
                    <select name="maritalStatus" defaultValue={patient.maritalStatus ?? ''}>
                      <option value="">Not set</option>
                      <option value="single">single</option>
                      <option value="married">married</option>
                      <option value="divorced">divorced</option>
                      <option value="widowed">widowed</option>
                      <option value="separated">separated</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <label>
                    Preferred language
                    <select name="preferredLanguage" defaultValue={patient.preferredLanguage ?? ''}>
                      <option value="">Not set</option>
                      <option value="en">en</option>
                      <option value="ar">ar</option>
                    </select>
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    National ID
                    <input name="nationalId" defaultValue={patient.nationalId ?? ''} />
                  </label>
                  <label>
                    Passport number
                    <input name="passportNumber" defaultValue={patient.passportNumber ?? ''} />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Religion
                    <input name="religion" defaultValue={patient.religion ?? ''} />
                  </label>
                  <label>
                    Occupation
                    <input name="occupation" defaultValue={patient.occupation ?? ''} />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Insurance provider
                    <input name="insuranceProvider" defaultValue={patient.insuranceProvider ?? ''} />
                  </label>
                  <label>
                    Insurance member ID
                    <input name="insuranceMemberId" defaultValue={patient.insuranceMemberId ?? ''} />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Policy number
                    <input name="insurancePolicyNumber" defaultValue={patient.insurancePolicyNumber ?? ''} />
                  </label>
                  <label>
                    Insurance expiry
                    <input
                      type="date"
                      name="insuranceExpiry"
                      defaultValue={patient.insuranceExpiry ? patient.insuranceExpiry.toISOString().slice(0, 10) : ''}
                    />
                  </label>
                </div>
                <label>
                  DNR status
                  <select name="dnrStatus" defaultValue={patient.dnrStatus ?? ''}>
                    <option value="">Not set</option>
                    <option value="full_code">full_code</option>
                    <option value="dnr">dnr</option>
                    <option value="unknown">unknown</option>
                  </select>
                </label>
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
                  Address detail
                  <textarea name="addressDetail" rows={2} defaultValue={patient.addressDetail ?? ''} />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Landmark
                    <input name="landmark" defaultValue={patient.landmark ?? ''} />
                  </label>
                  <label>
                    Map URL
                    <input name="addressMapUrl" defaultValue={patient.addressMapUrl ?? ''} />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    GPS latitude
                    <input name="gpsLatitude" defaultValue={patient.gpsLatitude?.toString() ?? ''} />
                  </label>
                  <label>
                    GPS longitude
                    <input name="gpsLongitude" defaultValue={patient.gpsLongitude?.toString() ?? ''} />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Emergency contact name
                    <input name="emergencyContactName" defaultValue={patient.emergencyContactName ?? ''} />
                  </label>
                  <label>
                    Emergency contact phone
                    <input name="emergencyContactPhone" defaultValue={patient.emergencyContactPhone ?? ''} />
                  </label>
                </div>
                <label>
                  Emergency contact relation
                  <input name="emergencyContactRelation" defaultValue={patient.emergencyContactRelation ?? ''} />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Primary caregiver
                    <input name="primaryCaregiver" defaultValue={patient.primaryCaregiver ?? ''} />
                  </label>
                  <label>
                    Caregiver relation
                    <input name="caregiverRelation" defaultValue={patient.caregiverRelation ?? ''} />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Caregiver phone
                    <input name="primaryCaregiverPhone" defaultValue={patient.primaryCaregiverPhone ?? ''} />
                  </label>
                  <label>
                    Caregiver WhatsApp
                    <input name="primaryCaregiverWhatsapp" defaultValue={patient.primaryCaregiverWhatsapp ?? ''} />
                  </label>
                </div>
                <label>
                  Caregiver email
                  <input name="primaryCaregiverEmail" defaultValue={patient.primaryCaregiverEmail ?? ''} />
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
              <h2>Caregiver Directory</h2>
              <form action={addCaregiverAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
                <label>
                  Caregiver full name
                  <input name="fullName" required />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Relationship
                    <input name="relationship" placeholder="daughter / spouse / son" />
                  </label>
                  <label>
                    Phone number
                    <input name="phoneNumber" />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    WhatsApp
                    <input name="whatsappNumber" />
                  </label>
                  <label>
                    Email
                    <input name="email" type="email" />
                  </label>
                </div>
                <label className={styles.inlineCheck}>
                  <input type="checkbox" name="isPrimary" />
                  Mark as primary caregiver
                </label>
                <label className={styles.inlineCheck}>
                  <input type="checkbox" name="isAuthorized" defaultChecked />
                  Authorized for caregiver portal updates
                </label>
                <label>
                  Notes
                  <textarea name="notes" rows={2} dir="auto" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Add caregiver</button>
              </form>

              {patient.caregivers.length === 0 ? (
                <p className={styles.emptyText}>No caregiver contacts recorded yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.caregivers.map((caregiver) => (
                    <li key={caregiver.id}>
                      <strong>
                        {caregiver.fullName}
                        {caregiver.isPrimary ? ' (Primary)' : ''}
                      </strong>
                      <span>
                        {caregiver.relationship ?? '-'} • {caregiver.phoneNumber ?? '-'} • {caregiver.whatsappNumber ?? '-'}
                      </span>
                      <p>
                        {caregiver.email ?? 'No email'} • {caregiver.isAuthorized ? 'authorized' : 'not authorized'}
                      </p>
                      {caregiver.notes && <p dir="auto">{caregiver.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === 'history' && (
          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>Past Medical History</h2>
              {patient.medicalHistories.length === 0 ? (
                <p className={styles.emptyText}>No longitudinal conditions recorded yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.medicalHistories.map((item) => (
                    <li key={item.id}>
                      <strong>{item.conditionName}</strong>
                      <span>{item.status ?? '-'} • onset {formatDate(item.onsetDate)} • added {formatDate(item.createdAt)}</span>
                      {item.notes && <p dir="auto">{item.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={styles.card}>
              <h2>Add Allergy</h2>
              <form action={addAllergyAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
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
              <h2>Allergy Management</h2>
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
              <h2>Add Medication</h2>
              <form action={addMedicationAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
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
              <h2>Medication History</h2>
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
              <h2>Family Notes</h2>
              <p className={styles.metaLine}>{formatNullable(patient.family?.notes)}</p>
              <h3 className={styles.subHead}>Add Social History Snapshot</h3>
              <form action={addSocialHistoryAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
                <div className={styles.twoCol}>
                  <label>
                    Smoking status
                    <select name="smokingStatus" defaultValue="unknown">
                      <option value="unknown">unknown</option>
                      <option value="never">never</option>
                      <option value="former">former</option>
                      <option value="current">current</option>
                    </select>
                  </label>
                  <label>
                    Alcohol use
                    <select name="alcoholUse" defaultValue="unknown">
                      <option value="unknown">unknown</option>
                      <option value="none">none</option>
                      <option value="occasional">occasional</option>
                      <option value="regular">regular</option>
                    </select>
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Mobility
                    <select name="mobility" defaultValue="unknown">
                      <option value="unknown">unknown</option>
                      <option value="independent">independent</option>
                      <option value="assisted">assisted</option>
                      <option value="wheelchair">wheelchair</option>
                      <option value="bedridden">bedridden</option>
                    </select>
                  </label>
                  <label>
                    Functional independence
                    <select name="functionalIndependence" defaultValue="unknown">
                      <option value="unknown">unknown</option>
                      <option value="independent">independent</option>
                      <option value="partial_assistance">partial_assistance</option>
                      <option value="full_assistance">full_assistance</option>
                      <option value="dependent">dependent</option>
                    </select>
                  </label>
                </div>
                <label>
                  Living conditions
                  <textarea name="livingConditions" rows={2} dir="auto" />
                </label>
                <label>
                  Caregiver support
                  <textarea name="caregiverSupport" rows={2} dir="auto" />
                </label>
                <label>
                  Notes
                  <textarea name="notes" rows={2} dir="auto" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Save social history</button>
              </form>
            </article>

            <article className={styles.card}>
              <h2>Social History Timeline</h2>
              {patient.socialHistories.length === 0 ? (
                <p className={styles.emptyText}>No structured social history entries yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.socialHistories.map((entry) => (
                    <li key={entry.id}>
                      <strong>{formatDate(entry.recordedAt)} • {entry.enteredByStaff?.name ?? '-'}</strong>
                      <span>
                        Smoking {entry.smokingStatus ?? 'unknown'} • Alcohol {entry.alcoholUse ?? 'unknown'} • Mobility {entry.mobility ?? 'unknown'}
                      </span>
                      <p>
                        Independence {entry.functionalIndependence ?? 'unknown'} • Support {entry.caregiverSupport ?? '-'}
                      </p>
                      {entry.livingConditions && <p dir="auto">Living: {entry.livingConditions}</p>}
                      {entry.notes && <p dir="auto">{entry.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={styles.card}>
              <h2>Vaccination History</h2>
              <form action={addVaccinationRecordAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
                <label>
                  Vaccine name
                  <input name="vaccineName" required />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Dose number
                    <input name="doseNumber" placeholder="1st / booster" />
                  </label>
                  <label>
                    Administered on
                    <input type="date" name="administeredOn" />
                  </label>
                </div>
                <div className={styles.twoCol}>
                  <label>
                    Facility
                    <input name="facilityName" />
                  </label>
                  <label>
                    Next due date
                    <input type="date" name="nextDueDate" />
                  </label>
                </div>
                <label>
                  Notes
                  <textarea name="notes" rows={2} dir="auto" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Add vaccination record</button>
              </form>

              {patient.vaccinationRecords.length === 0 ? (
                <p className={styles.emptyText}>No vaccination history recorded yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.vaccinationRecords.map((record) => (
                    <li key={record.id}>
                      <strong>{record.vaccineName}</strong>
                      <span>
                        Dose {record.doseNumber ?? '-'} • Given {formatDate(record.administeredOn)} • Next {formatDate(record.nextDueDate)}
                      </span>
                      <p>{record.facilityName ?? '-'}</p>
                      {record.notes && <p dir="auto">{record.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === 'doctor' && (
          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>Add Progress Note</h2>
              <form action={addProgressNoteAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
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
                  <input type="hidden" name="tab" value={activeTab} />
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
                        <strong>{formatDateTime(note.createdAt)}</strong>
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
                                <strong>{formatDateTime(addendum.createdAt)}</strong>
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
                          <input type="hidden" name="tab" value={activeTab} />
                          <label>
                            Addendum
                            <textarea
                              name="addendumBody"
                              rows={2}
                              required
                              dir="auto"
                              placeholder="Correction, clarification, or follow-up..."
                            />
                          </label>
                          <button type="submit" className={styles.secondaryBtn}>Add addendum</button>
                        </form>
                      ) : (
                        <form action={signProgressNoteAction} className={styles.inlineNoteForm}>
                          <input type="hidden" name="patientId" value={patient.id} />
                          <input type="hidden" name="progressNoteId" value={note.id} />
                          <input type="hidden" name="tab" value={activeTab} />
                          <button type="submit" className={styles.secondaryBtn}>Sign and lock note</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            {canDoctorWrite && (
              <article className={styles.card}>
                <h2>Doctor Orders</h2>
                <form action={addLabOrderAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <h3 className={styles.subHead}>Lab Order</h3>
                  <label>
                    Test name
                    <input name="testName" required placeholder="CBC, HbA1c, CRP..." />
                  </label>
                  <label>
                    Clinical reason
                    <textarea name="clinicalReason" rows={2} dir="auto" />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Priority
                      <select name="priority" defaultValue="routine">
                        <option value="routine">routine</option>
                        <option value="high">high</option>
                        <option value="urgent">urgent</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                    <label>
                      Target date
                      <input type="date" name="targetDate" />
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea name="notes" rows={2} dir="auto" />
                  </label>
                  <button type="submit" className={styles.primaryBtn}>Create lab order</button>
                </form>

                <form action={addImagingOrderAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <h3 className={styles.subHead}>Imaging Order</h3>
                  <label>
                    Study name
                    <input name="studyName" required placeholder="CT Brain / MRI Spine..." />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Modality
                      <input name="modality" placeholder="CT / MRI / X-ray / US" />
                    </label>
                    <label>
                      Body part
                      <input name="bodyPart" placeholder="Chest / brain / hip" />
                    </label>
                  </div>
                  <label>
                    Clinical reason
                    <textarea name="clinicalReason" rows={2} dir="auto" />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Priority
                      <select name="priority" defaultValue="routine">
                        <option value="routine">routine</option>
                        <option value="high">high</option>
                        <option value="urgent">urgent</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                    <label>
                      Target date
                      <input type="date" name="targetDate" />
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea name="notes" rows={2} dir="auto" />
                  </label>
                  <button type="submit" className={styles.primaryBtn}>Create imaging order</button>
                </form>

                <form action={addNursingOrderAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <h3 className={styles.subHead}>Nursing Order</h3>
                  <label>
                    Order title
                    <input name="orderTitle" required placeholder="Check blood glucose q6h" />
                  </label>
                  <label>
                    Instructions
                    <textarea name="instructions" rows={2} dir="auto" />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Frequency
                      <input name="frequency" placeholder="q8h / BID / daily" />
                    </label>
                    <label>
                      Priority
                      <select name="priority" defaultValue="routine">
                        <option value="routine">routine</option>
                        <option value="high">high</option>
                        <option value="urgent">urgent</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                  </div>
                  <div className={styles.twoCol}>
                    <label>
                      Start date
                      <input type="date" name="startDate" />
                    </label>
                    <label>
                      End date
                      <input type="date" name="endDate" />
                    </label>
                  </div>
                  <button type="submit" className={styles.primaryBtn}>Create nursing order</button>
                </form>

                <form action={addPhysioOrderAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <h3 className={styles.subHead}>Physio Order</h3>
                  <label>
                    Order title
                    <input name="orderTitle" required placeholder="Gait retraining and ROM program" />
                  </label>
                  <label>
                    Protocol
                    <textarea name="protocol" rows={2} dir="auto" />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Frequency
                      <input name="frequency" placeholder="3 sessions/week" />
                    </label>
                    <label>
                      Session count
                      <input type="number" name="sessionCount" min={1} />
                    </label>
                  </div>
                  <label>
                    Goals
                    <textarea name="goals" rows={2} dir="auto" />
                  </label>
                  <label>
                    Priority
                    <select name="priority" defaultValue="routine">
                      <option value="routine">routine</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                      <option value="critical">critical</option>
                    </select>
                  </label>
                  <button type="submit" className={styles.primaryBtn}>Create physio order</button>
                </form>

                <form action={addMedicationOrderAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <h3 className={styles.subHead}>Medication Order</h3>
                  <label>
                    Medication name
                    <input name="medicationName" required />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Dose
                      <input name="dose" />
                    </label>
                    <label>
                      Frequency
                      <input name="frequency" />
                    </label>
                  </div>
                  <div className={styles.twoCol}>
                    <label>
                      Route
                      <input name="route" placeholder="oral / IV / IM" />
                    </label>
                    <label className={styles.inlineCheck}>
                      <input type="checkbox" name="isPrn" />
                      PRN order
                    </label>
                  </div>
                  <div className={styles.twoCol}>
                    <label>
                      Start date
                      <input type="date" name="startDate" />
                    </label>
                    <label>
                      End date
                      <input type="date" name="endDate" />
                    </label>
                  </div>
                  <label>
                    Instructions
                    <textarea name="instructions" rows={2} dir="auto" />
                  </label>
                  <label>
                    Priority
                    <select name="priority" defaultValue="routine">
                      <option value="routine">routine</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                      <option value="critical">critical</option>
                    </select>
                  </label>
                  <button type="submit" className={styles.primaryBtn}>Create medication order</button>
                </form>
              </article>
            )}

            <article className={styles.card}>
              <h2>Order Feed</h2>
              <ul className={styles.list}>
                {patient.labOrders.map((order) => (
                  <li key={`lab-${order.id}`}>
                    <strong>Lab • {order.testName}</strong>
                    <span>{order.priority} • {order.status} • {formatDateTime(order.orderedAt)} • {order.orderedByStaff?.name ?? '-'}</span>
                    {order.clinicalReason && <p dir="auto">{order.clinicalReason}</p>}
                  </li>
                ))}
                {patient.imagingOrders.map((order) => (
                  <li key={`img-${order.id}`}>
                    <strong>Imaging • {order.studyName}</strong>
                    <span>{order.modality ?? '-'} • {order.priority} • {order.status} • {formatDateTime(order.orderedAt)}</span>
                    {order.clinicalReason && <p dir="auto">{order.clinicalReason}</p>}
                  </li>
                ))}
                {patient.nursingOrders.map((order) => (
                  <li key={`nur-${order.id}`}>
                    <strong>Nursing • {order.orderTitle}</strong>
                    <span>{order.frequency ?? '-'} • {order.priority} • {order.status} • {formatDateTime(order.orderedAt)}</span>
                    {order.instructions && <p dir="auto">{order.instructions}</p>}
                  </li>
                ))}
                {patient.physioOrders.map((order) => (
                  <li key={`pt-${order.id}`}>
                    <strong>Physio • {order.orderTitle}</strong>
                    <span>{order.frequency ?? '-'} • {order.priority} • {order.status} • {formatDateTime(order.orderedAt)}</span>
                    {(order.goals || order.protocol) && <p dir="auto">{order.goals ?? order.protocol}</p>}
                  </li>
                ))}
                {patient.medicationOrders.map((order) => (
                  <li key={`med-${order.id}`}>
                    <strong>Medication • {order.medicationName}</strong>
                    <span>{order.dose ?? '-'} • {order.frequency ?? '-'} • {order.status} • {formatDateTime(order.orderedAt)}</span>
                    {order.instructions && <p dir="auto">{order.instructions}</p>}
                  </li>
                ))}
              </ul>
              {patient.labOrders.length + patient.imagingOrders.length + patient.nursingOrders.length + patient.physioOrders.length + patient.medicationOrders.length === 0 && (
                <p className={styles.emptyText}>No active orders in this chart yet.</p>
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
        )}

        {activeTab === 'nursing' && (
          <section className={styles.grid}>
            {canNurseWrite && (
              <article className={styles.card}>
                <h2>Nurse: Daily Report</h2>
                <form action={addNurseDailyReportAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
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
                  <input type="hidden" name="tab" value={activeTab} />
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
              <h2>Vitals Timeline</h2>
              {patient.vitalSigns.length === 0 ? (
                <p className={styles.emptyText}>No vitals recorded.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.vitalSigns.map((vital) => (
                    <li key={vital.id}>
                      <strong>{formatDateTime(vital.measuredAt)}</strong>
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
              <h2>Nursing Task Engine</h2>
              {canNurseWrite && (
                <form action={addCareTaskAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <input type="hidden" name="sourceModule" value="nursing" />
                  <label>
                    Task type
                    <select name="taskType" defaultValue="nurse_check">
                      <option value="nurse_check">nurse_check</option>
                      <option value="medication_reminder">medication_reminder</option>
                      <option value="doctor_review">doctor_review</option>
                      <option value="lab_followup">lab_followup</option>
                      <option value="coordination">coordination</option>
                      <option value="custom">custom</option>
                    </select>
                  </label>
                  <label>
                    Task title
                    <input name="title" required placeholder="Recheck BP in 4 hours" />
                  </label>
                  <label>
                    Description
                    <textarea name="description" rows={2} dir="auto" />
                  </label>
                  <div className={styles.twoCol}>
                    <label>
                      Priority
                      <select name="priority" defaultValue="high">
                        <option value="routine">routine</option>
                        <option value="high">high</option>
                        <option value="urgent">urgent</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                    <label>
                      Due at
                      <input type="datetime-local" name="dueAt" />
                    </label>
                  </div>
                  <label>
                    Assign to
                    <select name="assignedToStaffId" defaultValue="">
                      <option value="">Unassigned</option>
                      {patient.staffAssignments
                        .filter((assignment) => ['nurse', 'doctor', 'admin', 'superadmin'].includes(assignment.staff.role))
                        .map((assignment) => (
                          <option key={assignment.staff.id} value={assignment.staff.id}>
                            {assignment.staff.name} ({assignment.staff.role})
                          </option>
                        ))}
                    </select>
                  </label>
                  <button type="submit" className={styles.primaryBtn}>Create nursing task</button>
                </form>
              )}

              {patient.careTasks.filter((task) => task.sourceModule === 'nursing' || task.taskType === 'nurse_check').length === 0 ? (
                <p className={styles.emptyText}>No nursing tasks yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.careTasks
                    .filter((task) => task.sourceModule === 'nursing' || task.taskType === 'nurse_check')
                    .map((task) => (
                      <li key={task.id}>
                        <strong>{task.title}</strong>
                        <span>{task.taskType} • {task.priority} • {task.status} • Due {formatDateTime(task.dueAt)}</span>
                        <p>{task.assignedToStaff?.name ?? 'Unassigned'} • Created {formatDateTime(task.createdAt)}</p>
                        {task.description && <p dir="auto">{task.description}</p>}
                        {(canNurseWrite || canDoctorWrite) && (
                          <form action={updateCareTaskStatusAction} className={styles.inlineNoteForm}>
                            <input type="hidden" name="patientId" value={patient.id} />
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="tab" value={activeTab} />
                            <label>
                              Status
                              <select name="status" defaultValue={task.status}>
                                <option value="open">open</option>
                                <option value="in_progress">in_progress</option>
                                <option value="completed">completed</option>
                                <option value="cancelled">cancelled</option>
                              </select>
                            </label>
                            <button type="submit" className={styles.secondaryBtn}>Update status</button>
                          </form>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {activeTab === 'physio' && (
          <section className={styles.grid}>
            {canPhysioWrite && (
              <article className={styles.card}>
                <h2>Physio: Session Report</h2>
                <form action={addPhysioSessionReportAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
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
              <h2>Rehab Goals and Outcomes</h2>
              <ul className={styles.inlineList}>
                <li>
                  <strong>Goals</strong>
                  <span>Walk independently, improve ROM, reduce pain, improve balance</span>
                </li>
                <li>
                  <strong>Programs</strong>
                  <span>Haraka, Amal, stroke recovery, and osteoarthritis pathways</span>
                </li>
                <li>
                  <strong>Outcome Measures</strong>
                  <span>Berg Balance, Timed Up and Go, FIM, pain trend curves</span>
                </li>
                <li>
                  <strong>Plateau tracking</strong>
                  <span>Expected duration, prognosis checkpoints, and escalation to doctor</span>
                </li>
              </ul>
            </article>
          </section>
        )}

        {activeTab === 'coordination' && (
          <section className={styles.grid}>
            {(canOpsWrite || canDoctorWrite || canManageAssignments) && (
              <article className={styles.card}>
                <h2>Care Ops: Messaging, Routing, AI Triage</h2>
                <form action={addCareTeamMessageAction} className={styles.formGrid}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
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
                  <input type="hidden" name="tab" value={activeTab} />
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
                    <input type="hidden" name="tab" value={activeTab} />
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

            <article className={styles.card}>
              <h2>Care Team Messages</h2>
              {patient.careTeamMessages.length === 0 ? (
                <p className={styles.emptyText}>No care messages yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.careTeamMessages.map((message) => (
                    <li key={message.id}>
                      <strong>{formatDateTime(message.createdAt)} • {message.authorStaff?.name ?? '-'}</strong>
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
                        {ticket.sourceChannel} • {ticket.triagePriority} • {ticket.status} • Callback {formatDateTime(ticket.targetCallbackAt)}
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
              <h2>Task Engine</h2>
              <form action={addCareTaskAction} className={styles.formGrid}>
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="tab" value={activeTab} />
                <label>
                  Task type
                  <select name="taskType" defaultValue="coordination">
                    <option value="nurse_check">nurse_check</option>
                    <option value="lab_followup">lab_followup</option>
                    <option value="imaging_followup">imaging_followup</option>
                    <option value="medication_reminder">medication_reminder</option>
                    <option value="physio_exercise">physio_exercise</option>
                    <option value="doctor_review">doctor_review</option>
                    <option value="referral">referral</option>
                    <option value="coordination">coordination</option>
                    <option value="custom">custom</option>
                  </select>
                </label>
                <label>
                  Task title
                  <input name="title" required placeholder="Nurse to check glucose tonight" />
                </label>
                <label>
                  Description
                  <textarea name="description" rows={2} dir="auto" />
                </label>
                <div className={styles.twoCol}>
                  <label>
                    Priority
                    <select name="priority" defaultValue="routine">
                      <option value="routine">routine</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                      <option value="critical">critical</option>
                    </select>
                  </label>
                  <label>
                    Due at
                    <input type="datetime-local" name="dueAt" />
                  </label>
                </div>
                <label>
                  Assign to staff
                  <select name="assignedToStaffId" defaultValue="">
                    <option value="">Unassigned</option>
                    {patient.staffAssignments.map((assignment) => (
                      <option key={assignment.staff.id} value={assignment.staff.id}>
                        {assignment.staff.name} ({assignment.staff.role})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Source module
                  <input name="sourceModule" defaultValue="coordination" />
                </label>
                <button type="submit" className={styles.primaryBtn}>Create task</button>
              </form>

              {patient.careTasks.length === 0 ? (
                <p className={styles.emptyText}>No tasks created yet.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.careTasks.map((task) => (
                    <li key={task.id}>
                      <strong>{task.title}</strong>
                      <span>
                        {task.taskType} • {task.priority} • {task.status} • Due {formatDateTime(task.dueAt)}
                      </span>
                      <p>
                        {task.assignedToStaff?.name ?? 'Unassigned'} • {task.sourceModule ?? '-'} • Created {formatDateTime(task.createdAt)}
                      </p>
                      {task.description && <p dir="auto">{task.description}</p>}
                      <form action={updateCareTaskStatusAction} className={styles.inlineNoteForm}>
                        <input type="hidden" name="patientId" value={patient.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="tab" value={activeTab} />
                        <label>
                          Status
                          <select name="status" defaultValue={task.status}>
                            <option value="open">open</option>
                            <option value="in_progress">in_progress</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </label>
                        <button type="submit" className={styles.secondaryBtn}>Update task status</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={styles.card}>
              <h2>Caregiver and Family Portal</h2>
              <ul className={styles.inlineList}>
                <li>
                  <strong>Caregiver access</strong>
                  <span>Medication reminders, upcoming visits, care plan summaries</span>
                </li>
                <li>
                  <strong>Daily updates</strong>
                  <span>Provider updates, family notifications, and consented status sharing</span>
                </li>
                <li>
                  <strong>Billing and consent</strong>
                  <span>Invoice visibility, authorization, and legal consent tracking</span>
                </li>
                <li>
                  <strong>Offline continuity</strong>
                  <span>Sync-safe mobile updates for field teams with intermittent internet</span>
                </li>
              </ul>
            </article>
          </section>
        )}

        {activeTab === 'governance' && (
          <section className={styles.grid}>
            <article className={styles.card}>
              <h2>Access Assignment (RBAC)</h2>
              {canManageAssignments ? (
                <form action={assignStaffToPatientAction} className={styles.assignRow}>
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="tab" value={activeTab} />
                  <select name="staffId" required>
                    <option value="">Select staff member</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({formatRoleLabel(staff.role)})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={styles.primaryBtn}>Assign Access</button>
                </form>
              ) : (
                <p className={styles.metaLine}>You can review active assignments, but only admins can change access.</p>
              )}

              {patient.staffAssignments.length === 0 ? (
                <p className={styles.emptyText}>No active staff assignments.</p>
              ) : (
                <ul className={styles.list}>
                  {patient.staffAssignments.map((assignment) => (
                    <li key={assignment.id}>
                      <strong>{assignment.staff.name}</strong>
                      <span>
                        {formatRoleLabel(assignment.staff.role)} • {assignment.staff.email} • {formatDateTime(assignment.assignedAt)}
                      </span>
                      {canManageAssignments && (
                        <form action={removeStaffAssignmentAction} className={styles.inlineDangerForm}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <input type="hidden" name="patientId" value={patient.id} />
                          <input type="hidden" name="tab" value={activeTab} />
                          <button type="submit" className={styles.dangerBtn}>Remove Access</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={styles.card}>
              <h2>Audit, Export, and Legal Artifacts</h2>
              <p className={styles.metaLine}>Tamper-evident export and verification support for legal and partner workflows.</p>
              <div className={styles.exportCtaRow}>
                <Link href={`/admin/patients/${patient.id}/export`} className={styles.primaryLinkBtn}>Open export template</Link>
                <Link href={`/admin/patients/${patient.id}/export/verify`} className={styles.secondaryLinkBtn}>Open verification page</Link>
              </div>
            </article>

            <article className={styles.card}>
              <h2>Recommended System Structure</h2>
              <ul className={styles.layerList}>
                {roadmapLayers.map((layer) => (
                  <li key={layer.title}>
                    <div>
                      <strong>{layer.title}</strong>
                      <p>{layer.detail}</p>
                    </div>
                    <span className={layer.status === 'active' ? styles.layerActive : styles.layerPlanned}>
                      {layer.status}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className={styles.card}>
              <h2>Compliance Controls</h2>
              <ul className={styles.inlineList}>
                <li>
                  <strong>Role-based access control</strong>
                  <span>Doctor, nurse, physio, admin, coordinator, labs, insurance, caregivers</span>
                </li>
                <li>
                  <strong>Audit log coverage</strong>
                  <span>Track who viewed, edited, changed what, and when</span>
                </li>
                <li>
                  <strong>Security baseline</strong>
                  <span>Encryption, MFA, secure backups, and compliance with Egyptian PDPL</span>
                </li>
                <li>
                  <strong>Integrations baseline</strong>
                  <span>HL7/FHIR design for labs, imaging, hospitals, and insurers</span>
                </li>
              </ul>
            </article>
          </section>
        )}
      </section>
    </AdminDashboardShell>
  );
}
