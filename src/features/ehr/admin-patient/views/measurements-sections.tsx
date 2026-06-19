import { createAssessmentAction, recordVitalsAction } from '../actions';
import { listInstruments } from '@/features/ehr/catalogs/assessment-instruments';
import { VitalInput } from '@/features/ehr/components/VitalInput';
import { NURSING_VITAL_THRESHOLDS as VT } from '@/lib/config/nursing-ops-policy';
import type { AdminPatientViewContext } from '../view-context';

export function MeasurementsSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    encounters,
    vitals,
    vitalsError,
    assessments,
    assessmentsError,
    measurementsWrite,
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
              {measurementsWrite && (
              <form action={createAssessmentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-5">
                  <label htmlFor="assessmentInstrument" className="form-label">Validated instrument</label>
                  <select id="assessmentInstrument" name="assessmentInstrument" className="form-select" defaultValue="">
                    <option value="">Other (free text)</option>
                    {listInstruments().map((instrument) => (
                      <option key={instrument.key} value={instrument.key}>
                        {instrument.label} ({instrument.min}–{instrument.max})
                      </option>
                    ))}
                  </select>
                  <div className="form-text">Pick an instrument for automatic scoring + risk banding, or “Other” for a free-text note.</div>
                </div>
                <div className="col-md-4">
                  <label htmlFor="assessmentTitle" className="form-label">Title (for “Other”)</label>
                  <input id="assessmentTitle" name="assessmentTitle" type="text" className="form-control" placeholder="e.g. ADL functional review" autoComplete="off" dir="auto" />
                </div>
                <div className="col-md-3">
                  <label htmlFor="assessmentType" className="form-label">Type (for “Other”)</label>
                  <select id="assessmentType" name="assessmentType" className="form-select" defaultValue="mobility">
                    <option value="functional">Functional</option>
                    <option value="mobility">Mobility</option>
                    <option value="pain">Pain</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-3"><label htmlFor="assessmentScore" className="form-label">Score</label><input id="assessmentScore" name="assessmentScore" type="number" step="any" className="form-control" /><div className="form-text">Required for instruments.</div></div>
                <div className="col-md-3"><label htmlFor="assessmentEncounterId" className="form-label">Visit</label><select id="assessmentEncounterId" name="assessmentEncounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                <div className="col-12">
                  <label htmlFor="assessmentSummary" className="form-label">Finding / summary</label>
                  <input id="assessmentSummary" name="assessmentSummary" type="text" className="form-control" placeholder="Clinical finding for this assessment" required autoComplete="off" dir="auto" />
                </div>
                <div className="col-12"><label htmlFor="assessmentNote" className="form-label">Notes</label><textarea id="assessmentNote" name="assessmentNote" className="form-control" rows={2} placeholder="Optional follow-up details" dir="auto" /></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Save assessment</button></div>
              </form>
              )}

              {assessmentsError && <div className="alert alert-warning" role="alert">Could not load assessments: {assessmentsError}</div>}
              {!assessmentsError && assessments.length === 0 && <div className="alert alert-info mb-0" role="alert">No assessments recorded yet.</div>}
              {!assessmentsError && assessments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Title</th><th>Type</th><th>Score</th><th>Risk band</th><th>Summary</th></tr></thead>
                    <tbody>
                      {assessments.map((assessment) => (
                        <tr key={assessment.id}>
                          <td>
                            <div className="fw-semibold">{assessment.title}</div>
                            <div className="text-muted small">{assessment.author ?? '—'}</div>
                          </td>
                          <td className="text-capitalize">{assessment.type}</td>
                          <td>
                            {assessment.score ?? '—'}
                            {assessment.score != null && assessment.unit && assessment.unit !== '{score}' ? ` ${assessment.unit}` : ''}
                          </td>
                          <td>
                            {assessment.band ? (
                              <span className={`badge ${assessment.severity === 'high' ? 'bg-danger' : assessment.severity === 'moderate' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                {assessment.band}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
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

          {isTab('measurements') && measurementsWrite && (
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
                <VitalInput name="systolicBp" label="Systolic" unit="mmHg" warnMin={VT.systolicBp.min} warnMax={VT.systolicBp.max} />
                <VitalInput name="diastolicBp" label="Diastolic" unit="mmHg" warnMin={VT.diastolicBp.min} warnMax={VT.diastolicBp.max} />
                <VitalInput name="heartRate" label="HR" unit="bpm" warnMin={VT.heartRate.min} warnMax={VT.heartRate.max} />
                <VitalInput name="respiratoryRate" label="Resp rate" unit="/min" warnMin={VT.respiratoryRate.min} warnMax={VT.respiratoryRate.max} />
                <VitalInput name="spo2Pct" label="SpO2" unit="%" warnMin={VT.spo2Pct.min} warnMax={VT.spo2Pct.max} />
                <VitalInput name="temperatureC" label="Temp" unit="°C" step="0.1" warnMin={VT.temperatureC.min} warnMax={VT.temperatureC.max} />
                <VitalInput name="weightKg" label="Weight" unit="kg" step="0.1" />
                <VitalInput name="heightCm" label="Height" unit="cm" step="0.1" hint="With weight, BMI is auto-computed." />
                <VitalInput name="glucoseMgDl" label="Glucose" unit="mg/dL" warnMin={VT.glucoseMgDl.min} warnMax={VT.glucoseMgDl.max} hint="Point-of-care (LOINC 2339-0). For monitoring, use the Glucose Profile below." />
                <VitalInput name="painScore" label="Pain" unit="0–10" warnMax={VT.painScore.max} />
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
                    <thead><tr><th>Recorded</th><th>BP</th><th>HR</th><th>Resp</th><th>SpO2</th><th>Temp</th><th>Wt / Ht</th><th>BMI</th><th>Glucose</th><th>Pain</th></tr></thead>
                    <tbody>
                      {vitals.map((row, index) => {
                        const fc = (key: keyof typeof row.flags) => (row.flags[key] ? 'text-danger fw-semibold' : '');
                        const bpFlag = row.flags.systolicBp || row.flags.diastolicBp ? 'text-danger fw-semibold' : '';
                        return (
                          <tr key={`${row.measuredAt}-${index}`} title="Abnormal values are highlighted against the nursing-ops thresholds.">
                            <td>{new Date(row.measuredAt).toLocaleString('en-GB')}</td>
                            <td className={bpFlag}>{row.systolicBp && row.diastolicBp ? `${row.systolicBp}/${row.diastolicBp}` : '—'}</td>
                            <td className={fc('heartRate')}>{row.heartRate ?? '—'}</td>
                            <td className={fc('respiratoryRate')}>{row.respiratoryRate ?? '—'}</td>
                            <td className={fc('spo2Pct')}>{row.spo2Pct ?? '—'}</td>
                            <td className={fc('temperatureC')}>{row.temperatureC ?? '—'}</td>
                            <td>{row.weightKg ?? '—'}{row.heightCm ? ` / ${row.heightCm}` : ''}</td>
                            <td className={fc('bmi')}>{row.bmi ?? '—'}</td>
                            <td className={fc('glucoseMgDl')}>{row.glucoseMgDl ?? '—'}</td>
                            <td className={fc('painScore')}>{row.painScore ?? '—'}</td>
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
