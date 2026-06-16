import { encounterStatusLabel, encounterVisitType } from '../helpers';
import { InfoHint } from '../InfoHint';
import type { AdminPatientViewContext } from '../view-context';

export function EncounterHistory({
  encounters,
  encountersError,
}: {
  encounters: AdminPatientViewContext['encounters'];
  encountersError: AdminPatientViewContext['encountersError'];
}) {
  return (
    <div className="card bg-white">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0 d-inline-flex align-items-center gap-2">
          Encounter history
          <InfoHint text="Signed clinical encounters (FHIR Encounter) produced when a visit is checked in and out. Read-only." />
        </h2>
        <span className="text-muted small">{encounters.length} records</span>
      </div>
      <div className="card-body">
        {encountersError && <div className="alert alert-warning" role="alert">Could not load encounters: {encountersError}</div>}
        {!encountersError && encounters.length === 0 && <div className="alert alert-info mb-0" role="alert">No encounters recorded yet.</div>}
        {encounters.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 anees-stack-table">
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
                  <tr key={encounter.id} className="anees-stack-row">
                    <td data-label="Date">{encounter.period?.start ? new Date(encounter.period.start).toLocaleString('en-GB') : '—'}</td>
                    <td data-label="Status">{encounterStatusLabel(encounter.status)}</td>
                    <td data-label="Type" className="text-capitalize">{encounterVisitType(encounter)}</td>
                    <td data-label="Recorded by">{encounter.participant?.[0]?.individual?.display ?? '—'}</td>
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
