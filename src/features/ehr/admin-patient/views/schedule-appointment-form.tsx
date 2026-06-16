import { createAppointmentAction } from '../actions';
import { APPOINTMENT_NOTE_OPTIONS } from '../view-helpers';
import { InfoHint } from '../InfoHint';
import type { AdminPatientViewContext } from '../view-context';

export function ScheduleAppointmentForm({
  medplumPatientId,
  assignableStaff,
}: {
  medplumPatientId: string;
  assignableStaff: AdminPatientViewContext['assignableStaff'];
}) {
  return (
    <div className="card bg-white">
      <div className="card-header">
        <h2 className="h6 mb-0 d-inline-flex align-items-center gap-2">
          Schedule appointment
          <InfoHint text="Books a future slot and assigns a clinician (any discipline). This is the plan — Med Ops dispatch turns it into a workflow visit above." />
        </h2>
      </div>
      <div className="card-body">
        <form action={createAppointmentAction} className="row g-3">
          <input type="hidden" name="medplumPatientId" value={medplumPatientId} />
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
  );
}
