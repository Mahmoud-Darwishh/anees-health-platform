import { recordGlucoseReadingAction } from '../actions';
import type { AdminPatientViewContext } from '../view-context';
import {
  GLUCOSE_TIMINGS,
  GLUCOSE_MEALS,
  GLUCOSE_LOGBOOK_SLOTS,
  buildGlucoseLogbook,
  summarizeGlucoseReadings,
  type GlucoseCategory,
} from '@/lib/clinical/glucose-profile';
import { GLUCOSE_UNITS, formatGlucose, mgDlToMmolL } from '@/lib/clinical/glucose-units';

function cellClass(category: GlucoseCategory): string {
  switch (category) {
    case 'in_range':
      return 'table-success';
    case 'high':
      return 'table-warning';
    case 'low':
    case 'critical_low':
    case 'critical_high':
      return 'table-danger';
    default:
      return '';
  }
}

function timingLabel(value: string): string {
  return GLUCOSE_TIMINGS.find((option) => option.value === value)?.label ?? value;
}

function mealLabel(value: string | null): string {
  if (!value) return '—';
  return GLUCOSE_MEALS.find((option) => option.value === value)?.label ?? value;
}

export function GlucoseSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const { patient, encounters, glucoseReadings, glucoseReadingsError, isTab } = ctx;

  if (!isTab('measurements')) {
    return null;
  }

  const summary = summarizeGlucoseReadings(glucoseReadings);
  const logbook = buildGlucoseLogbook(glucoseReadings, 7);

  return (
    <>
      <div id="patient-glucose" className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0">Blood glucose profile</h2>
          <span className="text-muted small">{summary.count} readings · last 120 days</span>
        </div>
        <div className="card-body">
          {glucoseReadingsError && (
            <div className="alert alert-warning" role="alert">
              Could not load glucose readings: {glucoseReadingsError}
            </div>
          )}

          {!glucoseReadingsError && summary.count === 0 && (
            <div className="alert alert-info" role="alert">
              No glucose readings recorded yet. Add the first reading below.
            </div>
          )}

          {summary.count > 0 && (
            <>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Average</div>
                    <div className="fs-4 fw-semibold">
                      {summary.averageMgDl} <span className="fs-6 text-muted">mg/dL</span>
                    </div>
                    <div className="text-muted small">{summary.averageMmolL} mmol/L</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Est. HbA1c</div>
                    <div className="fs-4 fw-semibold">
                      {summary.estimatedHbA1c} <span className="fs-6 text-muted">%</span>
                    </div>
                    <div className="text-muted small">from mean glucose</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Time in range</div>
                    <div className="fs-4 fw-semibold text-success">{summary.timeInRangePct}%</div>
                    <div className="text-muted small">context-aware target</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Low events</div>
                    <div className={`fs-4 fw-semibold ${summary.lowCount > 0 ? 'text-danger' : ''}`}>
                      {summary.lowCount}
                    </div>
                    <div className="text-muted small">{summary.criticalCount} critical</div>
                  </div>
                </div>
              </div>

              <h3 className="h6 text-muted">Logbook</h3>
              <div className="table-responsive mb-2">
                <table className="table table-sm table-bordered align-middle text-center mb-0">
                  <thead>
                    <tr>
                      <th className="text-start">Day</th>
                      {GLUCOSE_LOGBOOK_SLOTS.map((slot) => (
                        <th key={slot.slot} className="small">
                          <div>{slot.meal}</div>
                          <div className="text-muted fw-normal">{slot.label}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logbook.map((day) => (
                      <tr key={day.date}>
                        <td className="text-start text-muted small">
                          {new Date(day.date).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        {GLUCOSE_LOGBOOK_SLOTS.map((slot) => {
                          const cell = day.cells[slot.slot];
                          return (
                            <td key={slot.slot} className={cell ? cellClass(cell.category) : ''}>
                              {cell ? (
                                <span
                                  className={cell.placedByClock ? 'fst-italic' : ''}
                                  title={cell.placedByClock ? 'Placed by time of day (no meal tag)' : undefined}
                                >
                                  {cell.valueMgDl}
                                  {cell.placedByClock ? '*' : ''}
                                </span>
                              ) : (
                                '·'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex flex-wrap gap-3 small text-muted">
                <span><span className="badge text-bg-success">&nbsp;</span> In range</span>
                <span><span className="badge text-bg-warning">&nbsp;</span> High</span>
                <span><span className="badge text-bg-danger">&nbsp;</span> Low / critical</span>
                <span><em>*</em> placed by time of day (no meal tag)</span>
                <span>Values in mg/dL. Targets are context-aware: pre-meal 80–130, post-meal &lt;180, low &lt;70.</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div id="patient-glucose-record" className="card bg-white">
        <div className="card-header">
          <h2 className="h6 mb-0">Record glucose reading</h2>
        </div>
        <div className="card-body">
          <form action={recordGlucoseReadingAction} className="row g-3">
            <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
            <div className="col-md-3">
              <label htmlFor="glucose-recorded-at" className="form-label">Recorded at</label>
              <input id="glucose-recorded-at" name="recordedAt" type="datetime-local" className="form-control" required />
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-timing" className="form-label">Timing context</label>
              <select id="glucose-timing" name="glucoseTiming" className="form-select" defaultValue="fasting" required>
                {GLUCOSE_TIMINGS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-meal" className="form-label">Meal <span className="text-muted">(if pre/post)</span></label>
              <select id="glucose-meal" name="glucoseMeal" className="form-select" defaultValue="">
                <option value="">None</option>
                {GLUCOSE_MEALS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-encounter" className="form-label">Linked visit</label>
              <select id="glucose-encounter" name="encounterId" className="form-select" defaultValue="">
                <option value="">None</option>
                {encounters.map((encounter) => (
                  <option key={encounter.id} value={encounter.id}>
                    {encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : encounter.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-value" className="form-label">Value</label>
              <input id="glucose-value" name="glucoseValue" type="number" step="0.1" min="0" className="form-control" required />
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-unit" className="form-label">Unit</label>
              <select id="glucose-unit" name="glucoseUnit" className="form-select" defaultValue="mg/dL">
                {GLUCOSE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-symptomatic" className="form-label">Symptomatic?</label>
              <select id="glucose-symptomatic" name="glucoseSymptomatic" className="form-select" defaultValue="">
                <option value="">Not noted</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="glucose-treatment" className="form-label">Treatment given</label>
              <input id="glucose-treatment" name="glucoseTreatment" type="text" className="form-control" placeholder="e.g. 15g fast carbs" />
            </div>
            <div className="col-12">
              <label htmlFor="glucose-note" className="form-label">Note</label>
              <textarea id="glucose-note" name="glucoseNote" className="form-control" rows={2} placeholder="Optional context" dir="auto" />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary">Save reading</button>
            </div>
          </form>
        </div>
      </div>

      {summary.count > 0 && (
        <div className="card bg-white">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h2 className="h6 mb-0">Recent glucose readings</h2>
            <span className="text-muted small">{glucoseReadings.length} rows</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Recorded</th>
                    <th>Value</th>
                    <th>Context</th>
                    <th>Meal</th>
                    <th>Flag</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {glucoseReadings.slice(0, 30).map((row) => (
                    <tr key={row.id ?? `${row.measuredAt}-${row.valueMgDl}`}>
                      <td>{new Date(row.measuredAt).toLocaleString('en-GB')}</td>
                      <td>
                        {formatGlucose(row.valueMgDl, 'mg/dL')} mg/dL
                        <span className="text-muted small"> ({mgDlToMmolL(row.valueMgDl)} mmol/L)</span>
                      </td>
                      <td>{timingLabel(row.timing)}</td>
                      <td>{mealLabel(row.meal)}</td>
                      <td>{row.interpretationCode ?? '—'}</td>
                      <td className="text-muted small">{row.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
