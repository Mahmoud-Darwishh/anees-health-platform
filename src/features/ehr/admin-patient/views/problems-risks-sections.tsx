import { createAllergyAction, recordNoKnownAllergiesAction, createConditionAction, retireConditionAction, updateConditionStatusAction, retireAllergyAction, updateAllergyStatusAction } from '../actions';
import { ProblemCodeFields } from '@/features/ehr/components/ProblemCodeFields';
import { CodedTermPicker } from '@/features/ehr/components/CodedTermPicker';
import { CONDITION_CONTEXT_OPTIONS, CONDITION_STATUS_OPTIONS, ALLERGY_STATUS_OPTIONS } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function ProblemsRisksSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    conditions,
    conditionsError,
    allergies,
    allergiesError,
    canWriteMedicalCondition,
    canWritePhysioCondition,
    clinicalConditionWrite,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('problems-risks') && (
          <div id="patient-problems" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Problem list</h2>
              <span className="text-muted small">{conditions.length} records</span>
            </div>
            <div className="card-body">
              {clinicalConditionWrite ? (
              <form action={createConditionAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="conditionCategory" className="form-label">Category</label>
                  <select id="conditionCategory" name="conditionCategory" className="form-select" defaultValue={canWriteMedicalCondition ? 'medical' : 'physical_therapy'}>
                    {canWriteMedicalCondition ? <option value="medical">Medical diagnosis</option> : null}
                    {canWritePhysioCondition ? <option value="physical_therapy">PT diagnosis</option> : null}
                  </select>
                </div>
                <ProblemCodeFields problemInputName="conditionLabel" codeInputName="conditionCode" />
                <div className="col-md-2">
                  <label htmlFor="conditionOnsetDate" className="form-label">Onset</label>
                  <input id="conditionOnsetDate" name="conditionOnsetDate" type="date" className="form-control" />
                </div>
                <div className="col-md-6">
                  <label htmlFor="conditionNote" className="form-label">Clinical context</label>
                  <select id="conditionNote" name="conditionNote" className="form-select" defaultValue="">
                    <option value="">Not specified</option>
                    {CONDITION_CONTEXT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="conditionVerification" className="form-label">Verification</label>
                  <select id="conditionVerification" name="conditionVerification" className="form-select" defaultValue="confirmed">
                    <option value="confirmed">Confirmed</option>
                    <option value="provisional">Provisional</option>
                    <option value="differential">Differential</option>
                    <option value="unconfirmed">Unconfirmed</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="conditionSeverity" className="form-label">Severity</label>
                  <select id="conditionSeverity" name="conditionSeverity" className="form-select" defaultValue="">
                    <option value="">Not specified</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="conditionBodySite" className="form-label">Body site (optional)</label>
                  <input id="conditionBodySite" name="conditionBodySite" type="text" className="form-control" placeholder="e.g. left knee, sacrum" autoComplete="off" dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Add problem</button>
                </div>
              </form>
              ) : (
                <div className="alert alert-info">Diagnosis authoring is role-scoped. You still have read access.</div>
              )}
              {conditionsError && <div className="alert alert-warning" role="alert">Could not load problems: {conditionsError}</div>}
              {!conditionsError && conditions.length === 0 && <div className="alert alert-info mb-0" role="alert">No problems recorded yet.</div>}
              {!conditionsError && conditions.length > 0 && (
                <div className="table-responsive anees-documents-table-wrap">
                  <table className="table table-sm align-middle mb-0 anees-documents-table">
                    <thead><tr><th>Problem</th><th>Type</th><th>Status</th><th>Onset</th><th>Notes</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {conditions.map((condition) => (
                        <tr key={condition.id}>
                          <td>
                            <div className="fw-semibold">{condition.label}</div>
                            <div className="text-muted small">
                              {condition.code ?? '—'}
                              {condition.severity ? ` · ${condition.severity}` : ''}
                              {condition.bodySite ? ` · ${condition.bodySite}` : ''}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${condition.category === 'physical_therapy' ? 'bg-info-subtle text-info-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                              {condition.category === 'physical_therapy' ? 'PT' : 'Medical'}
                            </span>
                          </td>
                          <td className="text-capitalize">
                            {condition.status}
                            {condition.verification && condition.verification.toLowerCase() !== 'confirmed' ? (
                              <div className="text-warning small">{condition.verification}</div>
                            ) : null}
                          </td>
                          <td>{condition.onset ? new Date(condition.onset).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="text-muted small">{condition.note ?? '—'}</td>
                          <td className="text-end">
                            {clinicalConditionWrite ? (
                              <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                                <form action={updateConditionStatusAction} className="d-inline-flex gap-1 align-items-center">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="conditionId" value={condition.id} />
                                  <input type="hidden" name="conditionVersionId" value={condition.versionId ?? ''} />
                                  <label className="visually-hidden" htmlFor={`conditionStatus-${condition.id}`}>Update status</label>
                                  <select
                                    id={`conditionStatus-${condition.id}`}
                                    name="conditionStatus"
                                    className="form-select form-select-sm w-auto"
                                    defaultValue={(CONDITION_STATUS_OPTIONS as readonly string[]).includes(condition.statusCode) ? condition.statusCode : 'active'}
                                  >
                                    {CONDITION_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status} className="text-capitalize">{status}</option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn btn-sm btn-outline-secondary">Update</button>
                                </form>
                                <form action={retireConditionAction} className="d-inline">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="conditionId" value={condition.id} />
                                  <input type="hidden" name="conditionVersionId" value={condition.versionId ?? ''} />
                                  <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                                </form>
                              </div>
                            ) : (
                              <span className="text-muted small">Read only</span>
                            )}
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

          {isTab('problems-risks') && (
          <div id="patient-allergies" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Allergies</h2>
              <span className="text-muted small">{allergies.length} records</span>
            </div>
            <div className="card-body">
              <form action={createAllergyAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <CodedTermPicker
                  domain="allergen"
                  labelInputName="allergen"
                  codeInputName="allergenCode"
                  title="Allergen"
                  placeholder="Type an allergen, then pick a match"
                  className="col-md-6"
                  helpCoded="Coded allergen — drug cross-reactivity screening enabled."
                  helpFree="Free text — set the category below; no cross-reactivity screening."
                  required
                />
                <div className="col-md-3">
                  <label htmlFor="allergyCategory" className="form-label">Category</label>
                  <select id="allergyCategory" name="allergyCategory" className="form-select" defaultValue="medication">
                    <option value="medication">Medication</option>
                    <option value="food">Food</option>
                    <option value="environment">Environment</option>
                    <option value="biologic">Biologic</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="allergySeverity" className="form-label">Severity</label>
                  <select id="allergySeverity" name="allergySeverity" className="form-select" defaultValue="">
                    <option value="">Unknown</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="allergyReaction" className="form-label">Reaction</label>
                  <input
                    id="allergyReaction"
                    name="allergyReaction"
                    type="text"
                    className="form-control"
                    placeholder="e.g. rash, anaphylaxis, angioedema"
                    autoComplete="off"
                    dir="auto"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="allergyNote" className="form-label">Notes</label>
                  <input
                    id="allergyNote"
                    name="allergyNote"
                    type="text"
                    className="form-control"
                    placeholder="Optional context"
                    autoComplete="off"
                    dir="auto"
                  />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Add allergy</button>
                </div>
              </form>

              {allergies.length === 0 && (
                <form action={recordNoKnownAllergiesAction} className="d-flex align-items-center gap-2 mb-3">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <button type="submit" className="btn btn-outline-secondary btn-sm">Record: No Known Allergies</button>
                  <span className="text-muted small">Confirms allergies were asked — distinct from an empty (unasked) list.</span>
                </form>
              )}
              {allergiesError && <div className="alert alert-warning" role="alert">Could not load allergies: {allergiesError}</div>}
              {!allergiesError && allergies.length === 0 && <div className="alert alert-info mb-0" role="alert">No allergies recorded yet.</div>}
              {!allergiesError && allergies.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Allergen</th><th>Severity</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {allergies.map((allergy) => (
                        <tr key={allergy.id}>
                          <td>
                            <div className="fw-semibold">{allergy.allergen}</div>
                            {allergy.note ? <div className="text-muted small">{allergy.note}</div> : null}
                          </td>
                          <td className="text-capitalize">{allergy.severity ?? '—'}</td>
                          <td className="text-capitalize">{allergy.status}</td>
                          <td className="text-end">
                            <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                              <form action={updateAllergyStatusAction} className="d-inline-flex gap-1 align-items-center">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="allergyId" value={allergy.id} />
                                <input type="hidden" name="allergyVersionId" value={allergy.versionId ?? ''} />
                                <label className="visually-hidden" htmlFor={`allergyStatus-${allergy.id}`}>Update status</label>
                                <select
                                  id={`allergyStatus-${allergy.id}`}
                                  name="allergyStatus"
                                  className="form-select form-select-sm w-auto"
                                  defaultValue={(ALLERGY_STATUS_OPTIONS as readonly string[]).includes(allergy.statusCode) ? allergy.statusCode : 'active'}
                                >
                                  {ALLERGY_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status} className="text-capitalize">{status}</option>
                                  ))}
                                </select>
                                <button type="submit" className="btn btn-sm btn-outline-secondary">Update</button>
                              </form>
                              <form action={retireAllergyAction} className="d-inline">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="allergyId" value={allergy.id} />
                                <input type="hidden" name="allergyVersionId" value={allergy.versionId ?? ''} />
                                <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                              </form>
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
    </>
  );
}
