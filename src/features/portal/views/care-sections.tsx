import type { PortalContext } from '../view-context';
import styles from '../portal.module.scss';

/** Care tab — the patient's active clinical programs (CarePlan). */
export function CarePlansSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDateTime, carePlans } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('summary.activeCarePlans')}</h2>
        <span className="text-muted small">{carePlans.length}</span>
      </div>
      <div className="card-body">
        {carePlans.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('none')}
          </div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('carePlanTitle')}</th>
                  <th>{t('carePlanStatus')}</th>
                  <th>{t('carePlanRecordedAt')}</th>
                  <th>{t('carePlanDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {carePlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <div className="fw-semibold">{plan.title}</div>
                      <div className="text-muted small">{plan.program ?? t('none')}</div>
                    </td>
                    <td className="text-capitalize">{plan.status}</td>
                    <td>{formatDateTime(plan.start ?? null)}</td>
                    <td className="text-muted small">{plan.description ?? t('none')}</td>
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

/** Care tab — the assigned care team (CareTeam participants). */
export function CareTeamSection({ ctx }: { ctx: PortalContext }) {
  const { t, careTeamMembers } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('careTeamTitle')}</h2>
        <span className="text-muted small">{careTeamMembers.length}</span>
      </div>
      <div className="card-body">
        {careTeamMembers.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('none')}
          </div>
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('careTeamMember')}</th>
                  <th>{t('careTeamRole')}</th>
                </tr>
              </thead>
              <tbody>
                {careTeamMembers.map((member, index) => (
                  <tr key={`${member.member?.reference ?? 'member'}-${index}`}>
                    <td>{member.member?.display ?? member.member?.reference ?? t('none')}</td>
                    <td className="text-capitalize">
                      {member.role?.[0]?.coding?.[0]?.display ?? member.role?.[0]?.coding?.[0]?.code ?? t('none')}
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
