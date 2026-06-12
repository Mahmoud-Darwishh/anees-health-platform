import { appointmentTypeLabel, encounterStatusLabel, encounterVisitType } from '../helpers';
import { createAppointmentAction, acknowledgeVisitAction, startTravelAction, markArrivedAction, checkInVisitAction, checkOutVisitAction, recordVisitAction } from '../actions';
import { VISIT_NOTE_OPTIONS, APPOINTMENT_NOTE_OPTIONS, appointmentStatusLabel, workflowStateLabel } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function VisitsEncountersSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    encounters,
    encountersError,
    assignableStaff,
    appointments,
    appointmentsError,
    localVisits,
    localVisitsError,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('visits-encounters') && (
          <div id="patient-visits" className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Record a visit</h2>
            </div>
            <div className="card-body">
              <form action={recordVisitAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />

                <div className="col-md-4">
                  <label htmlFor="visit-status" className="form-label">Status</label>
                  <select id="visit-status" name="status" className="form-select" defaultValue="planned" required>
                    <option value="planned">Scheduled</option>
                    <option value="in-progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label htmlFor="visit-type" className="form-label">Visit type</label>
                  <select id="visit-type" name="visitType" className="form-select" defaultValue="in_home" required>
                    <option value="in_home">In-home</option>
                    <option value="clinic">Clinic</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label htmlFor="visit-start-at" className="form-label">Date and time</label>
                  <input id="visit-start-at" name="startAt" type="datetime-local" className="form-control" required />
                </div>

                <div className="col-12">
                  <label htmlFor="visit-notes" className="form-label">Notes</label>
                  <select id="visit-notes" name="notes" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {VISIT_NOTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Save visit</button>
                </div>
              </form>

              <hr className="my-4" />

              <h3 className="h6">Visit workflow state machine (local schedule records)</h3>
              {localVisitsError && <div className="alert alert-warning" role="alert">Could not load workflow visits: {localVisitsError}</div>}
              {!localVisitsError && localVisits.length === 0 && (
                <div className="alert alert-info mb-0" role="alert">
                  No local scheduled visits found yet. Create visits from booking/ops flow to use workflow actions.
                </div>
              )}

              {!localVisitsError && localVisits.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Visit</th>
                        <th>State</th>
                        <th>Timeline</th>
                        <th>Check-in/out geo</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localVisits.map((visit) => (
                        <tr key={visit.id}>
                          <td>
                            <div className="fw-semibold">{visit.code}</div>
                            <div className="text-muted small">
                              {new Date(visit.scheduledDate).toLocaleDateString('en-GB')}
                              {visit.scheduledTime ? ` · ${visit.scheduledTime}` : ''}
                              {visit.providerName ? ` · ${visit.providerName}` : ''}
                            </div>
                          </td>
                          <td className="text-capitalize">{workflowStateLabel(visit.effectiveState)}</td>
                          <td className="small text-muted">
                            <div>Ack: {visit.acknowledgedAt ? new Date(visit.acknowledgedAt).toLocaleString('en-GB') : '—'}</div>
                            <div>En route: {visit.enRouteAt ? new Date(visit.enRouteAt).toLocaleString('en-GB') : '—'}</div>
                            <div>Arrived: {visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString('en-GB') : '—'}</div>
                            <div>Check-in: {visit.checkInAt ? new Date(visit.checkInAt).toLocaleString('en-GB') : '—'}</div>
                            <div>Check-out: {visit.checkOutAt ? new Date(visit.checkOutAt).toLocaleString('en-GB') : '—'}</div>
                            {visit.transitionTimeline.length > 0 && (
                              <div className="mt-1">
                                {visit.transitionTimeline.slice(0, 2).map((entry) => (
                                  <div key={`${visit.id}-${entry.toState}-${entry.createdAt}`}>
                                    {workflowStateLabel(entry.toState)} · {new Date(entry.createdAt).toLocaleString('en-GB')}
                                    {entry.isOverride ? ` · override (${entry.overrideMethod ?? 'manual'})` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="small text-muted">
                            <div>In: {visit.checkInLat && visit.checkInLng ? `${visit.checkInLat}, ${visit.checkInLng}` : '—'}</div>
                            <div>Out: {visit.checkOutLat && visit.checkOutLng ? `${visit.checkOutLat}, ${visit.checkOutLng}` : '—'}</div>
                            <div>Acc: {visit.checkInAccuracyM ?? '—'} m</div>
                          </td>
                          <td>
                            <div className="d-grid gap-2">
                              <form action={acknowledgeVisitAction} className="d-flex gap-2">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <input name="acknowledgedAt" type="datetime-local" className="form-control form-control-sm" required />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Acknowledge</button>
                              </form>

                              <form action={startTravelAction} className="d-flex gap-2">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <input name="enRouteAt" type="datetime-local" className="form-control form-control-sm" required />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Start travel</button>
                              </form>

                              <form action={markArrivedAction} className="d-flex gap-2">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <input name="arrivedAt" type="datetime-local" className="form-control form-control-sm" required />
                                <button type="submit" className="btn btn-sm btn-outline-primary">Mark arrived</button>
                              </form>

                              <form action={checkInVisitAction} className="row g-1">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <div className="col-12"><input name="checkInAt" type="datetime-local" className="form-control form-control-sm" required /></div>
                                <div className="col-6"><input name="checkInLatitude" className="form-control form-control-sm" placeholder="Lat" required /></div>
                                <div className="col-6"><input name="checkInLongitude" className="form-control form-control-sm" placeholder="Lng" required /></div>
                                <div className="col-12"><input name="checkInAccuracyMeters" className="form-control form-control-sm" placeholder="Accuracy meters" /></div>
                                <div className="col-12">
                                  <select name="geofenceOverrideMethod" className="form-select form-select-sm" defaultValue="">
                                    <option value="">No geofence override</option>
                                    <option value="med_ops">Med Ops unlock</option>
                                    <option value="code">Patient verification code</option>
                                    <option value="photo">Door photo proof</option>
                                  </select>
                                </div>
                                <div className="col-12"><input name="geofenceOverrideReason" className="form-control form-control-sm" placeholder="Override reason (required if geofence fails)" dir="auto" /></div>
                                <div className="col-12"><input name="geofenceOverrideMediaId" className="form-control form-control-sm" placeholder="Proof media id (optional)" dir="auto" /></div>
                                <div className="col-12"><button type="submit" className="btn btn-sm btn-outline-success w-100">Check in</button></div>
                              </form>

                              <form action={checkOutVisitAction} className="row g-1">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="visitId" value={visit.id} />
                                <div className="col-12"><input name="checkOutAt" type="datetime-local" className="form-control form-control-sm" required /></div>
                                <div className="col-6"><input name="checkOutLatitude" className="form-control form-control-sm" placeholder="Lat" required /></div>
                                <div className="col-6"><input name="checkOutLongitude" className="form-control form-control-sm" placeholder="Lng" required /></div>
                                <div className="col-12"><input name="checkOutAccuracyMeters" className="form-control form-control-sm" placeholder="Accuracy meters" /></div>
                                <div className="col-12"><button type="submit" className="btn btn-sm btn-outline-success w-100">Check out</button></div>
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

          {isTab('visits-encounters') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Visits</h2>
              <span className="text-muted small">{encounters.length} records</span>
            </div>
            <div className="card-body">
              {encountersError && <div className="alert alert-warning" role="alert">Could not load visits: {encountersError}</div>}
              {!encountersError && encounters.length === 0 && <div className="alert alert-info mb-0" role="alert">No visits are recorded yet.</div>}
              {encounters.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Recorded by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {encounters.map((encounter) => (
                        <tr key={encounter.id}>
                          <td>{encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : '—'}</td>
                          <td>{encounterStatusLabel(encounter.status)}</td>
                          <td className="text-capitalize">{encounterVisitType(encounter)}</td>
                          <td>{encounter.participant?.[0]?.individual?.display ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('visits-encounters') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Schedule appointment</h2>
            </div>
            <div className="card-body">
              <form action={createAppointmentAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="appointmentStart" className="form-label">Start</label>
                  <input id="appointmentStart" name="appointmentStart" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-3">
                  <label htmlFor="appointmentEnd" className="form-label">End</label>
                  <input id="appointmentEnd" name="appointmentEnd" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-2">
                  <label htmlFor="appointmentType" className="form-label">Type</label>
                  <select id="appointmentType" name="appointmentType" className="form-select" defaultValue="in_home">
                    <option value="in_home">In-home</option>
                    <option value="clinic">Clinic</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="appointmentOwnerStaffId" className="form-label">Assigned clinician</label>
                  <select id="appointmentOwnerStaffId" name="appointmentOwnerStaffId" className="form-select" defaultValue="">
                    <option value="">Not assigned</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {staff.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="appointmentNote" className="form-label">Visit note</label>
                  <select id="appointmentNote" name="appointmentNote" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {APPOINTMENT_NOTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Schedule appointment</button>
                </div>
              </form>
            </div>
          </div>
          )}

          {isTab('visits-encounters') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Appointment timeline</h2>
              <span className="text-muted small">{appointments.length} appointments</span>
            </div>
            <div className="card-body">
              {appointmentsError && <div className="alert alert-warning" role="alert">Could not load appointments: {appointmentsError}</div>}
              {!appointmentsError && appointments.length === 0 && <div className="alert alert-info mb-0" role="alert">No appointments scheduled yet.</div>}
              {!appointmentsError && appointments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Start</th><th>End</th><th>Status</th><th>Type</th><th>Assigned</th><th>Notes</th></tr></thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td>{appointment.start ? new Date(appointment.start).toLocaleString('en-GB') : '—'}</td>
                          <td>{appointment.end ? new Date(appointment.end).toLocaleString('en-GB') : '—'}</td>
                          <td>{appointmentStatusLabel(appointment.status)}</td>
                          <td>{appointmentTypeLabel(appointment.type)}</td>
                          <td>{appointment.assignedTo ?? '—'}</td>
                          <td className="text-muted small">{appointment.description ?? '—'}</td>
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
