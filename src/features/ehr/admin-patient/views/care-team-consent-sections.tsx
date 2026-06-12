import { assignCareTeamMemberAction, upsertCaregiverConsentAction, unassignCareTeamMemberAction } from '../actions';
import type { AdminPatientViewContext } from '../view-context';

export function CareTeamConsentSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    localPatient,
    careTeam,
    careTeamError,
    assignableStaff,
    caregiverConsents,
    caregiverConsentsError,
    careTeamMembers,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('care-team-consent') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Caregiver portal consent</h2>
              <span className="text-muted small">{caregiverConsents.length} consent records</span>
            </div>
            <div className="card-body">
              <form action={upsertCaregiverConsentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <input type="hidden" name="consentId" value={caregiverConsents[0]?.id ?? ''} />
                <input type="hidden" name="consentVersionId" value={caregiverConsents[0]?.versionId ?? ''} />

                <div className="col-md-6">
                  <label htmlFor="caregiver-phone" className="form-label">Caregiver phone</label>
                  <input
                    id="caregiver-phone"
                    name="caregiverPhone"
                    type="text"
                    className="form-control"
                    defaultValue={caregiverConsents[0]?.caregiverPhone ?? localPatient?.primaryCaregiverPhone ?? ''}
                    placeholder="+2010..."
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="caregiver-email" className="form-label">Caregiver email</label>
                  <input
                    id="caregiver-email"
                    name="caregiverEmail"
                    type="email"
                    className="form-control"
                    defaultValue={caregiverConsents[0]?.caregiverEmail ?? localPatient?.primaryCaregiverEmail ?? ''}
                    placeholder="caregiver@example.com"
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="consent-decision" className="form-label">Consent decision</label>
                  <select
                    id="consent-decision"
                    name="decision"
                    className="form-select"
                    defaultValue={caregiverConsents[0]?.decision ?? 'allow'}
                    required
                  >
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>

                <div className="col-md-8">
                  <label className="form-label d-block">Shared portal scopes</label>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="form-check"><input id="scope-profile" className="form-check-input" type="checkbox" name="scopeProfile" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('profile') ?? true} /><label htmlFor="scope-profile" className="form-check-label">Profile</label></div>
                    <div className="form-check"><input id="scope-visits" className="form-check-input" type="checkbox" name="scopeVisits" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('visits') ?? true} /><label htmlFor="scope-visits" className="form-check-label">Visits</label></div>
                    <div className="form-check"><input id="scope-vitals" className="form-check-input" type="checkbox" name="scopeVitals" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('vitals') ?? false} /><label htmlFor="scope-vitals" className="form-check-label">Vitals</label></div>
                    <div className="form-check"><input id="scope-notes" className="form-check-input" type="checkbox" name="scopeNotes" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('notes') ?? false} /><label htmlFor="scope-notes" className="form-check-label">Notes</label></div>
                    <div className="form-check"><input id="scope-tasks" className="form-check-input" type="checkbox" name="scopeTasks" value="true" defaultChecked={caregiverConsents[0]?.scopes.includes('tasks') ?? false} /><label htmlFor="scope-tasks" className="form-check-label">Tasks</label></div>
                  </div>
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Save caregiver consent</button>
                </div>
              </form>

              {caregiverConsentsError && <div className="alert alert-warning" role="alert">Could not load caregiver consents: {caregiverConsentsError}</div>}
              {!caregiverConsentsError && caregiverConsents.length === 0 && <div className="alert alert-info mb-0" role="alert">No caregiver consent configured yet for this patient.</div>}
              {!caregiverConsentsError && caregiverConsents.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Decision</th><th>Caregiver</th><th>Scopes</th><th>Updated</th></tr></thead>
                    <tbody>
                      {caregiverConsents.map((consent) => (
                        <tr key={consent.id}>
                          <td className="text-capitalize">{consent.decision}</td>
                          <td>{consent.caregiverPhone ?? consent.caregiverEmail ?? '—'}</td>
                          <td>{consent.scopes.length > 0 ? consent.scopes.join(', ') : '—'}</td>
                          <td>{consent.updatedAt ? new Date(consent.updatedAt).toLocaleString('en-GB') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {isTab('care-team-consent') && (
          <div id="patient-care-team" className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center"><h2 className="h6 mb-0">Care team assignment</h2><span className="text-muted small">{careTeamMembers.length} assigned</span></div>
            <div className="card-body">
              {careTeamError && <div className="alert alert-warning" role="alert">Could not load care team: {careTeamError}</div>}
              <form action={assignCareTeamMemberAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <input type="hidden" name="careTeamVersionId" value={careTeam?.meta?.versionId ?? ''} />
                <div className="col-md-9"><label htmlFor="care-team-staff" className="form-label">Assign staff member</label><select id="care-team-staff" name="staffId" className="form-select" required defaultValue=""><option value="" disabled>Select staff...</option>{assignableStaff.map((staff) => (<option key={staff.id} value={staff.id}>{staff.name} · {staff.role}</option>))}</select></div>
                <div className="col-md-3 d-flex align-items-end"><button type="submit" className="btn btn-primary w-100">Assign</button></div>
              </form>

              {careTeamMembers.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">No care team members assigned yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead><tr><th>Staff</th><th>Role</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {careTeamMembers.map((member, index) => {
                        const practitionerReference = member.member?.reference ?? '';
                        const role = member.role?.[0]?.coding?.[0]?.display ?? member.role?.[0]?.coding?.[0]?.code ?? '—';
                        return (
                          <tr key={`${practitionerReference}-${index}`}>
                            <td>{member.member?.display ?? (practitionerReference || '—')}</td>
                            <td className="text-capitalize">{role}</td>
                            <td className="text-end">
                              {practitionerReference ? (
                                <form action={unassignCareTeamMemberAction}>
                                  <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                  <input type="hidden" name="practitionerReference" value={practitionerReference} />
                                  <input type="hidden" name="careTeamVersionId" value={careTeam?.meta?.versionId ?? ''} />
                                  <button type="submit" className="btn btn-sm btn-outline-danger">Unassign</button>
                                </form>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
