import { appointmentTypeLabel } from '../helpers';
import { appointmentStatusLabel } from '../view-helpers';
import { InfoHint } from '../InfoHint';
import type { AdminPatientViewContext } from '../view-context';

export function AppointmentTimeline({
  appointments,
  appointmentsError,
}: {
  appointments: AdminPatientViewContext['appointments'];
  appointmentsError: AdminPatientViewContext['appointmentsError'];
}) {
  return (
    <div className="card bg-white">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0 d-inline-flex align-items-center gap-2">
          Appointment timeline
          <InfoHint text="Planned slots (FHIR Appointments). Read-only history of what was booked." />
        </h2>
        <span className="text-muted small">{appointments.length} appointments</span>
      </div>
      <div className="card-body">
        {appointmentsError && <div className="alert alert-warning" role="alert">Could not load appointments: {appointmentsError}</div>}
        {!appointmentsError && appointments.length === 0 && <div className="alert alert-info mb-0" role="alert">No appointments scheduled yet.</div>}
        {!appointmentsError && appointments.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 anees-stack-table">
              <thead><tr><th>Start</th><th>End</th><th>Status</th><th>Type</th><th>Assigned</th><th>Notes</th></tr></thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="anees-stack-row">
                    <td data-label="Start">{appointment.start ? new Date(appointment.start).toLocaleString('en-GB') : '—'}</td>
                    <td data-label="End">{appointment.end ? new Date(appointment.end).toLocaleString('en-GB') : '—'}</td>
                    <td data-label="Status">{appointmentStatusLabel(appointment.status)}</td>
                    <td data-label="Type">{appointmentTypeLabel(appointment.type)}</td>
                    <td data-label="Assigned">{appointment.assignedTo ?? '—'}</td>
                    <td data-label="Notes" className="text-muted small">{appointment.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
