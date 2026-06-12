import { createAllergyAction, createConditionAction, retireConditionAction, updateConditionStatusAction, retireAllergyAction, updateAllergyStatusAction } from '../actions';
import { ProblemCodeFields } from '@/features/ehr/components/ProblemCodeFields';
import { CONDITION_CONTEXT_OPTIONS, CONDITION_STATUS_OPTIONS, ALLERGY_STATUS_OPTIONS, COMMON_ALLERGENS } from '../view-helpers';
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
                            <div className="text-muted small">{condition.code ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`badge ${condition.category === 'physical_therapy' ? 'bg-info-subtle text-info-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                              {condition.category === 'physical_therapy' ? 'PT' : 'Medical'}
                            </span>
                          </td>
                          <td className="text-capitalize">{condition.status}</td>
                          <td>{condition.onset ? new Date(condition.onset).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="text-muted small">{condition.note ?? '—'}</td>
                          <td className="text-end">
                            {clinicalConditionWrite ? (
                              <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                                <form action={updateConditionStatusAction} className="d-inline-flex gap-1 align-items-center">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="conditionId" value={condition.id} />
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
                <div className="col-md-6">
                  <label htmlFor="allergen" className="form-label">Allergen</label>
                  <input
                    id="allergen"
                    name="allergen"
                    type="text"
                    className="form-control"
                    placeholder="Type allergen (free text)"
                    list="common-allergens"
                    autoComplete="off"
                    required
                  />
                  <datalist id="common-allergens">
                    {COMMON_ALLERGENS.map((allergen) => (
                      <option key={allergen} value={allergen} />
                    ))}
                  </datalist>
                </div>
                <div className="col-md-6">
                  <label htmlFor="allergySeverity" className="form-label">Severity</label>
                  <select id="allergySeverity" name="allergySeverity" className="form-select" defaultValue="">
                    <option value="">Unknown</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="allergyNote" className="form-label">Notes</label>
                  <input
                    id="allergyNote"
                    name="allergyNote"
                    type="text"
                    className="form-control"
                    placeholder="Type allergy note (free text)"
                    autoComplete="off"
                  />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Add allergy</button>
                </div>
              </form>
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
