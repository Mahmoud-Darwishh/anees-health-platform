import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/rbac';
import { getOwnPatientRecord } from '@/lib/portal/patient-record';
import { listPatientEncounters } from '@/lib/medplum/encounters';
import { listRecentPatientVitals } from '@/lib/medplum/observations';
import { listPatientClinicalNotes } from '@/lib/medplum/clinical-notes';
import { listPatientTasks } from '@/lib/medplum/tasks';
import { getActivePatientCareTeam } from '@/lib/medplum/care-teams';
import { listPatientCarePlans } from '@/lib/medplum/care-plans';
import { listPatientConditions } from '@/lib/medplum/conditions';
import { listPatientAllergies } from '@/lib/medplum/allergies';
import { listPatientMedications } from '@/lib/medplum/medications';
import { listPatientDocuments } from '@/lib/medplum/documents';
import { listPatientLabOrders, listPatientDiagnosticReports } from '@/lib/medplum/labs';
import { listPatientAssessments } from '@/lib/medplum/assessments';
import styles from './portal.module.scss';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type PortalWorkspaceTab =
  | 'overview'
  | 'clinical'
  | 'files'
  | 'care'
  | 'visits'
  | 'vitals'
  | 'notes'
  | 'tasks';

const PORTAL_WORKSPACE_TABS: PortalWorkspaceTab[] = [
  'overview',
  'clinical',
  'files',
  'care',
  'visits',
  'vitals',
  'notes',
  'tasks',
];

function resolvePortalWorkspaceTab(rawTab?: string): PortalWorkspaceTab {
  const value = PORTAL_WORKSPACE_TABS.find((tab) => tab === rawTab);
  return value ?? 'overview';
}

function toVisitStatusKey(status?: string):
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | null {
  switch (status) {
    case 'planned':
      return 'scheduled';
    case 'in-progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return null;
  }
}

function encounterTypeLabel(encounter: {
  serviceType?: Array<{ coding?: Array<{ code?: string; display?: string }> }>;
}): string {
  const coding = encounter.serviceType?.[0]?.coding?.[0];
  if (coding?.display) {
    return coding.display;
  }

  switch (coding?.code) {
    case 'in_home':
      return 'in_home';
    case 'clinic':
      return 'clinic';
    case 'virtual':
      return 'virtual';
    default:
      return '—';
  }
}

function toDateTimeValue(value?: string | null, locale?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB');
}

function dayGreeting(t: Awaited<ReturnType<typeof getTranslations>>): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return t('greetings.morning');
  }
  if (hour < 18) {
    return t('greetings.afternoon');
  }
  return t('greetings.evening');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });

  return {
    title: t('metaTitle'),
    robots: { index: false },
  };
}

