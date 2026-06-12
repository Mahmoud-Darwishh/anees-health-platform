import { taskDueDate, taskPriorityLabel, taskStatusLabel, taskTitle } from '../helpers';
import { createCareTaskAction, createCommunicationAction, createEscalationAction, createNurseShiftAssignmentAction, acknowledgeIncomingNurseAction, createIncidentReportAction, runEscalationSlaSweepAction, updatePatientGeoPolicyAction, updateCareTaskStatusAction } from '../actions';
import { NEXT_SHIFT_FOCUS_OPTIONS, TASK_TITLE_OPTIONS, TASK_DESCRIPTION_OPTIONS, INCIDENT_ACTION_OPTIONS, COMMUNICATION_MESSAGE_OPTIONS, ESCALATION_TITLE_OPTIONS, ESCALATION_SUMMARY_OPTIONS, TEMPORARILY_AWAY_OPTIONS, communicationCategoryLabel } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function OrdersTasksSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    localPatient,
    encounters,
    assignableStaff,
    tasks,
    tasksError,
    communications,
    communicationsError,
    nurseShiftAssignments,
    nurseShiftAssignmentsError,
    isTab,
    escalationTasks,
  } = ctx;

  return (
    <>
          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Incident / Near-miss report</h2>
              <span className="text-muted small">Safety event capture</span>
            </div>
            <div className="card-body">
              <form action={createIncidentReportAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="incidentType" className="form-label">Type</label>
                  <select id="incidentType" name="incidentType" className="form-select" defaultValue="near_miss">
                    <option value="fall">Fall</option>
                    <option value="med_error">Medication error</option>
                    <option value="pressure_injury">Pressure injury</option>
                    <option value="equipment_failure">Equipment failure</option>
                    <option value="near_miss">Near miss</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="incidentSeverity" className="form-label">Severity</label>
                  <select id="incidentSeverity" name="incidentSeverity" className="form-select" defaultValue="urgent">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="asap">ASAP</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="incidentEncounterId" className="form-label">Related visit</label>
                  <select id="incidentEncounterId" name="encounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <div className="form-check">
                    <input id="incidentEscalationNeeded" name="incidentEscalationNeeded" type="checkbox" className="form-check-input" value="true" />
                    <label htmlFor="incidentEscalationNeeded" className="form-check-label">Auto-escalate now</label>
                  </div>
                </div>
                <div className="col-12">
                  <label htmlFor="incidentSummary" className="form-label">What happened</label>
                  <textarea id="incidentSummary" name="incidentSummary" rows={3} className="form-control" required dir="auto" />
                </div>
                <div className="col-12">
                  <label htmlFor="incidentActionsTaken" className="form-label">Immediate actions taken</label>
                  <select id="incidentActionsTaken" name="incidentActionsTaken" className="form-select" defaultValue="">
                    <option value="">No action selected</option>
                    {INCIDENT_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Submit incident report</button>
                </div>
              </form>
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Shift roster and acknowledgment</h2>
              <span className="text-muted small">{nurseShiftAssignments.length} assignments</span>
            </div>
            <div className="card-body d-grid gap-3">
              <form action={createNurseShiftAssignmentAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="primaryNurseStaffId" className="form-label">Primary nurse</label>
                  <select id="primaryNurseStaffId" name="primaryNurseStaffId" className="form-select" defaultValue="" required>
                    <option value="" disabled>Select nurse...</option>
                    {assignableStaff.filter((staff) => staff.role === 'nurse').map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="shiftStartAt" className="form-label">Shift start</label>
                  <input id="shiftStartAt" name="shiftStartAt" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-3">
                  <label htmlFor="shiftEndAt" className="form-label">Shift end</label>
                  <input id="shiftEndAt" name="shiftEndAt" type="datetime-local" className="form-control" required />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button type="submit" className="btn btn-outline-primary w-100">Add shift</button>
                </div>
                <div className="col-12">
                  <label htmlFor="shiftNotes" className="form-label">Notes</label>
                  <select id="shiftNotes" name="shiftNotes" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {NEXT_SHIFT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </form>

              {nurseShiftAssignmentsError && <div className="alert alert-warning" role="alert">Could not load shift assignments: {nurseShiftAssignmentsError}</div>}
              {!nurseShiftAssignmentsError && nurseShiftAssignments.length === 0 && <div className="alert alert-info mb-0" role="alert">No shift assignments yet.</div>}
              {!nurseShiftAssignmentsError && nurseShiftAssignments.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Primary nurse</th><th>Window</th><th>Status</th><th>Acknowledged</th><th>Ack action</th></tr></thead>
                    <tbody>
                      {nurseShiftAssignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>{assignment.primaryNurseName}</td>
                          <td>
                            <div>{new Date(assignment.shiftStartAt).toLocaleString('en-GB')}</div>
                            <div className="text-muted small">to {new Date(assignment.shiftEndAt).toLocaleString('en-GB')}</div>
                          </td>
                          <td className="text-capitalize">{assignment.status.replace('_', ' ')}</td>
                          <td>{assignment.acknowledgedAt ? new Date(assignment.acknowledgedAt).toLocaleString('en-GB') : 'Pending'}</td>
                          <td>
                            <form action={acknowledgeIncomingNurseAction} className="d-grid gap-2">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="assignmentId" value={assignment.id} />
                              <select name="incomingNurseStaffId" className="form-select form-select-sm" defaultValue="">
                                <option value="">Current nurse account</option>
                                {assignableStaff.filter((staff) => staff.role === 'nurse').map((staff) => (
                                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                                ))}
                              </select>
                              <input name="acknowledgedAt" type="datetime-local" className="form-control form-control-sm" required />
                              <input name="acknowledgementNote" className="form-control form-control-sm" placeholder="Ack note" />
                              <button type="submit" className="btn btn-sm btn-outline-success">Acknowledge</button>
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

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Patient geofence policy</h2></div>
            <div className="card-body">
              <form action={updatePatientGeoPolicyAction} className="row g-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="handoffGeofenceRadiusMeters" className="form-label">Handoff radius override (meters)</label>
                  <input
                    id="handoffGeofenceRadiusMeters"
                    name="handoffGeofenceRadiusMeters"
                    type="number"
                    min="50"
                    max="5000"
                    className="form-control"
                    defaultValue={localPatient?.handoffGeofenceRadiusMeters ?? ''}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="temporarilyAwayUntil" className="form-label">Patient temporarily away until</label>
                  <input
                    id="temporarilyAwayUntil"
                    name="temporarilyAwayUntil"
                    type="datetime-local"
                    className="form-control"
                    defaultValue={localPatient?.temporarilyAwayUntil ? localPatient.temporarilyAwayUntil.slice(0, 16) : ''}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="temporarilyAwayNote" className="form-label">Temporary away note</label>
                  <select
                    id="temporarilyAwayNote"
                    name="temporarilyAwayNote"
                    className="form-select"
                    defaultValue={localPatient?.temporarilyAwayNote ?? ''}
                  >
                    <option value="">None</option>
                    {TEMPORARILY_AWAY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-outline-primary">Save geofence policy</button>
                </div>
              </form>
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Clinical communication thread</h2>
              <span className="text-muted small">{communications.length} messages</span>
            </div>
            <div className="card-body">
              <form action={createCommunicationAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-3">
                  <label htmlFor="communicationCategory" className="form-label">Category</label>
                  <select id="communicationCategory" name="communicationCategory" className="form-select" defaultValue="clinical-update">
                    <option value="clinical-update">Clinical update</option>
                    <option value="handoff">Handoff</option>
                    <option value="escalation">Escalation</option>
                    <option value="incident">Incident</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="communicationPriority" className="form-label">Priority</label>
                  <select id="communicationPriority" name="communicationPriority" className="form-select" defaultValue="routine">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="asap">ASAP</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="communicationRecipientStaffId" className="form-label">Assign to</label>
                  <select id="communicationRecipientStaffId" name="communicationRecipientStaffId" className="form-select" defaultValue="">
                    <option value="">Any assigned team</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {staff.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="communicationEncounterId" className="form-label">Related visit</label>
                  <select id="communicationEncounterId" name="communicationEncounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="communicationMessage" className="form-label">Message</label>
                  <select id="communicationMessage" name="communicationMessage" className="form-select" defaultValue="Clinical update documented; no action required." required>
                    {COMMUNICATION_MESSAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Send communication</button>
                </div>
              </form>

              {communicationsError && <div className="alert alert-warning" role="alert">Could not load communications: {communicationsError}</div>}
              {!communicationsError && communications.length === 0 && <div className="alert alert-info mb-0" role="alert">No communications logged yet.</div>}
              {!communicationsError && communications.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Sent</th><th>Category</th><th>Priority</th><th>Message</th><th>From</th><th>To</th></tr></thead>
                    <tbody>
                      {communications.map((communication) => (
                        <tr key={communication.id}>
                          <td>{communication.sentAt ? new Date(communication.sentAt).toLocaleString('en-GB') : '—'}</td>
                          <td>{communicationCategoryLabel(communication.category)}</td>
                          <td>{taskPriorityLabel(communication.priority)}</td>
                          <td className="text-muted small">{communication.message}</td>
                          <td>{communication.sender ?? '—'}</td>
                          <td>{communication.recipient ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Escalation workflow</h2>
              <span className="text-muted small">{escalationTasks.length} active escalations</span>
            </div>
            <div className="card-body">
              <form action={createEscalationAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="escalationTitle" className="form-label">Escalation title</label>
                  <select id="escalationTitle" name="escalationTitle" className="form-select" defaultValue="Abnormal vital signs" required>
                    {ESCALATION_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="escalationPriority" className="form-label">Priority</label>
                  <select id="escalationPriority" name="escalationPriority" className="form-select" defaultValue="urgent">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="asap">ASAP</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="escalationOwnerStaffId" className="form-label">Owner</label>
                  <select id="escalationOwnerStaffId" name="escalationOwnerStaffId" className="form-select" defaultValue="">
                    <option value="">Unassigned</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} · {staff.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label htmlFor="escalationDueDate" className="form-label">Target date</label>
                  <input id="escalationDueDate" name="escalationDueDate" type="date" className="form-control" />
                </div>
                <div className="col-md-4">
                  <label htmlFor="escalationEncounterId" className="form-label">Related visit</label>
                  <select id="escalationEncounterId" name="escalationEncounterId" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="escalationSummary" className="form-label">Escalation summary</label>
                  <select id="escalationSummary" name="escalationSummary" className="form-select" defaultValue="Requires urgent clinician review and documented next action." required>
                    {ESCALATION_SUMMARY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Create escalation</button>
                </div>
              </form>

              <form action={runEscalationSlaSweepAction} className="mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <button type="submit" className="btn btn-outline-secondary">Run Escalation + Co-sign SLA Sweep</button>
              </form>

              {tasksError && <div className="alert alert-warning" role="alert">Could not load escalation tasks: {tasksError}</div>}
              {!tasksError && escalationTasks.length === 0 && <div className="alert alert-info mb-0" role="alert">No escalation tasks yet.</div>}
              {!tasksError && escalationTasks.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Escalation</th><th>Status</th><th>Priority</th><th>Due</th><th>Owner</th></tr></thead>
                    <tbody>
                      {escalationTasks.map((task) => (
                        <tr key={task.id}>
                          <td>
                            <div className="fw-semibold">{taskTitle(task)}</div>
                            <div className="text-muted small">{task.description ?? '—'}</div>
                          </td>
                          <td>{taskStatusLabel(task.status)}</td>
                          <td>{taskPriorityLabel(task.priority)}</td>
                          <td>{taskDueDate(task)}</td>
                          <td>{task.owner?.display ?? task.owner?.reference ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('orders-tasks') && (
          <div id="patient-tasks" className="card bg-white">
            <div className="card-header"><h2 className="h6 mb-0">Care tasks</h2></div>
            <div className="card-body">
              <form action={createCareTaskAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-4">
                  <label htmlFor="task-title" className="form-label">Task title</label>
                  <select id="task-title" name="taskTitle" className="form-select" defaultValue="Lab follow-up" required>
                    {TASK_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="task-description" className="form-label">Description</label>
                  <select id="task-description" name="taskDescription" className="form-select" defaultValue="">
                    <option value="">None</option>
                    {TASK_DESCRIPTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="col-md-2"><label htmlFor="task-due-date" className="form-label">Due date</label><input id="task-due-date" name="taskDueDate" type="date" className="form-control" /></div>
                <div className="col-md-2"><label htmlFor="task-encounter" className="form-label">Visit</label><select id="task-encounter" name="encounterId" className="form-select" defaultValue=""><option value="">None</option>{encounters.map((encounter) => (<option key={encounter.id} value={encounter.id}>{encounter.id}</option>))}</select></div>
                <div className="col-12"><button type="submit" className="btn btn-primary">Create task</button></div>
              </form>

              {tasksError && <div className="alert alert-warning" role="alert">Could not load tasks: {tasksError}</div>}
              {!tasksError && tasks.length === 0 && <div className="alert alert-info mb-0" role="alert">No care tasks yet.</div>}
              {tasks.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Task</th><th>Status</th><th>Due</th><th className="text-end">Update</th></tr></thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id}>
                          <td><div className="fw-semibold">{taskTitle(task)}</div><div className="text-muted small">{task.description ?? '—'}</div></td>
                          <td>{taskStatusLabel(task.status)}</td>
                          <td>{taskDueDate(task)}</td>
                          <td className="text-end">
                            <form action={updateCareTaskStatusAction} className="d-inline-flex gap-2">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="taskId" value={task.id ?? ''} />
                              <input type="hidden" name="nextStatus" value="in-progress" />
                              <input type="hidden" name="taskVersionId" value={task.meta?.versionId ?? ''} />
                              <button type="submit" className="btn btn-sm btn-outline-primary">Start</button>
                            </form>
                            <form action={updateCareTaskStatusAction} className="d-inline-flex gap-2 ms-2">
                              <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                              <input type="hidden" name="taskId" value={task.id ?? ''} />
                              <input type="hidden" name="nextStatus" value="completed" />
                              <input type="hidden" name="taskVersionId" value={task.meta?.versionId ?? ''} />
                              <button type="submit" className="btn btn-sm btn-outline-success">Done</button>
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
