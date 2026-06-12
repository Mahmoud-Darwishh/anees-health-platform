import Link from 'next/link';
import { requestRestrictedAccessAction, requestBreakGlassAccessAction } from './actions';
import { ADMIN_WORKSPACE_TAB_LIST } from './workspace-tabs';
import { PatientSafetyHeader } from './PatientSafetyHeader';
import type { AdminPatientDetailData, AdminPatientFlash } from './types';
import { buildAdminPatientViewContext } from './view-context';
import { SnapshotSections } from './views/snapshot-sections';
import { ActivityAuditSections } from './views/activity-audit-sections';
import { ProblemsRisksSections } from './views/problems-risks-sections';
import { MedicationsMarSections } from './views/medications-mar-sections';
import { DocumentsSections } from './views/documents-sections';
import { LabsSections } from './views/labs-sections';
import { MeasurementsSections } from './views/measurements-sections';
import { CareTeamConsentSections } from './views/care-team-consent-sections';
import { VisitsEncountersSections } from './views/visits-encounters-sections';
import { CarePlanGoalsSections } from './views/care-plan-goals-sections';
import { NotesReportsSections } from './views/notes-reports-sections';
import { OrdersTasksSections } from './views/orders-tasks-sections';

export function AdminPatientDetailView({
  data,
  flash,
  activeTab,
}: {
  data: AdminPatientDetailData;
  flash: AdminPatientFlash | null;
  activeTab?: string;
}) {
  const ctx = buildAdminPatientViewContext(data, activeTab);
  const {
    restrictedAccess,
    patient,
    localPatient,
    error,
    allergies,
    careTeamMembers,
    code,
    allowedTabs,
    currentTab,
    openTaskCount,
    activeDiagnoses,
    activeMedicationCount,
    tabHref,
    latestVisit,
    latestVitals,
    safetyHeaderLinks,
  } = ctx;

  return (
    <div>
      <div className="anees-banner anees-banner-head mb-3 d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-1 small opacity-75">Anees EHR · Patient Workspace</p>
          <h1 className="h5 mb-0">{patient?.name?.[0]?.text ?? 'Patient profile'}</h1>
          <p className="small mb-0 mt-1 text-muted">Unified workspace for structured documentation, care coordination, and clinical continuity.</p>
        </div>
        <span className="anees-chip">Case-scoped access active</span>
      </div>

      {flash && (
        <div className={`alert ${flash.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {flash.message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          Could not load patient: {error}
        </div>
      )}

      {patient && (
        <div className="d-grid gap-3">
          <div className="card bg-white">
            <div className="card-body py-2 anees-tab-card-body">
              <div className="anees-tab-nav-wrap">
                <div className="anees-tab-nav" role="tablist" aria-label="Patient workspace navigation">
                  {ADMIN_WORKSPACE_TAB_LIST.filter((tab) => allowedTabs.includes(tab.id)).map((tab) => {
                    const isActive = currentTab === tab.id;

                    return (
                      <Link
                        key={tab.id}
                        href={tabHref(tab.id)}
                        className={`anees-tab-link ${isActive ? 'is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <PatientSafetyHeader
            patientName={patient?.name?.[0]?.text ?? 'Patient profile'}
            patientCode={code ?? localPatient?.code ?? null}
            patientGender={patient.gender}
            patientBirthDate={patient.birthDate}
            dnrStatus={localPatient?.dnrStatus ?? null}
            restrictedAccess={restrictedAccess}
            allergies={allergies}
            activeDiagnoses={activeDiagnoses}
            activeMedicationCount={activeMedicationCount}
            careTeamCount={careTeamMembers.length}
            openTaskCount={openTaskCount}
            latestVisit={latestVisit}
            latestVitals={latestVitals}
            links={safetyHeaderLinks}
          >
              {restrictedAccess.hasRestrictedContent && restrictedAccess.requiresReason && (
                <form action={requestRestrictedAccessAction} className="row g-2 border-top pt-3 mt-1">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <div className="col-md-10">
                    <label htmlFor="restrictedAccessReason" className="form-label mb-1">Restricted-tier access reason (required)</label>
                    <textarea
                      id="restrictedAccessReason"
                      name="restrictedAccessReason"
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="State the clinical justification for restricted data access"
                      required
                      dir="auto"
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="submit" className="btn btn-sm btn-outline-dark w-100">Request access</button>
                  </div>
                </form>
              )}

              {restrictedAccess.hasRestrictedContent && restrictedAccess.requiresReason && (
                <form action={requestBreakGlassAccessAction} className="row g-2 mt-1">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <div className="col-md-10">
                    <label htmlFor="breakGlassReason" className="form-label mb-1">Emergency break-glass reason</label>
                    <textarea
                      id="breakGlassReason"
                      name="breakGlassReason"
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Emergency-only access justification (audited and escalated)"
                      required
                      dir="auto"
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="submit" className="btn btn-sm btn-outline-danger w-100">Break glass</button>
                  </div>
                </form>
              )}

              {restrictedAccess.hasRestrictedContent && !restrictedAccess.requiresReason && restrictedAccess.reasonPreview && (
                <div className="small text-muted border-top pt-2 mt-1">
                  Restricted access active for this session. Reason: {restrictedAccess.reasonPreview}
                </div>
              )}
          </PatientSafetyHeader>


          <SnapshotSections ctx={ctx} />
          <ActivityAuditSections ctx={ctx} />
          <ProblemsRisksSections ctx={ctx} />
          <MedicationsMarSections ctx={ctx} />
          <DocumentsSections ctx={ctx} />
          <LabsSections ctx={ctx} />
          <MeasurementsSections ctx={ctx} />
          <CareTeamConsentSections ctx={ctx} />
          <VisitsEncountersSections ctx={ctx} />
          <CarePlanGoalsSections ctx={ctx} />
          <NotesReportsSections ctx={ctx} />
          <OrdersTasksSections ctx={ctx} />
        </div>
      )}
    </div>
  );
}
