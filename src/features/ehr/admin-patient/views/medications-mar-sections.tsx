import { createMedicationAction, createMedicationAdministrationAction, updateMedicationStatusAction, retireMedicationAction, retireMedicationAdministrationAction } from '../actions';
import { NowDateTimeInput } from '@/features/ehr/components/NowDateTimeInput';
import { CodedTermPicker } from '@/features/ehr/components/CodedTermPicker';
import { MEDICATION_ROUTE_OPTIONS, MEDICATION_MANAGE_STATUS_OPTIONS, MEDICATION_DURATION_OPTIONS, MEDICATION_FREQUENCY_OPTIONS, MAR_REASON_OPTIONS } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function MedicationsMarSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    medications,
    medicationsError,
    medicationAdministrations,
    medicationAdministrationsError,
    medicationWrite,
    isTab,
    activeMedications,
  } = ctx;

  return (
    <>
          {isTab('medications-mar') && (
          <div id="patient-medications" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Medications</h2>
              <span className="text-muted small">{medications.length} records</span>
            </div>
            <div className="card-body">
              {medicationWrite ? (
                <details className="mb-3">
                  <summary className="fw-semibold">Add medication order</summary>
                  <form action={createMedicationAction} className="row g-3 mt-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <CodedTermPicker
                      domain="drug"
                      labelInputName="medicationName"
                      codeInputName="medicationRxnorm"
                      title="Medication (RxNorm)"
                      placeholder="Type a drug name or brand, then pick a match"
                      className="col-md-6"
                      helpCoded="Coded drug — interaction + allergy screening enabled."
                      helpFree="Not in formulary — saves as free text, without safety screening."
                      required
                    />
                    <div className="col-md-3">
                      <label htmlFor="startDate" className="form-label">Start date</label>
                      <input id="startDate" name="startDate" type="date" className="form-control" />
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="medicationDurationDays" className="form-label">Duration</label>
                      <select id="medicationDurationDays" name="medicationDurationDays" className="form-select" defaultValue="">
                        {MEDICATION_DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="form-text">End date is calculated from the start date.</div>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="dosageText" className="form-label">Dosage</label>
                      <input id="dosageText" name="dosageText" className="form-control" placeholder="5 mg once daily" />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="routeText" className="form-label">Route</label>
                      <select id="routeText" name="routeText" className="form-select" defaultValue="">
                        <option value="">Not specified</option>
                        {MEDICATION_ROUTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="frequencyText" className="form-label">Frequency</label>
                      <select id="frequencyText" name="frequencyText" className="form-select" defaultValue="">
                        <option value="">Not specified</option>
                        {MEDICATION_FREQUENCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="medicationNote" className="form-label">Notes</label>
                      <textarea id="medicationNote" name="medicationNote" className="form-control" rows={2} placeholder="Medication context or monitoring notes" dir="auto" />
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="acknowledgeInteractions" name="acknowledgeInteractions" value="on" />
                        <label className="form-check-label" htmlFor="acknowledgeInteractions">
                          I reviewed the interaction / allergy warnings (only required when the safety check flags an issue).
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Add medication</button>
                    </div>
                  </form>
                </details>
              ) : (
                <div className="alert alert-info">Medication authoring is limited to doctors, admins, and super admins. You still have read access.</div>
              )}
              {medicationsError && <div className="alert alert-warning" role="alert">Could not load medications: {medicationsError}</div>}
              {!medicationsError && medications.length === 0 && <div className="alert alert-info mb-0" role="alert">No medications recorded yet.</div>}
              {!medicationsError && medications.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Medication</th><th>Status</th><th>Dosage</th><th>Start / End</th>{medicationWrite && <th className="text-end">Actions</th>}</tr></thead>
                    <tbody>
                      {medications.map((medication) => (
                        <tr key={medication.id}>
                          <td>
                            <div className="fw-semibold">{medication.medication}</div>
                            <div className="text-muted small">{medication.note ?? '—'}</div>
                          </td>
                          <td className="text-capitalize">{medication.status}</td>
                          <td>
                            <div>{medication.dosage ?? '—'}</div>
                            <div className="text-muted small">{medication.route ?? '—'} {medication.frequency ? `· ${medication.frequency}` : ''}</div>
                          </td>
                          <td className="text-muted small">{medication.start ? new Date(medication.start).toLocaleDateString('en-GB') : '—'} {medication.end ? `→ ${new Date(medication.end).toLocaleDateString('en-GB')}` : ''}</td>
                          {medicationWrite && (
                            <td className="text-end">
                              <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center">
                                <form action={updateMedicationStatusAction} className="d-inline-flex gap-1 align-items-center">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="medicationId" value={medication.id} />
                                  <input type="hidden" name="medicationVersionId" value={medication.versionId ?? ''} />
                                  <label className="visually-hidden" htmlFor={`medicationStatus-${medication.id}`}>Update status</label>
                                  <select
                                    id={`medicationStatus-${medication.id}`}
                                    name="medicationManageStatus"
                                    className="form-select form-select-sm w-auto text-capitalize"
                                    defaultValue={(MEDICATION_MANAGE_STATUS_OPTIONS as readonly string[]).includes(medication.status) ? medication.status : 'active'}
                                  >
                                    {MEDICATION_MANAGE_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status} className="text-capitalize">{status}</option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn btn-sm btn-outline-secondary">Update</button>
                                </form>
                                <form action={retireMedicationAction} className="d-inline">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="medicationId" value={medication.id} />
                                  <input type="hidden" name="medicationVersionId" value={medication.versionId ?? ''} />
                                  <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                                </form>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('medications-mar') && (
          <div id="patient-mar" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Medication Administration Record (MAR)</h2>
              <span className="text-muted small">{medicationAdministrations.length} entries</span>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="h6 mb-0">Quick MAR checklist</h3>
                  <span className="text-muted small">{activeMedications.length} active medications</span>
                </div>
                <p className="text-muted small">Time defaults to now and can be edited if a dose was given earlier or recorded late.</p>
                {activeMedications.length === 0 ? (
                  <div className="alert alert-info mb-0" role="alert">No active medications are available for checklist MAR. Add or activate medications first.</div>
                ) : (
                  <div className="list-group">
                    {activeMedications.map((medication) => (
                      <form key={medication.id} action={createMedicationAdministrationAction} className="list-group-item">
                        <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                        <input type="hidden" name="medicationStatementId" value={medication.id} />
                        <input type="hidden" name="medicationName" value={medication.medication} />
                        <div className="row g-2 align-items-end">
                          <div className="col-lg-5">
                            <div className="fw-semibold">{medication.medication}</div>
                            <div className="small text-muted">
                              {medication.dosage ?? 'Dose not specified'}
                              {medication.route ? ` / ${medication.route}` : ''}
                              {medication.frequency ? ` / ${medication.frequency}` : ''}
                            </div>
                          </div>
                          <div className="col-sm-4 col-lg-2">
                            <label htmlFor={`mar-check-status-${medication.id}`} className="form-label">Outcome</label>
                            <select id={`mar-check-status-${medication.id}`} name="administrationStatus" className="form-select form-select-sm" defaultValue="given">
                              <option value="given">Given</option>
                              <option value="refused">Refused</option>
                              <option value="held">Held</option>
                            </select>
                          </div>
                          <div className="col-sm-5 col-lg-3">
                            <label htmlFor={`mar-check-time-${medication.id}`} className="form-label">Date &amp; time</label>
                            <NowDateTimeInput id={`mar-check-time-${medication.id}`} name="administeredAt" className="form-control form-control-sm" />
                          </div>
                          <div className="col-sm-3 col-lg-2 d-grid">
                            <label className="form-label d-none d-lg-block">&nbsp;</label>
                            <button type="submit" className="btn btn-sm btn-primary">Save</button>
                          </div>
                        </div>
                      </form>
                    ))}
                  </div>
                )}
              </div>

              <details className="mb-3">
                <summary className="fw-semibold">Ad hoc / PRN dose (not in the list above)</summary>
              <form action={createMedicationAdministrationAction} className="row g-3 mb-3 mt-1">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-12">
                  <p className="text-muted small mb-0">For as-needed (PRN) or one-off medications that are not on the active list above.</p>
                </div>
                <div className="col-md-5">
                  <label htmlFor="mar-medication-name" className="form-label">Medication name</label>
                  <input
                    id="mar-medication-name"
                    name="medicationName"
                    type="text"
                    className="form-control"
                    placeholder="Type medication (free text)"
                    list="common-medications"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="mar-status" className="form-label">Outcome</label>
                  <select id="mar-status" name="administrationStatus" className="form-select" defaultValue="given">
                    <option value="given">Given</option>
                    <option value="refused">Refused</option>
                    <option value="held">Held</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="mar-administered-at" className="form-label">Date &amp; time</label>
                  <NowDateTimeInput id="mar-administered-at" name="administeredAt" className="form-control" />
                  <div className="form-text">Defaults to now; edit if recording a past dose.</div>
                </div>
                <div className="col-md-6">
                  <label htmlFor="mar-reason" className="form-label">Reason (if refused/held)</label>
                  <select id="mar-reason" name="administrationReason" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {MAR_REASON_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="mar-note" className="form-label">Notes</label>
                  <input id="mar-note" name="administrationNote" className="form-control" placeholder="Optional" dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Save MAR entry</button>
                </div>
              </form>
              </details>

              {medicationAdministrationsError && <div className="alert alert-warning" role="alert">Could not load MAR records: {medicationAdministrationsError}</div>}
              {!medicationAdministrationsError && medicationAdministrations.length === 0 && <div className="alert alert-info mb-0" role="alert">No MAR records yet.</div>}
              {!medicationAdministrationsError && medicationAdministrations.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Medication</th><th>Outcome</th><th>Administered</th><th>Recorded by</th><th>Reason/Note</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                      {medicationAdministrations.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.medication}</td>
                          <td className="text-capitalize">{entry.status}</td>
                          <td>{entry.administeredAt ? new Date(entry.administeredAt).toLocaleString('en-GB') : '—'}</td>
                          <td>{entry.recordedBy ?? '—'}</td>
                          <td className="text-muted small">{entry.reason ?? entry.note ?? '—'}</td>
                          <td className="text-end">
                            <form action={retireMedicationAdministrationAction} className="d-inline">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="administrationId" value={entry.id} />
                              <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                            </form>
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
