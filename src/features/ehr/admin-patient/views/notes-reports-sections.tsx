import { reportCode, reportComponentText } from '../helpers';
import { createClinicalNoteDraftAction, amendClinicalNoteAction, createNursingReportAction, createPhysioReportAction, signClinicalNoteAction } from '../actions';
import { NURSING_STATUS_OPTIONS, PENDING_TASK_OPTIONS, NEXT_SHIFT_FOCUS_OPTIONS } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function NotesReportsSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    encounters,
    clinicalNotes,
    clinicalNotesError,
    careReports,
    careReportsError,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('notes-reports') && (
          <div className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Clinical notes</h2></div>
            <div className="card-body">
              <form action={createClinicalNoteDraftAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4"><label htmlFor="note-encounter" className="form-label">Linked visit</label><select id="note-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : encounter.id}</option>))}</select></div>
                <div className="col-md-4">
                  <label htmlFor="note-discipline" className="form-label">Discipline</label>
                  <select id="note-discipline" name="noteDiscipline" className="form-select" defaultValue="medical">
                    <option value="medical">Medical</option>
                    <option value="nursing">Nursing</option>
                    <option value="physiotherapy">Physiotherapy</option>
                  </select>
                </div>
                <div className="col-md-4"><label htmlFor="note-title" className="form-label">Title</label><input id="note-title" name="noteTitle" type="text" className="form-control" placeholder="Visit assessment" /></div>
                <div className="col-12"><label htmlFor="note-body" className="form-label">Note body</label><textarea id="note-body" name="noteBody" className="form-control" rows={4} placeholder="Clinical findings, plan, and follow up" dir="auto" required /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save draft note</button></div>
              </form>
            </div>
          </div>
          )}

          {isTab('notes-reports') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center"><h2 className="h6 mb-0">Notes timeline</h2><span className="text-muted small">{clinicalNotes.length} notes</span></div>
            <div className="card-body">
              {clinicalNotesError && <div className="alert alert-warning" role="alert">Could not load notes: {clinicalNotesError}</div>}
              {!clinicalNotesError && clinicalNotes.length === 0 && <div className="alert alert-info mb-0" role="alert">No notes recorded yet.</div>}
              {clinicalNotes.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Date</th><th>Title</th><th>Status</th><th>Author</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {clinicalNotes.map((note) => (
                        <tr key={note.id}>
                          <td>{new Date(note.date).toLocaleString('en-GB')}</td>
                          <td><div className="fw-semibold">{note.title}</div><div className="text-muted small">{note.body || '—'}</div></td>
                          <td className="text-capitalize">{note.status}</td>
                          <td>{note.author ?? '—'}</td>
                          <td className="text-end">
                            {note.status === 'preliminary' ? (
                              <form action={signClinicalNoteAction}>
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="compositionId" value={note.id} />
                                <input type="hidden" name="noteDiscipline" value={note.discipline ?? 'medical'} />
                                <input type="hidden" name="noteVersionId" value={note.versionId ?? ''} />
                                <button type="submit" className="btn btn-sm btn-outline-success">Sign off</button>
                              </form>
                            ) : (
                              <div className="d-grid gap-1">
                                <span className="badge text-bg-success">Signed</span>
                                <form action={amendClinicalNoteAction} className="d-grid gap-1">
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="sourceCompositionId" value={note.id} />
                                  <input type="hidden" name="noteDiscipline" value={note.discipline ?? 'medical'} />
                                  <input type="hidden" name="amendmentTitle" value={`Amendment: ${note.title}`} />
                                  <textarea name="amendmentBody" className="form-control form-control-sm" rows={2} placeholder="Addendum note" dir="auto" required />
                                  <button type="submit" className="btn btn-sm btn-outline-primary">Create addendum</button>
                                </form>
                              </div>
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

          {isTab('notes-reports') && (
          <div className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Nursing and physiotherapy reports</h2></div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-lg-6">
                  <h3 className="h6">Nursing daily report</h3>
                  <form action={createNursingReportAction} className="row g-2">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-12"><label htmlFor="nursing-encounter" className="form-label">Linked visit</label><select id="nursing-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                    <div className="col-12">
                      <label htmlFor="nursing-summary" className="form-label">Condition summary</label>
                      <select id="nursing-summary" name="conditionSummary" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        {NURSING_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="nursing-escalation" className="form-label">Escalation needed</label><select id="nursing-escalation" name="escalationNeeded" className="form-select" defaultValue=""><option value="">Not set</option><option value="yes">Yes</option><option value="no">No</option></select></div>
                    <div className="col-12">
                      <label htmlFor="nursing-followup" className="form-label">Follow-up plan</label>
                      <select id="nursing-followup" name="followUpPlan" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        {PENDING_TASK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="nursing-note" className="form-label">Clinical note</label><textarea id="nursing-note" name="noteBody" rows={3} className="form-control" dir="auto" required /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save nursing report</button></div>
                  </form>
                </div>

                <div className="col-lg-6">
                  <h3 className="h6">Physiotherapy session report</h3>
                  <form action={createPhysioReportAction} className="row g-2">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <div className="col-12"><label htmlFor="physio-encounter" className="form-label">Linked visit</label><select id="physio-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                    <div className="col-md-6"><label htmlFor="physio-template" className="form-label">Template</label><select id="physio-template" name="sessionTemplate" className="form-select" defaultValue="custom"><option value="post_op_knee">Post-op knee</option><option value="stroke_rehab">Stroke rehab</option><option value="low_back_pain">Low back pain</option><option value="geriatric_mobility">Geriatric mobility</option><option value="custom">Custom</option></select></div>
                    <div className="col-md-6"><label htmlFor="physio-session-number" className="form-label">Session number</label><input id="physio-session-number" name="sessionNumberLabel" className="form-control" placeholder="4 of 12" /></div>
                    <div className="col-12">
                      <label htmlFor="physio-subjective-function" className="form-label">Subjective function</label>
                      <select id="physio-subjective-function" name="subjectiveFunction" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Function improved since last session">Function improved since last session</option>
                        <option value="Function unchanged since last session">Function unchanged since last session</option>
                        <option value="Function declined since last session">Function declined since last session</option>
                        <option value="Patient reports easier transfers">Patient reports easier transfers</option>
                        <option value="Patient reports reduced walking tolerance">Patient reports reduced walking tolerance</option>
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="physio-objective-summary" className="form-label">Objective summary</label><textarea id="physio-objective-summary" name="objectiveSummary" rows={2} className="form-control" placeholder="ROM, balance, gait, or template-specific objective findings" dir="auto" /></div>
                    <div className="col-12">
                      <label htmlFor="physio-interventions" className="form-label">Interventions</label>
                      <select id="physio-interventions" name="interventions" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Therapeutic exercise and transfer training">Therapeutic exercise and transfer training</option>
                        <option value="Gait training and balance work">Gait training and balance work</option>
                        <option value="Range of motion and strengthening">Range of motion and strengthening</option>
                        <option value="Pain education and graded activity">Pain education and graded activity</option>
                        <option value="Family education and home safety review">Family education and home safety review</option>
                      </select>
                    </div>
                    <div className="col-6"><label htmlFor="physio-pain-before" className="form-label">Pain before</label><input id="physio-pain-before" name="painBefore" type="number" min="0" max="10" className="form-control" /></div>
                    <div className="col-6"><label htmlFor="physio-pain-after" className="form-label">Pain after</label><input id="physio-pain-after" name="painAfter" type="number" min="0" max="10" className="form-control" /></div>
                    <div className="col-12">
                      <label htmlFor="physio-response" className="form-label">Response summary</label>
                      <select id="physio-response" name="responseSummary" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Tolerated session well">Tolerated session well</option>
                        <option value="Tolerated with fatigue">Tolerated with fatigue</option>
                        <option value="Pain limited participation">Pain limited participation</option>
                        <option value="Required frequent rest breaks">Required frequent rest breaks</option>
                        <option value="Safety concern identified">Safety concern identified</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="physio-home-plan" className="form-label">Home plan</label>
                      <select id="physio-home-plan" name="homePlan" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        <option value="Continue current home exercise plan">Continue current home exercise plan</option>
                        <option value="Progress home exercise plan">Progress home exercise plan</option>
                        <option value="Hold exercises pending review">Hold exercises pending review</option>
                        <option value="Family to supervise mobility practice">Family to supervise mobility practice</option>
                        <option value="Home safety modifications recommended">Home safety modifications recommended</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="physio-next-focus" className="form-label">Next session focus</label>
                      <select id="physio-next-focus" name="nextSessionFocus" className="form-select" defaultValue="">
                        <option value="">Not set</option>
                        {NEXT_SHIFT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="col-12"><label htmlFor="physio-discharge-readiness" className="form-label">Discharge readiness</label><select id="physio-discharge-readiness" name="dischargeReadiness" className="form-select" defaultValue=""><option value="">Not set</option><option value="not_yet">Not yet</option><option value="one_to_two_sessions">1-2 sessions</option><option value="ready">Ready</option></select></div>
                    <div className="col-12"><label htmlFor="physio-note" className="form-label">Clinical note</label><textarea id="physio-note" name="noteBody" rows={3} className="form-control" dir="auto" required /></div>
                    <div className="col-12"><button type="submit" className="btn btn-primary">Save physio report</button></div>
                  </form>
                </div>
              </div>

              <hr className="my-4" />

              {careReportsError && <div className="alert alert-warning" role="alert">Could not load care reports: {careReportsError}</div>}
              {!careReportsError && careReports.length === 0 && <div className="alert alert-info mb-0" role="alert">No nursing or physio reports yet.</div>}
              {careReports.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Date</th><th>Type</th><th>Summary</th><th>Details</th><th>By</th></tr></thead>
                    <tbody>
                      {careReports.map((report) => {
                        const codeValue = reportCode(report);
                        const isNursing = codeValue === 'nursing-daily-report';
                        const isNursingHandoff = codeValue === 'nursing-shift-handoff';
                        const label = isNursing
                          ? 'Nursing'
                          : isNursingHandoff
                            ? 'Nursing Handoff'
                            : codeValue === 'physio-session-report'
                              ? 'Physio'
                              : codeValue;
                        const summary = isNursing
                          ? reportComponentText(report, 'condition-summary')
                          : isNursingHandoff
                            ? reportComponentText(report, 'patient-status-summary')
                            : reportComponentText(report, 'interventions');
                        const details = isNursing
                          ? reportComponentText(report, 'follow-up-plan')
                          : isNursingHandoff
                            ? [
                                `Shift ${reportComponentText(report, 'shift-start-at') ?? '—'} -> ${reportComponentText(report, 'shift-end-at') ?? '—'}`,
                                `Escalation: ${reportComponentText(report, 'escalation-status') ?? '—'}`,
                                `Next: ${reportComponentText(report, 'next-shift-focus') ?? '—'}`,
                              ].join(' | ')
                          : [
                              `Pain ${reportComponentText(report, 'pain-before') ?? '—'} -> ${reportComponentText(report, 'pain-after') ?? '—'}`,
                              reportComponentText(report, 'response-summary') ?? null,
                            ]
                              .filter(Boolean)
                              .join(' | ');

                        return (
                          <tr key={report.id}>
                            <td>{report.effectiveDateTime ? new Date(report.effectiveDateTime).toLocaleString('en-GB') : '—'}</td>
                            <td>{label}</td>
                            <td>{summary ?? report.note?.[0]?.text ?? '—'}</td>
                            <td>{details || '—'}</td>
                            <td>{report.performer?.[0]?.display ?? '—'}</td>
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
    </>
  );
}