export default async function PatientPortalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'portal' });
  const activeTab = resolvePortalWorkspaceTab(tab);

  const user = await getSessionUser();
  if (!user || user.role !== 'patient') {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/portal`);
  }

  const ownRecord = await getOwnPatientRecord();

  if (!ownRecord) {
    return (
      <main className="container py-4">
        <div className="alert alert-danger" role="alert">
          <h1 className="h5">{t('notFoundTitle')}</h1>
          <p className="mb-0">{t('notFoundText')}</p>
        </div>
      </main>
    );
  }

  const medplumPatientId = ownRecord.patient.medplumPatientId;
  const canSeeVisits = ownRecord.access.scopes.includes('visits');
  const canSeeVitals = ownRecord.access.scopes.includes('vitals');
  const canSeeNotes = ownRecord.access.scopes.includes('notes');
  const canSeeTasks = ownRecord.access.scopes.includes('tasks');
  const canSeeClinicalDepth = ownRecord.access.mode === 'patient';

  const loadVisits = medplumPatientId && canSeeVisits && (activeTab === 'overview' || activeTab === 'visits');
  const loadVitals = medplumPatientId && canSeeVitals && (activeTab === 'overview' || activeTab === 'vitals');
  const loadNotes = medplumPatientId && canSeeNotes && (activeTab === 'overview' || activeTab === 'notes');
  const loadTasks = medplumPatientId && canSeeTasks && (activeTab === 'overview' || activeTab === 'tasks');
  const loadCare = medplumPatientId && (activeTab === 'overview' || activeTab === 'care');
  const loadClinical = medplumPatientId && canSeeClinicalDepth && (activeTab === 'overview' || activeTab === 'clinical');
  const loadFiles = medplumPatientId && canSeeClinicalDepth && (activeTab === 'overview' || activeTab === 'files');

  const [
    encounters,
    vitals,
    signedNotes,
    activeTasks,
    carePlans,
    careTeam,
    problems,
    allergies,
    medications,
    documents,
    labOrders,
    labResults,
    assessments,
  ] = await Promise.all([
    loadVisits ? listPatientEncounters(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadVitals ? listRecentPatientVitals(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadNotes
      ? listPatientClinicalNotes(medplumPatientId, 20, { signedOnly: true }).catch(() => [])
      : Promise.resolve([]),
    loadTasks
      ? listPatientTasks(medplumPatientId, 25)
          .then((tasks) => tasks.filter((task) => ['requested', 'in-progress', 'on-hold'].includes(task.status)))
          .catch(() => [])
      : Promise.resolve([]),
    loadCare ? listPatientCarePlans(medplumPatientId, 10).catch(() => []) : Promise.resolve([]),
    loadCare ? getActivePatientCareTeam(medplumPatientId).catch(() => null) : Promise.resolve(null),
    loadClinical ? listPatientConditions(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadClinical ? listPatientAllergies(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadClinical ? listPatientMedications(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadFiles ? listPatientDocuments(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadFiles ? listPatientLabOrders(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadFiles ? listPatientDiagnosticReports(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
    loadClinical ? listPatientAssessments(medplumPatientId, 20).catch(() => []) : Promise.resolve([]),
  ]);

  const careTeamMembers = careTeam?.participant ?? [];
  const nextAppointment = encounters.find((encounter) => encounter.status === 'planned' && !!encounter.period?.start) ?? null;
  const portalTabs: Array<{ id: PortalWorkspaceTab; label: string }> = [
    { id: 'overview', label: t('nav.overview') },
    { id: 'clinical', label: t('nav.medical') },
    { id: 'files', label: t('nav.labs') },
    { id: 'care', label: t('nav.care') },
    { id: 'visits', label: t('nav.visits') },
    { id: 'vitals', label: t('vitals.title') },
    { id: 'notes', label: t('doctorNotes.title') },
    { id: 'tasks', label: t('care.tasks') },
  ];
  const tabHref = (nextTab: PortalWorkspaceTab) => `/${locale}/portal?tab=${nextTab}`;
  const firstName = ownRecord.patient.fullName.split(' ')[0];
  const greeting = dayGreeting(t);
  const greetingLine = `${greeting} ${firstName}`;
  const loyaltyMessage = t('brand.loyaltyMessage');
  const supportMessage = t('brand.supportMessage');
  const addressLine = ownRecord.patient.addressDetail ?? ownRecord.medplumPatient?.address?.[0]?.line?.[0] ?? ownRecord.medplumPatient?.address?.[0]?.text ?? null;
  const addressLandmark = ownRecord.patient.landmark ?? ownRecord.medplumPatient?.address?.[0]?.line?.[1] ?? null;
  const addressMapUrl = ownRecord.patient.addressMapUrl ?? ownRecord.medplumPatient?.address?.[0]?.extension?.find((extension: { url: string; valueUrl?: string }) => extension.url.includes('address-map-url'))?.valueUrl ?? null;
  const emergencyContactName = ownRecord.patient.emergencyContactName ?? ownRecord.medplumPatient?.contact?.[0]?.name?.text ?? null;
  const emergencyContactPhone = ownRecord.patient.emergencyContactPhone ?? ownRecord.medplumPatient?.contact?.[0]?.telecom?.find((telecom: { system?: string; value?: string }) => telecom.system === 'phone')?.value ?? null;
  const emergencyContactRelation = ownRecord.patient.emergencyContactRelation ?? ownRecord.medplumPatient?.contact?.[0]?.relationship?.[0]?.text ?? null;

  if (!medplumPatientId) {
    return (
      <main className="container py-4">
        <div className="alert alert-warning" role="alert">
          <h1 className="h5">{t('notLinkedTitle')}</h1>
          <p>{t('notLinkedText')}</p>
          <Link href={`/${locale}/booking`} className="btn btn-sm btn-primary">
            {t('linkAccountCta')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`container ${styles.portalShell}`}>
      <div className={styles.portalHero}>
        <div>
          <div className={styles.brandLockup}>
            <Image
              src="/assets/img/anees-logo.png"
              alt={t('brand.logoAlt')}
              width={56}
              height={56}
              className={styles.brandLogo}
            />
            <div>
              <p className={styles.kicker}>{t('kicker')}</p>
              <p className={styles.brandLoyalty}>{loyaltyMessage}</p>
            </div>
          </div>
          <p className={styles.heroGreeting}>{greetingLine}</p>
          <h1 className={styles.heroTitle}>{t('title')}</h1>
          <p className={styles.heroSupport}>{supportMessage}</p>
          {ownRecord.access.mode === 'caregiver' ? (
            <p className={styles.caregiverBadge}>{t('caregiverAccessBadge')}</p>
          ) : null}
        </div>
        <div className={styles.portalChip}>{ownRecord.patient.code}</div>
        <Link href={`/${locale}`} className={`btn btn-sm ${styles.backButton}`}>
          {t('goHomeCta')}
        </Link>
      </div>

      <div className={`card ${styles.sectionCard}`}>
        <div className="card-body py-2">
          <nav className={styles.tabNav} aria-label={t('workspace.tabsLabel')}>
            {portalTabs.map((portalTab) => {
              const isActive = activeTab === portalTab.id;

              return (
                <Link
                  key={portalTab.id}
                  href={tabHref(portalTab.id)}
                  className={`${styles.tabLink} ${isActive ? styles.tabLinkActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {portalTab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <div className="text-muted small">{t('profile.fullName')}</div>
              <div className={styles.metaValue}>{ownRecord.patient.fullName}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">{t('profile.caseId')}</div>
              <div className={styles.metaValue}>{ownRecord.patient.code}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">{t('profile.phone')}</div>
              <div className={styles.metaValue}>{ownRecord.patient.phone}</div>
            </div>
          </div>

          <div className="row g-3 mt-2">
            <div className="col-12 col-lg-6">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('profile.address')}</div>
                <div className={styles.metaValue}>{addressLine ?? '—'}</div>
                <div className="small text-muted mt-1">{addressLandmark ?? '—'}</div>
                {addressMapUrl ? (
                  <a href={addressMapUrl} target="_blank" rel="noreferrer" className="small d-inline-block mt-2">
                    Open map
                  </a>
                ) : null}
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('profile.caregiver')}</div>
                <div className={styles.metaValue}>{emergencyContactName ?? '—'}</div>
                <div className="small text-muted mt-1">{emergencyContactRelation ?? '—'}</div>
                <div className="small text-muted mt-1">{emergencyContactPhone ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'overview' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('clinicalDepthTitle')}</h2>
          <span className="text-muted small">{canSeeClinicalDepth ? t('clinicalDepthSubtitle') : t('consentRestricted')}</span>
        </div>
        <div className="card-body">
          {canSeeClinicalDepth ? (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="border rounded-3 p-3 h-100">
                  <div className="text-muted small">{t('problemsTitle')}</div>
                  <div className="h4 mb-0">{problems.length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-3 h-100">
                  <div className="text-muted small">{t('allergiesTitle')}</div>
                  <div className="h4 mb-0">{allergies.length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-3 h-100">
                  <div className="text-muted small">{t('medicationsTitle')}</div>
                  <div className="h4 mb-0">{medications.filter((item) => item.status === 'active').length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-3 h-100">
                  <div className="text-muted small">{t('documentsTitle')}</div>
                  <div className="h4 mb-0">{documents.length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-3 h-100">
                  <div className="text-muted small">{t('labsTitle')}</div>
                  <div className="h4 mb-0">{labOrders.length + labResults.length}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="border rounded-3 p-3 h-100">
                  <div className="text-muted small">{t('assessmentsTitle')}</div>
                  <div className="h4 mb-0">{assessments.length}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          )}
        </div>
      </div>
      )}

      {(activeTab === 'clinical' || activeTab === 'files') && !canSeeClinicalDepth ? (
        <div className={`card ${styles.sectionCard}`}>
          <div className="card-body">
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          </div>
        </div>
      ) : null}

      {canSeeClinicalDepth && (activeTab === 'clinical' || activeTab === 'files') ? (
        <>
          {activeTab === 'clinical' && (
          <div className={`card ${styles.sectionCard}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">{t('problemsTitle')}</h2>
              <span className="text-muted small">{problems.length}</span>
            </div>
            <div className="card-body">
              {problems.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
              ) : (
                <div className={`table-responsive ${styles.tableWrap}`}>
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>{t('problemTitle')}</th>
                        <th>{t('problemStatus')}</th>
                        <th>{t('problemOnset')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((problem) => (
                        <tr key={problem.id}>
                          <td>
                            <div className="fw-semibold">{problem.label}</div>
                            <div className="text-muted small">{problem.code ?? '—'}</div>
                          </td>
                          <td className="text-capitalize">{problem.status}</td>
                          <td>{problem.onset ? new Date(problem.onset).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'clinical' && (
          <div className={`card ${styles.sectionCard}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">{t('allergiesTitle')}</h2>
              <span className="text-muted small">{allergies.length}</span>
            </div>
            <div className="card-body">
              {allergies.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
              ) : (
                <div className={`table-responsive ${styles.tableWrap}`}>
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>{t('allergenLabel')}</th>
                        <th>{t('allergyReaction')}</th>
                        <th>{t('allergySeverity')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allergies.map((allergy) => (
                        <tr key={allergy.id}>
                          <td>
                            <div className="fw-semibold">{allergy.allergen}</div>
                            <div className="text-muted small">{allergy.onset ? new Date(allergy.onset).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'}</div>
                          </td>
                          <td>{allergy.reaction ?? '—'}</td>
                          <td className="text-capitalize">{allergy.severity ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'clinical' && (
          <div className={`card ${styles.sectionCard}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">{t('medicationsTitle')}</h2>
              <span className="text-muted small">{medications.length}</span>
            </div>
            <div className="card-body">
              {medications.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
              ) : (
                <div className={`table-responsive ${styles.tableWrap}`}>
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>{t('medicationLabel')}</th>
                        <th>{t('medicationStatus')}</th>
                        <th>{t('medicationDose')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications.map((medication) => (
                        <tr key={medication.id}>
                          <td>
                            <div className="fw-semibold">{medication.medication}</div>
                            <div className="text-muted small">{medication.start ? new Date(medication.start).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'}{medication.end ? ` → ${new Date(medication.end).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB')}` : ''}</div>
                          </td>
                          <td className="text-capitalize">{medication.status}</td>
                          <td>
                            <div>{medication.dosage ?? '—'}</div>
                            <div className="text-muted small">{medication.route ?? '—'}{medication.frequency ? ` · ${medication.frequency}` : ''}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'files' && (
          <div className={`card ${styles.sectionCard}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">{t('documentsTitle')}</h2>
              <span className="text-muted small">{documents.length}</span>
            </div>
            <div className="card-body">
              {documents.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
              ) : (
                <div className={`table-responsive ${styles.tableWrap}`}>
                  <table className={`table table-sm align-middle mb-0 ${styles.documentsTable}`}>
                    <thead>
                      <tr>
                        <th>{t('documentLabel')}</th>
                        <th>{t('documentCategory')}</th>
                        <th>{t('documentDate')}</th>
                        <th className="text-end">{t('documentAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((document) => (
                        <tr key={document.id}>
                          <td className={styles.docCellTitle} data-label={t('documentLabel')}>
                            <div className="fw-semibold">{document.title}</div>
                            <div className="text-muted small">{document.author ?? '—'}</div>
                          </td>
                          <td className="text-capitalize" data-label={t('documentCategory')}>{document.category}</td>
                          <td data-label={t('documentDate')}>{document.createdAt ? new Date(document.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'}</td>
                          <td className={`text-end ${styles.docActions}`} data-label={t('documentAction')}>
                            <div className={styles.docActionsWrap}>
                              <a href={`/api/ehr/documents/${document.id}?disposition=inline`} className="btn btn-sm btn-outline-secondary" target="_blank" rel="noopener noreferrer">{t('documentView')}</a>
                              <a href={`/api/ehr/documents/${document.id}`} className="btn btn-sm btn-outline-primary">{t('documentDownload')}</a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'files' && (
          <div className={`card ${styles.sectionCard}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">{t('labsTitle')}</h2>
              <span className="text-muted small">{labOrders.length} {t('labsOrdersSuffix')} · {labResults.length} {t('labsResultsSuffix')}</span>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-lg-6">
                  <h3 className="h6">{t('labsOrdersTitle')}</h3>
                  {labOrders.length === 0 ? (
                    <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
                  ) : (
                    <div className={`table-responsive ${styles.tableWrap}`}>
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>{t('documentLabel')}</th><th>{t('medicationStatus')}</th><th>{t('documentCategory')}</th></tr></thead>
                        <tbody>
                          {labOrders.map((order) => (
                            <tr key={order.id}>
                              <td><div className="fw-semibold">{order.title}</div><div className="text-muted small">{order.note ?? '—'}</div></td>
                              <td className="text-capitalize">{order.status}</td>
                              <td className="text-capitalize">{order.category ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="col-lg-6">
                  <h3 className="h6">{t('labsResultsTitle')}</h3>
                  {labResults.length === 0 ? (
                    <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
                  ) : (
                    <div className={`table-responsive ${styles.tableWrap}`}>
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>{t('documentLabel')}</th><th>{t('medicationStatus')}</th><th>{t('documentDate')}</th></tr></thead>
                        <tbody>
                          {labResults.map((result) => (
                            <tr key={result.id}>
                              <td><div className="fw-semibold">{result.title}</div><div className="text-muted small">{result.conclusion ?? '—'}</div></td>
                              <td className="text-capitalize">{result.status}</td>
                              <td>{result.issued ? new Date(result.issued).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : result.effective ? new Date(result.effective).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {activeTab === 'clinical' && (
          <div className={`card ${styles.sectionCard}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">{t('assessmentsTitle')}</h2>
              <span className="text-muted small">{assessments.length}</span>
            </div>
            <div className="card-body">
              {assessments.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
              ) : (
                <div className={`table-responsive ${styles.tableWrap}`}>
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>{t('assessmentLabel')}</th><th>{t('assessmentType')}</th><th>{t('assessmentScore')}</th><th>{t('assessmentSummary')}</th></tr></thead>
                    <tbody>
                      {assessments.map((assessment) => (
                        <tr key={assessment.id}>
                          <td><div className="fw-semibold">{assessment.title}</div><div className="text-muted small">{assessment.author ?? '—'}</div></td>
                          <td className="text-capitalize">{assessment.type}</td>
                          <td>{assessment.score ?? '—'}</td>
                          <td>{assessment.summary ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}
        </>
      ) : null}

      {activeTab === 'care' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('summary.activeCarePlans')}</h2>
          <span className="text-muted small">{carePlans.length}</span>
        </div>
        <div className="card-body">
          {carePlans.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">
              {t('none')}
            </div>
          ) : (
            <div className={`table-responsive ${styles.tableWrap}`}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('carePlanTitle')}</th>
                    <th>{t('carePlanStatus')}</th>
                    <th>{t('carePlanRecordedAt')}</th>
                    <th>{t('carePlanDetails')}</th>
                  </tr>
                </thead>
                <tbody>
                  {carePlans.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <div className="fw-semibold">{plan.title}</div>
                        <div className="text-muted small">{plan.program ?? t('none')}</div>
                      </td>
                      <td className="text-capitalize">{plan.status}</td>
                      <td>{toDateTimeValue(plan.start ?? null, locale)}</td>
                      <td className="text-muted small">{plan.description ?? t('none')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'care' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('careTeamTitle')}</h2>
          <span className="text-muted small">{careTeamMembers.length}</span>
        </div>
        <div className="card-body">
          {careTeamMembers.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">
              {t('none')}
            </div>
          ) : (
            <div className={`table-responsive ${styles.tableWrap}`}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('careTeamMember')}</th>
                    <th>{t('careTeamRole')}</th>
                  </tr>
                </thead>
                <tbody>
                  {careTeamMembers.map((member, index) => (
                    <tr key={`${member.member?.reference ?? 'member'}-${index}`}>
                      <td>{member.member?.display ?? member.member?.reference ?? t('none')}</td>
                      <td className="text-capitalize">{member.role?.[0]?.coding?.[0]?.display ?? member.role?.[0]?.coding?.[0]?.code ?? t('none')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {(activeTab === 'care' || activeTab === 'overview') && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('engagementTitle')}</h2>
          <span className="text-muted small">{nextAppointment ? 1 : 0}</span>
        </div>
        <div className="card-body">
          {nextAppointment ? (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="text-muted small">{t('visits.date')}</div>
                <div className={styles.metaValue}>{toDateTimeValue(nextAppointment.period?.start ?? null, locale)}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">{t('visits.type')}</div>
                <div className={styles.metaValue}>{encounterTypeLabel(nextAppointment)}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">{t('visits.provider')}</div>
                <div className={styles.metaValue}>{nextAppointment.participant?.[0]?.individual?.display ?? t('none')}</div>
              </div>
            </div>
          ) : (
            <div className="alert alert-info mb-0" role="alert">
              {t('visits.empty')}
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'visits' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('visits.title')}</h2>
          <span className="text-muted small">{encounters.length}</span>
        </div>
        <div className="card-body">
          {!canSeeVisits ? (
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          ) : encounters.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">
              {t('visits.empty')}
            </div>
          ) : (
            <div className={`table-responsive ${styles.tableWrap}`}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('visits.date')}</th>
                    <th>{t('visits.status')}</th>
                    <th>{t('visits.type')}</th>
                    <th>{t('visits.provider')}</th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.map((encounter) => {
                    const statusKey = toVisitStatusKey(encounter.status);

                    return (
                      <tr key={encounter.id}>
                        <td>
                          {encounter.period?.start
                            ? new Date(encounter.period.start).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')
                            : t('none')}
                        </td>
                        <td>
                          {statusKey ? t(`visitStatus.${statusKey}`) : (encounter.status ?? t('none'))}
                        </td>
                        <td className="text-capitalize">{encounterTypeLabel(encounter)}</td>
                        <td>{encounter.participant?.[0]?.individual?.display ?? t('none')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'vitals' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('vitals.title')}</h2>
          <span className="text-muted small">{vitals.length}</span>
        </div>
        <div className="card-body">
          {!canSeeVitals ? (
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          ) : vitals.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">
              {t('vitals.empty')}
            </div>
          ) : (
            <div className={`table-responsive ${styles.tableWrap}`}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('vitals.measuredAt')}</th>
                    <th>{t('vitals.bp')}</th>
                    <th>{t('vitals.hr')}</th>
                    <th>{t('vitals.spo2')}</th>
                    <th>{t('vitals.temp')}</th>
                    <th>{t('vitals.weight')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.map((row, index) => (
                    <tr key={`${row.measuredAt}-${index}`}>
                      <td>{new Date(row.measuredAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                      <td>{row.systolicBp && row.diastolicBp ? `${row.systolicBp}/${row.diastolicBp}` : t('none')}</td>
                      <td>{row.heartRate ?? t('none')}</td>
                      <td>{row.spo2Pct ?? t('none')}</td>
                      <td>{row.temperatureC ?? t('none')}</td>
                      <td>{row.weightKg ?? t('none')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'notes' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('doctorNotes.title')}</h2>
          <span className="text-muted small">{signedNotes.length}</span>
        </div>
        <div className="card-body">
          {!canSeeNotes ? (
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          ) : signedNotes.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">
              {t('doctorNotes.empty')}
            </div>
          ) : (
            <div className={`table-responsive ${styles.tableWrap}`}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('visits.date')}</th>
                    <th>{t('doctorNotes.title')}</th>
                    <th>{t('doctorNotes.by')}</th>
                    <th>{t('doctorNotes.signed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {signedNotes.map((note) => (
                    <tr key={note.id}>
                      <td>{new Date(note.date).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                      <td>
                        <div className="fw-semibold">{note.title}</div>
                        <div className="text-muted small">{note.body || t('none')}</div>
                      </td>
                      <td>{note.author ?? t('none')}</td>
                      <td>{t('doctorNotes.signed')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'tasks' && (
      <div className={`card ${styles.sectionCard}`}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">{t('care.tasks')}</h2>
          <span className="text-muted small">{activeTasks.length}</span>
        </div>
        <div className="card-body">
          {!canSeeTasks ? (
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          ) : activeTasks.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">
              {t('care.emptyTasks')}
            </div>
          ) : (
            <div className={`table-responsive ${styles.tableWrap}`}>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('care.task')}</th>
                    <th>{t('status.active')}</th>
                    <th>{t('workspace.targetDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className="fw-semibold">{task.code?.text ?? task.code?.coding?.[0]?.display ?? t('none')}</div>
                        <div className="text-muted small">{task.description ?? t('none')}</div>
                      </td>
                      <td className="text-capitalize">{task.status}</td>
                      <td>{task.executionPeriod?.end ? new Date(task.executionPeriod.end).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB') : t('none')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}
    </main>
  );
}
