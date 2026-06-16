import type { AdminPatientViewContext } from '../view-context';
import { InfoHint } from '../InfoHint';
import { buildVisitVMList } from './visit-vm';
import { VisitBoard } from './visit-board';
import { ScheduleAppointmentForm } from './schedule-appointment-form';
import { AppointmentTimeline } from './appointment-timeline';
import { EncounterHistory } from './encounter-history';

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

  if (!isTab('visits-encounters')) {
    return null;
  }

  const medplumPatientId = patient.id ?? '';
  const visitVMs = buildVisitVMList(localVisits);

  return (
    <>
      {/* 1 — Operational core: the live visit state machine. */}
      <div id="patient-visits" className="card bg-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h6 mb-0 d-inline-flex align-items-center gap-2">
            Visit workflow
            <InfoHint text="Live track for an in-person visit: acknowledge → travel → arrive → check in/out. Times stamp themselves; location is read from the device GPS. Visits arrive from the booking/dispatch flow." />
          </h2>
          <span className="text-muted small">{localVisits.length} total</span>
        </div>
        <div className="card-body">
          {localVisitsError && <div className="alert alert-warning" role="alert">Could not load workflow visits: {localVisitsError}</div>}
          {!localVisitsError && localVisits.length === 0 && (
            <div className="alert alert-info mb-0" role="alert">
              No scheduled visits yet. Schedule an appointment below, then dispatch creates the workflow visit.
            </div>
          )}
          {!localVisitsError && visitVMs.length > 0 && (
            <VisitBoard visits={visitVMs} medplumPatientId={medplumPatientId} />
          )}
        </div>
      </div>

      {/* 2 — Plan future visits. */}
      <ScheduleAppointmentForm medplumPatientId={medplumPatientId} assignableStaff={assignableStaff} />

      {/* 3 — Read-only plan history. */}
      <AppointmentTimeline appointments={appointments} appointmentsError={appointmentsError} />

      {/* 4 — Read-only clinical record history. */}
      <EncounterHistory encounters={encounters} encountersError={encountersError} />
    </>
  );
}
