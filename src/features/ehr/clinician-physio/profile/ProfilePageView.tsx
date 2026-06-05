import type { ClinicianPhysioProfileData } from '@/lib/ehr/clinician-physio-profile';

function formatDateLabel(value: string | null): string {
  if (!value) {
    return 'Not set';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function boolLabel(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function enumToLabel(value: string): string {
  return value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export function ProfilePageView({ data }: { data: ClinicianPhysioProfileData }) {
  const onboardingLabel = data.profile ? enumToLabel(data.profile.onboardingState) : 'Not configured';

  return (
    <section className="clinician-surface clinician-profile-surface">
      <header className="mb-3 clinician-profile-header">
        <p className="mb-1 clinician-profile-kicker">Clinician profile</p>
        <h2 className="h5 mb-1 clinician-profile-title">Professional identity</h2>
        <p className="mb-0 clinician-profile-subtitle">Secure profile snapshot used for workspace access, safety checks, and public visibility controls.</p>
      </header>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      <div className="clinician-profile-card clinician-profile-overview mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <p className="mb-1 clinician-profile-overview-label">Active clinician</p>
            <h3 className="h6 mb-0 clinician-profile-overview-name">{data.staffName}</h3>
          </div>
          <div className="d-flex flex-wrap gap-2 clinician-profile-chip-row">
            <span className="clinician-chip">{enumToLabel(data.role)}</span>
            <span className="clinician-chip is-progress">Onboarding: {onboardingLabel}</span>
            <span className={`clinician-chip ${data.profile?.isPublic ? 'is-done' : ''}`}>
              Public: {data.profile ? boolLabel(data.profile.isPublic) : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="clinician-profile-grid">
        <article className="clinician-profile-card">
          <h3 className="h6 mb-2">Staff identity</h3>
          <dl className="clinician-definition-list mb-0">
            <div>
              <dt>Name</dt>
              <dd>{data.staffName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{data.email ?? 'Not set'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{enumToLabel(data.role)}</dd>
            </div>
          </dl>
        </article>

        <article className="clinician-profile-card">
          <h3 className="h6 mb-2">License</h3>
          <dl className="clinician-definition-list mb-0">
            <div>
              <dt>License type</dt>
              <dd>{data.licenseType ? enumToLabel(data.licenseType) : 'Not set'}</dd>
            </div>
            <div>
              <dt>License number</dt>
              <dd>{data.licenseNumber ?? 'Not set'}</dd>
            </div>
            <div>
              <dt>Expiry</dt>
              <dd>{formatDateLabel(data.licenseExpiryIso)}</dd>
            </div>
          </dl>
        </article>
      </div>

      {data.profile ? (
        <div className="clinician-profile-grid mt-3">
          <article className="clinician-profile-card">
            <h3 className="h6 mb-2">Practice settings</h3>
            <dl className="clinician-definition-list mb-0">
              <div>
                <dt>Onboarding state</dt>
                <dd>{enumToLabel(data.profile.onboardingState)}</dd>
              </div>
              <div>
                <dt>Years of experience</dt>
                <dd>{data.profile.yearsOfExperience ?? 'Not set'}</dd>
              </div>
              <div>
                <dt>Accepting new patients</dt>
                <dd>{boolLabel(data.profile.acceptingNewPatients)}</dd>
              </div>
            </dl>
          </article>

          <article className="clinician-profile-card">
            <h3 className="h6 mb-2">Public profile</h3>
            <dl className="clinician-definition-list mb-0">
              <div>
                <dt>Visible publicly</dt>
                <dd>{boolLabel(data.profile.isPublic)}</dd>
              </div>
              <div>
                <dt>Rating</dt>
                <dd>{data.profile.publicRating ?? 'Not rated yet'}</dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>{data.profile.publicReviewCount}</dd>
              </div>
              <div>
                <dt>Verified visits</dt>
                <dd>{data.profile.publicVisitCount}</dd>
              </div>
            </dl>
          </article>

          <article className="clinician-profile-card clinician-profile-card--full">
            <h3 className="h6 mb-2">Specialties and languages</h3>
            <p className="small text-muted mb-1">Specialties</p>
            <p className="mb-3">{data.profile.specialties.length > 0 ? data.profile.specialties.join(', ') : 'Not set'}</p>
            <p className="small text-muted mb-1">Languages</p>
            <p className="mb-0">{data.profile.languages.length > 0 ? data.profile.languages.join(', ') : 'Not set'}</p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
