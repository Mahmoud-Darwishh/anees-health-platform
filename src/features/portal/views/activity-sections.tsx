import { encounterTypeLabel, toVisitStatusKey } from '../helpers';
import type { PortalContext } from '../view-context';
import styles from '../portal.module.scss';

/** Visits tab — the patient's encounter history. */
export function VisitsSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDateTime, encounters, canSeeVisits } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('visits.title')}</h2>
        <span className="text-muted small">{encounters.length}</span>
      </div>
      <div className="card-body">
        {!canSeeVisits ? (
          <div className="alert alert-warning mb-0" role="alert">
            {t('consentRestricted')}
          </div>
        ) : encounters.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('visits.empty')}
          </div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('visits.date')}</th>
                  <th>{t('visits.status')}</th>
                  <th>{t('visits.type')}</th>
                  <th>{t('visits.provider')}</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((encounter) => {
                  const statusKey = toVisitStatusKey(encounter.status);

                  return (
                    <tr key={encounter.id}>
                      <td>{formatDateTime(encounter.period?.start, t('none'))}</td>
                      <td>{statusKey ? t(`visitStatus.${statusKey}`) : (encounter.status ?? t('none'))}</td>
                      <td className="text-capitalize">{encounterTypeLabel(encounter)}</td>
                      <td>{encounter.participant?.[0]?.individual?.display ?? t('none')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Vitals tab — recent vital-sign measurements. */
export function VitalsSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDateTime, vitals, canSeeVitals } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('vitals.title')}</h2>
        <span className="text-muted small">{vitals.length}</span>
      </div>
      <div className="card-body">
        {!canSeeVitals ? (
          <div className="alert alert-warning mb-0" role="alert">
            {t('consentRestricted')}
          </div>
        ) : vitals.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('vitals.empty')}
          </div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('vitals.measuredAt')}</th>
                  <th>{t('vitals.bp')}</th>
                  <th>{t('vitals.hr')}</th>
                  <th>{t('vitals.spo2')}</th>
                  <th>{t('vitals.temp')}</th>
                  <th>{t('vitals.weight')}</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((row, index) => (
                  <tr key={`${row.measuredAt}-${index}`}>
                    <td>{formatDateTime(row.measuredAt)}</td>
                    <td>{row.systolicBp && row.diastolicBp ? `${row.systolicBp}/${row.diastolicBp}` : t('none')}</td>
                    <td>{row.heartRate ?? t('none')}</td>
                    <td>{row.spo2Pct ?? t('none')}</td>
                    <td>{row.temperatureC ?? t('none')}</td>
                    <td>{row.weightKg ?? t('none')}</td>
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

/** Notes tab — signed clinical notes (Composition). */
export function NotesSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDateTime, signedNotes, canSeeNotes } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('doctorNotes.title')}</h2>
        <span className="text-muted small">{signedNotes.length}</span>
      </div>
      <div className="card-body">
        {!canSeeNotes ? (
          <div className="alert alert-warning mb-0" role="alert">
            {t('consentRestricted')}
          </div>
        ) : signedNotes.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('doctorNotes.empty')}
          </div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('visits.date')}</th>
                  <th>{t('doctorNotes.title')}</th>
                  <th>{t('doctorNotes.by')}</th>
                  <th>{t('doctorNotes.signed')}</th>
                </tr>
              </thead>
              <tbody>
                {signedNotes.map((note) => (
                  <tr key={note.id}>
                    <td>{formatDateTime(note.date)}</td>
                    <td>
                      <div className="fw-semibold">{note.title}</div>
                      <div className="text-muted small">{note.body || t('none')}</div>
                    </td>
                    <td>{note.author ?? t('none')}</td>
                    <td>{t('doctorNotes.signed')}</td>
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

/** Tasks tab — open follow-up tasks (FHIR Task). */
export function TasksSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDate, activeTasks, canSeeTasks } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('care.tasks')}</h2>
        <span className="text-muted small">{activeTasks.length}</span>
      </div>
      <div className="card-body">
        {!canSeeTasks ? (
          <div className="alert alert-warning mb-0" role="alert">
            {t('consentRestricted')}
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('care.emptyTasks')}
          </div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('care.task')}</th>
                  <th>{t('status.active')}</th>
                  <th>{t('workspace.targetDate')}</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className="fw-semibold">{task.code?.text ?? task.code?.coding?.[0]?.display ?? t('none')}</div>
                      <div className="text-muted small">{task.description ?? t('none')}</div>
                    </td>
                    <td className="text-capitalize">{task.status}</td>
                    <td>{formatDate(task.executionPeriod?.end, t('none'))}</td>
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
