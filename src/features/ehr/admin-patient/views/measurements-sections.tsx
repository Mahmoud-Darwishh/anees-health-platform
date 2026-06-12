import { createAssessmentAction, recordVitalsAction } from '../actions';
import { ASSESSMENT_OPTIONS } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function MeasurementsSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    encounters,
    vitals,
    vitalsError,
    assessments,
    assessmentsError,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('measurements') && (
          <div id="patient-assessments" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Assessments</h2>
              <span className="text-muted small">{assessments.length} records</span>
            </div>
            <div className="card-body">
              <form action={createAssessmentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-5">
                  <label htmlFor="assessmentTitle" className="form-label">Assessment</label>
                  <select id="assessmentTitle" name="assessmentTitle" className="form-select" defaultValue="Mobility and gait review" required>
                    {ASSESSMENT_OPTIONS.map((option) => <option key={option.title} value={option.title}>{option.title}</option>)}
                    <option value="Other structured assessment">Other structured assessment</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="assessmentType" className="form-label">Type</label>
                  <select id="assessmentType" name="assessmentType" className="form-select" defaultValue="mobility">
                    <option value="functional">Functional</option>
                    <option value="mobility">Mobility</option>
                    <option value="pain">Pain</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-2"><label htmlFor="assessmentScore" className="form-label">Score</label><input id="assessmentScore" name="assessmentScore" type="number" step="1" min="0" max="100" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="assessmentEncounterId" className="form-label">Visit</label><select id="assessmentEncounterId" name="assessmentEncounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                <div className="col-12">
                  <label htmlFor="assessmentSummary" className="form-label">Structured finding</label>
                  <select id="assessmentSummary" name="assessmentSummary" className="form-select" defaultValue="Mobility reviewed with transfer and gait safety recommendations." required>
                    {ASSESSMENT_OPTIONS.map((option) => <option key={option.summary} value={option.summary}>{option.summary}</option>)}
                    <option value="Findings reviewed; see note for details.">Findings reviewed; see note for details.</option>
                  </select>
                </div>
                <div className="col-12"><label htmlFor="assessmentNote" className="form-label">Notes</label><textarea id="assessmentNote" name="assessmentNote" className="form-control" rows={2} placeholder="Optional follow-up details" dir="auto" /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save assessment</button></div>
              </form>

              {assessmentsError && <div className="alert alert-warning" role="alert">Could not load assessments: {assessmentsError}</div>}
              {!assessmentsError && assessments.length === 0 && <div className="alert alert-info mb-0" role="alert">No assessments recorded yet.</div>}
              {!assessmentsError && assessments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Title</th><th>Type</th><th>Score</th><th>Summary</th></tr></thead>
                    <tbody>
                      {assessments.map((assessment) => (
                        <tr key={assessment.id}>
                          <td>
                            <div className="fw-semibold">{assessment.title}</div>
                            <div className="text-muted small">{assessment.author ?? '—'}</div>
                          </td>
                          <td className="text-capitalize">{assessment.type}</td>
                          <td>{assessment.score ?? '—'}</td>
                          <td className="text-muted small">{assessment.summary ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('measurements') && (
          <div id="patient-vitals" className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Record vitals</h2>
            </div>
            <div className="card-body">
              <form action={recordVitalsAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="vitals-encounter" className="form-label">Linked visit</label>
                  <select id="vitals-encounter" name="encounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="vitals-recorded-at" className="form-label">Recorded at</label>
                  <input id="vitals-recorded-at" name="recordedAt" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-2"><label htmlFor="vitals-systolic" className="form-label">Systolic</label><input id="vitals-systolic" name="systolicBp" type="number" min="40" max="280" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-diastolic" className="form-label">Diastolic</label><input id="vitals-diastolic" name="diastolicBp" type="number" min="20" max="180" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-hr" className="form-label">HR</label><input id="vitals-hr" name="heartRate" type="number" min="20" max="240" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-spo2" className="form-label">SpO2</label><input id="vitals-spo2" name="spo2Pct" type="number" min="40" max="100" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-temp" className="form-label">Temp C</label><input id="vitals-temp" name="temperatureC" type="number" step="0.1" min="30" max="45" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-weight" className="form-label">Weight kg</label><input id="vitals-weight" name="weightKg" type="number" step="0.1" min="1" max="300" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-glucose" className="form-label">Glucose mg/dL</label><input id="vitals-glucose" name="glucoseMgDl" type="number" min="20" max="600" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="vitals-pain" className="form-label">Pain (0-10)</label><input id="vitals-pain" name="painScore" type="number" min="0" max="10" className="form-control" /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save vitals</button></div>
              </form>
            </div>
          </div>
          )}

          {isTab('measurements') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Recent vitals</h2>
              <span className="text-muted small">{vitals.length} rows</span>
            </div>
            <div className="card-body">
              {vitalsError && <div className="alert alert-warning" role="alert">Could not load vitals: {vitalsError}</div>}
              {!vitalsError && vitals.length === 0 && <div className="alert alert-info mb-0" role="alert">No vitals are recorded yet.</div>}
              {vitals.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Recorded</th><th>BP</th><th>HR</th><th>SpO2</th><th>Temp</th><th>Weight</th><th>Glucose</th><th>Pain</th></tr></thead>
                    <tbody>
                      {vitals.map((row, index) => (
                        <tr key={`${row.measuredAt}-${index}`}>
                          <td>{new Date(row.measuredAt).toLocaleString('en-GB')}</td>
                          <td>{row.systolicBp && row.diastolicBp ? `${row.systolicBp}/${row.diastolicBp}` : '—'}</td>
                          <td>{row.heartRate ?? '—'}</td>
                          <td>{row.spo2Pct ?? '—'}</td>
                          <td>{row.temperatureC ?? '—'}</td>
                          <td>{row.weightKg ?? '—'}</td>
                          <td>{row.glucoseMgDl ?? '—'}</td>
                          <td>{row.painScore ?? '—'}</td>
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
