import type { PortalContext } from '../view-context';
import styles from '../portal.module.scss';

/** Clinical tab — active and resolved problems (ICD-coded). */
export function ProblemsSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDate, problems } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('problemsTitle')}</h2>
        <span className="text-muted small">{problems.length}</span>
      </div>
      <div className="card-body">
        {problems.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('problemTitle')}</th>
                  <th>{t('problemStatus')}</th>
                  <th>{t('problemOnset')}</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.id}>
                    <td>
                      <div className="fw-semibold">{problem.label}</div>
                      <div className="text-muted small">{problem.code ?? '—'}</div>
                    </td>
                    <td className="text-capitalize">{problem.status}</td>
                    <td>{formatDate(problem.onset)}</td>
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

/** Clinical tab — allergies and intolerances with reaction + severity. */
export function AllergiesSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDate, allergies } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('allergiesTitle')}</h2>
        <span className="text-muted small">{allergies.length}</span>
      </div>
      <div className="card-body">
        {allergies.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('allergenLabel')}</th>
                  <th>{t('allergyReaction')}</th>
                  <th>{t('allergySeverity')}</th>
                </tr>
              </thead>
              <tbody>
                {allergies.map((allergy) => (
                  <tr key={allergy.id}>
                    <td>
                      <div className="fw-semibold">{allergy.allergen}</div>
                      <div className="text-muted small">{formatDate(allergy.onset)}</div>
                    </td>
                    <td>{allergy.reaction ?? '—'}</td>
                    <td className="text-capitalize">{allergy.severity ?? '—'}</td>
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

/** Clinical tab — current and historical medications. */
export function MedicationsSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDate, medications } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('medicationsTitle')}</h2>
        <span className="text-muted small">{medications.length}</span>
      </div>
      <div className="card-body">
        {medications.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('medicationLabel')}</th>
                  <th>{t('medicationStatus')}</th>
                  <th>{t('medicationDose')}</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((medication) => (
                  <tr key={medication.id}>
                    <td>
                      <div className="fw-semibold">{medication.medication}</div>
                      <div className="text-muted small">
                        {formatDate(medication.start)}
                        {medication.end ? ` → ${formatDate(medication.end)}` : ''}
                      </div>
                    </td>
                    <td className="text-capitalize">{medication.status}</td>
                    <td>
                      <div>{medication.dosage ?? '—'}</div>
                      <div className="text-muted small">
                        {medication.route ?? '—'}
                        {medication.frequency ? ` · ${medication.frequency}` : ''}
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
  );
}

/** Clinical tab — structured assessments (falls risk, Braden, MMSE, …). */
export function AssessmentsSection({ ctx }: { ctx: PortalContext }) {
  const { t, assessments } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('assessmentsTitle')}</h2>
        <span className="text-muted small">{assessments.length}</span>
      </div>
      <div className="card-body">
        {assessments.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">{t('none')}</div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('assessmentLabel')}</th>
                  <th>{t('assessmentType')}</th>
                  <th>{t('assessmentScore')}</th>
                  <th>{t('assessmentSummary')}</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td>
                      <div className="fw-semibold">{assessment.title}</div>
                      <div className="text-muted small">{assessment.author ?? '—'}</div>
                    </td>
                    <td className="text-capitalize">{assessment.type}</td>
                    <td>{assessment.score ?? '—'}</td>
                    <td>{assessment.summary ?? '—'}</td>
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
