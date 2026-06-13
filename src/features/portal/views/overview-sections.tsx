import { encounterTypeLabel } from '../helpers';
import type { PortalContext } from '../view-context';
import styles from '../portal.module.scss';

/** Overview tab — patient profile, address and caregiver contact. */
export function ProfileSection({ ctx }: { ctx: PortalContext }) {
  const { t, record } = ctx;
  const { patient, medplumPatient } = record;

  const addressLine =
    patient.addressDetail ??
    medplumPatient?.address?.[0]?.line?.[0] ??
    medplumPatient?.address?.[0]?.text ??
    null;
  const addressLandmark = patient.landmark ?? medplumPatient?.address?.[0]?.line?.[1] ?? null;
  const addressMapUrl =
    patient.addressMapUrl ??
    medplumPatient?.address?.[0]?.extension?.find((extension: { url: string; valueUrl?: string }) =>
      extension.url.includes('address-map-url'),
    )?.valueUrl ??
    null;
  const emergencyContactName =
    patient.emergencyContactName ?? medplumPatient?.contact?.[0]?.name?.text ?? null;
  const emergencyContactPhone =
    patient.emergencyContactPhone ??
    medplumPatient?.contact?.[0]?.telecom?.find(
      (telecom: { system?: string; value?: string }) => telecom.system === 'phone',
    )?.value ??
    null;
  const emergencyContactRelation =
    patient.emergencyContactRelation ?? medplumPatient?.contact?.[0]?.relationship?.[0]?.text ?? null;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-body">
        <div className="row">
          <div className="col-md-4">
            <div className="text-muted small">{t('profile.fullName')}</div>
            <div className={styles.metaValue}>{patient.fullName}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">{t('profile.caseId')}</div>
            <div className={styles.metaValue}>{patient.code}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted small">{t('profile.phone')}</div>
            <div className={styles.metaValue}>{patient.phone}</div>
          </div>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-12 col-lg-6">
            <div className="border rounded-3 p-3 h-100">
              <div className="text-muted small">{t('profile.address')}</div>
              <div className={styles.metaValue}>{addressLine ?? '—'}</div>
              <div className="small text-muted mt-1">{addressLandmark ?? '—'}</div>
              {addressMapUrl ? (
                <a href={addressMapUrl} target="_blank" rel="noreferrer" className="small d-inline-block mt-2">
                  Open map
                </a>
              ) : null}
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="border rounded-3 p-3 h-100">
              <div className="text-muted small">{t('profile.caregiver')}</div>
              <div className={styles.metaValue}>{emergencyContactName ?? '—'}</div>
              <div className="small text-muted mt-1">{emergencyContactRelation ?? '—'}</div>
              <div className="small text-muted mt-1">{emergencyContactPhone ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Overview tab — at-a-glance counts of the patient's clinical record. */
export function ClinicalDepthSection({ ctx }: { ctx: PortalContext }) {
  const { t, canSeeClinicalDepth, problems, allergies, medications, documents, labOrders, labResults, assessments } =
    ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('clinicalDepthTitle')}</h2>
        <span className="text-muted small">
          {canSeeClinicalDepth ? t('clinicalDepthSubtitle') : t('consentRestricted')}
        </span>
      </div>
      <div className="card-body">
        {canSeeClinicalDepth ? (
          <div className="row g-3">
            <div className="col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('problemsTitle')}</div>
                <div className="h4 mb-0">{problems.length}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('allergiesTitle')}</div>
                <div className="h4 mb-0">{allergies.length}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('medicationsTitle')}</div>
                <div className="h4 mb-0">{medications.filter((item) => item.status === 'active').length}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('documentsTitle')}</div>
                <div className="h4 mb-0">{documents.length}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('labsTitle')}</div>
                <div className="h4 mb-0">{labOrders.length + labResults.length}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <div className="text-muted small">{t('assessmentsTitle')}</div>
                <div className="h4 mb-0">{assessments.length}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning mb-0" role="alert">
            {t('consentRestricted')}
          </div>
        )}
      </div>
    </div>
  );
}

/** Overview + care tabs — the patient's next scheduled appointment. */
export function EngagementSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDateTime, nextAppointment } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('engagementTitle')}</h2>
        <span className="text-muted small">{nextAppointment ? 1 : 0}</span>
      </div>
      <div className="card-body">
        {nextAppointment ? (
          <div className="row g-3">
            <div className="col-md-4">
              <div className="text-muted small">{t('visits.date')}</div>
              <div className={styles.metaValue}>{formatDateTime(nextAppointment.period?.start ?? null)}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">{t('visits.type')}</div>
              <div className={styles.metaValue}>{encounterTypeLabel(nextAppointment)}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">{t('visits.provider')}</div>
              <div className={styles.metaValue}>{nextAppointment.participant?.[0]?.individual?.display ?? t('none')}</div>
            </div>
          </div>
        ) : (
          <div className="alert alert-info mb-0" role="alert">
            {t('visits.empty')}
          </div>
        )}
      </div>
    </div>
  );
}
