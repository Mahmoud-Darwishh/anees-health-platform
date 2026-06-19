import { createDiagnosticReportAction, createLabOrderAction, addLabResultAction, createNursingShiftHandoffAction } from '../actions';
import { NursingHandoffLocationCapture } from '../NursingHandoffLocationCapture';
import { TerminologyTextField } from '@/features/ehr/components/TerminologyTextField';
import { CodedTermPicker } from '@/features/ehr/components/CodedTermPicker';
import { NURSING_STATUS_OPTIONS, PENDING_TASK_OPTIONS, MEDICATION_SAFETY_OPTIONS, NEXT_SHIFT_FOCUS_OPTIONS } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function LabsSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    encounters,
    labOrders,
    labOrdersError,
    labResults,
    labResultsError,
    labResultObservations,
    labResultObservationsError,
    nursingShiftHandoffWrite,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('labs') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Labs and imaging</h2>
              <span className="text-muted small">{labOrders.length} orders · {labResults.length} results</span>
            </div>
            <div className="card-body">
              <div className="row g-4 mb-3">
                <div className="col-lg-6">
                  <h3 className="h6">New order</h3>
                  <form action={createLabOrderAction} className="row g-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-md-6">
                      <TerminologyTextField
                        domain="lab-order"
                        name="labOrderTitle"
                        label="Order title"
                        placeholder="Type lab or imaging order"
                        required
                      />
                    </div>
                    <div className="col-md-3"><label htmlFor="labOrderCategory" className="form-label">Category</label><select id="labOrderCategory" name="labOrderCategory" className="form-select" defaultValue="lab"><option value="lab">Lab</option><option value="imaging">Imaging</option><option value="other">Other</option></select></div>
                    <div className="col-md-3"><label htmlFor="labOrderDate" className="form-label">Requested on</label><input id="labOrderDate" name="labOrderDate" type="date" className="form-control" /></div>
                    <div className="col-md-6"><label htmlFor="labOrderCode" className="form-label">Code</label><input id="labOrderCode" name="labOrderCode" className="form-control" placeholder="CBC" /></div>
                    <div className="col-12"><label htmlFor="labOrderNote" className="form-label">Notes</label><textarea id="labOrderNote" name="labOrderNote" className="form-control" rows={2} dir="auto" /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save lab order</button></div>
                  </form>
                </div>

                <div className="col-lg-6">
                  <h3 className="h6">New result</h3>
                  <form action={createDiagnosticReportAction} className="row g-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-md-6">
                      <TerminologyTextField
                        domain="diagnostic-report"
                        name="diagnosticTitle"
                        label="Report title"
                        placeholder="Type diagnostic report title"
                        required
                      />
                    </div>
                    <div className="col-md-3"><label htmlFor="diagnosticCategory" className="form-label">Category</label><select id="diagnosticCategory" name="diagnosticCategory" className="form-select" defaultValue="lab"><option value="lab">Lab</option><option value="imaging">Imaging</option><option value="other">Other</option></select></div>
                    <div className="col-md-3"><label htmlFor="diagnosticStatus" className="form-label">Status</label><select id="diagnosticStatus" name="diagnosticStatus" className="form-select" defaultValue="final"><option value="preliminary">Preliminary</option><option value="final">Final</option><option value="amended">Amended</option><option value="corrected">Corrected</option><option value="appended">Appended</option></select></div>
                    <div className="col-md-4"><label htmlFor="diagnosticIssuedOn" className="form-label">Issued on</label><input id="diagnosticIssuedOn" name="diagnosticIssuedOn" type="date" className="form-control" /></div>
                    <div className="col-md-4"><label htmlFor="diagnosticEffectiveOn" className="form-label">Effective on</label><input id="diagnosticEffectiveOn" name="diagnosticEffectiveOn" type="date" className="form-control" /></div>
                    <div className="col-md-4">
                      <label htmlFor="linkedLabOrderId" className="form-label">Linked order</label>
                      <select id="linkedLabOrderId" name="linkedLabOrderId" className="form-select" defaultValue="">
                        <option value="">None</option>
                        {labOrders.map((order) => (
                          <option key={order.id} value={order.id}>{order.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="diagnosticConclusion" className="form-label">Conclusion</label><textarea id="diagnosticConclusion" name="diagnosticConclusion" className="form-control" rows={2} dir="auto" /></div>
                    <div className="col-12"><label htmlFor="diagnosticNote" className="form-label">Notes</label><textarea id="diagnosticNote" name="diagnosticNote" className="form-control" rows={2} dir="auto" /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save result</button></div>
                  </form>
                </div>
              </div>

              <div className="mb-3">
                <h3 className="h6">Add result value (coded)</h3>
                <p className="small text-muted mb-2">Records a discrete LOINC-coded value with a reference range + automatic abnormal flag.</p>
                <form action={addLabResultAction} className="row g-3">
                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                  <CodedTermPicker
                    domain="lab-analyte"
                    labelInputName="analyteLabel"
                    codeInputName="analyteKey"
                    title="Analyte"
                    placeholder="Type an analyte (e.g. hemoglobin, potassium, ALT)"
                    className="col-md-4"
                    helpCoded="Coded — LOINC + reference range + abnormal flag applied."
                    helpFree="Pick a listed analyte to store a discrete coded result."
                    required
                  />
                  <div className="col-md-2"><label htmlFor="labResultValue" className="form-label">Value</label><input id="labResultValue" name="labResultValue" type="number" step="any" className="form-control" required /></div>
                  <div className="col-md-3">
                    <label htmlFor="addResultReport" className="form-label">Link to report</label>
                    <select id="addResultReport" name="diagnosticReportId" className="form-select" defaultValue="">
                      <option value="">None</option>
                      {labResults.map((report) => (<option key={report.id} value={report.id}>{report.title}</option>))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="addResultOrder" className="form-label">Based on order</label>
                    <select id="addResultOrder" name="basedOnOrderId" className="form-select" defaultValue="">
                      <option value="">None</option>
                      {labOrders.map((order) => (<option key={order.id} value={order.id}>{order.title}</option>))}
                    </select>
                  </div>
                  <div className="col-12"><button type="submit" className="btn btn-outline-primary">Add result value</button></div>
                </form>

                {labResultObservationsError && <div className="alert alert-warning mt-2" role="alert">Could not load result values: {labResultObservationsError}</div>}
                {!labResultObservationsError && labResultObservations.length > 0 && (
                  <div className="table-responsive mt-3">
                    <table className="table table-sm align-middle mb-0">
                      <thead><tr><th>Analyte</th><th>Value</th><th>Reference</th><th>Flag</th><th>Date</th></tr></thead>
                      <tbody>
                        {labResultObservations.map((result) => (
                          <tr key={result.id}>
                            <td><div className="fw-semibold">{result.analyte}</div><div className="text-muted small">{result.loinc ?? '—'}</div></td>
                            <td className={result.flag && result.flag !== 'N' ? 'text-danger fw-semibold' : ''}>{result.value ?? '—'} {result.unit ?? ''}</td>
                            <td className="text-muted small">{result.referenceRange ?? '—'}</td>
                            <td>
                              {result.flag === 'H' ? <span className="badge bg-danger">High</span>
                                : result.flag === 'L' ? <span className="badge bg-primary">Low</span>
                                : result.flag === 'N' ? <span className="badge bg-success">Normal</span> : '—'}
                            </td>
                            <td className="text-muted small">{result.effective ? new Date(result.effective).toLocaleDateString('en-GB') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="row g-4">
                <div className="col-lg-6">
                  <h3 className="h6">Orders</h3>
                  {labOrdersError && <div className="alert alert-warning" role="alert">Could not load lab orders: {labOrdersError}</div>}
                  {!labOrdersError && labOrders.length === 0 && <div className="alert alert-info mb-0" role="alert">No lab or imaging orders yet.</div>}
                  {!labOrdersError && labOrders.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>Ordered</th></tr></thead>
                        <tbody>
                          {labOrders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <div className="fw-semibold">{order.title}</div>
                                <div className="text-muted small">{order.note ?? '—'}</div>
                              </td>
                              <td className="text-capitalize">{order.status}</td>
                              <td className="text-capitalize">{order.category ?? '—'}</td>
                              <td>{order.authoredOn ? new Date(order.authoredOn).toLocaleString('en-GB') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {nursingShiftHandoffWrite && (
                <div className="col-lg-6">
                  <h3 className="h6">Nursing shift handoff (end of shift)</h3>
                  <p className="small text-muted">Handoff is accepted only when submitted within 500m of the patient location.</p>
                  <form action={createNursingShiftHandoffAction} className="row g-2">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-12"><label htmlFor="handoff-encounter" className="form-label">Linked visit</label><select id="handoff-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                    <div className="col-md-6"><label htmlFor="handoff-start" className="form-label">Shift start</label><input id="handoff-start" name="shiftStartAt" type="datetime-local" className="form-control" required /></div>
                    <div className="col-md-6"><label htmlFor="handoff-end" className="form-label">Shift end</label><input id="handoff-end" name="shiftEndAt" type="datetime-local" className="form-control" required /></div>
                    <div className="col-12">
                      <label htmlFor="handoff-status" className="form-label">Patient status summary</label>
                      <select id="handoff-status" name="patientStatusSummary" className="form-select" defaultValue="Stable; no acute change this shift" required>
                        {NURSING_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="handoff-pending" className="form-label">Pending tasks summary</label>
                      <select id="handoff-pending" name="pendingTasksSummary" className="form-select" defaultValue="No pending clinical tasks" required>
                        {PENDING_TASK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="handoff-medsafety" className="form-label">Medication safety summary</label>
                      <select id="handoff-medsafety" name="medicationSafetySummary" className="form-select" defaultValue="No medication safety issues this shift" required>
                        {MEDICATION_SAFETY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="handoff-escalation" className="form-label">Escalation status</label><select id="handoff-escalation" name="escalationStatus" className="form-select" defaultValue="none"><option value="none">No active escalation</option><option value="active">Active escalation</option><option value="resolved">Escalation resolved this shift</option></select></div>
                    <div className="col-12">
                      <label htmlFor="handoff-next-focus" className="form-label">Next shift focus</label>
                      <select id="handoff-next-focus" name="nextShiftFocus" className="form-select" defaultValue="Routine monitoring" required>
                        {NEXT_SHIFT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="handoff-note" className="form-label">Clinical handoff note</label><textarea id="handoff-note" name="handoffNote" className="form-control" rows={3} required dir="auto" /></div>
                    <div className="col-12"><NursingHandoffLocationCapture /></div>
                    <div className="col-12">
                      <div className="form-check">
                        <input id="handoff-confirmed" name="handoffConfirmed" className="form-check-input" type="checkbox" value="true" required />
                        <label htmlFor="handoff-confirmed" className="form-check-label">
                          I confirm this handoff is complete and submitted on-site at patient location.
                        </label>
                      </div>
                    </div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Submit end-of-shift handoff</button></div>
                  </form>
                </div>
                )}

                <div className="col-lg-6">
                  <h3 className="h6">Results</h3>
                  {labResultsError && <div className="alert alert-warning" role="alert">Could not load diagnostic reports: {labResultsError}</div>}
                  {!labResultsError && labResults.length === 0 && <div className="alert alert-info mb-0" role="alert">No lab or imaging results yet.</div>}
                  {!labResultsError && labResults.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Title</th><th>Status</th><th>Conclusion</th><th>Date</th></tr></thead>
                        <tbody>
                          {labResults.map((result) => (
                            <tr key={result.id}>
                              <td>
                                <div className="fw-semibold">{result.title}</div>
                                <div className="text-muted small">{result.performer ?? '—'}</div>
                              </td>
                              <td className="text-capitalize">{result.status}</td>
                              <td>{result.conclusion ?? '—'}</td>
                              <td>{result.issued ? new Date(result.issued).toLocaleString('en-GB') : result.effective ? new Date(result.effective).toLocaleString('en-GB') : '—'}</td>
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
    </>
  );
}
