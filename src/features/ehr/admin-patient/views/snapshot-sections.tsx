import { Row } from '../helpers';
import { updatePatientDemographicsAction } from '../actions';
import type { AdminPatientViewContext } from '../view-context';

export function SnapshotSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    careTeamMembers,
    homeAddressLine,
    homeAddressLandmark,
    homeAddressMapUrl,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
    secondaryEmergencyContactName,
    secondaryEmergencyContactPhone,
    secondaryEmergencyContactRelation,
    code,
    phone,
    editableDemographics,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('snapshot') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0 d-flex align-items-center gap-2">
                Patient summary
                {careTeamMembers.length > 0 && <span className="anees-chip">{careTeamMembers.length} care team members</span>}
              </h2>
            </div>
            <div className="card-body">
              <Row label="Patient name" value={patient?.name?.[0]?.text ?? 'Patient profile'} />
              <Row label="Medplum ID" value={patient.id} />
              <Row label="Patient code" value={code} />
              <Row label="Phone" value={phone} />
              <Row label="Gender" value={patient.gender} />
              <Row label="Birth date" value={patient.birthDate} />
              <Row label="Active" value={patient.active ? 'Yes' : 'No'} />
            </div>
          </div>
          )}

          {isTab('snapshot') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Patient residence</h2>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <Row label="Address detail" value={homeAddressLine} />
                <Row label="Landmark" value={homeAddressLandmark} />
                <Row
                  label="Location link"
                  value={
                    homeAddressMapUrl ? (
                      <a href={homeAddressMapUrl} target="_blank" rel="noreferrer">
                        Open map
                      </a>
                    ) : '—'
                  }
                />
              </div>

              {editableDemographics ? (
                <details className="mt-3">
                  <summary className="fw-semibold">Edit residence</summary>
                  <form action={updatePatientDemographicsAction} className="row g-3 mt-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <input type="hidden" name="patientVersionId" value={patient.meta?.versionId ?? ''} />
                    <input type="hidden" name="demographicSection" value="residence" />
                    <input type="hidden" name="emergencyContactName" value={emergencyContactName ?? ''} />
                    <input type="hidden" name="emergencyContactPhone" value={emergencyContactPhone ?? ''} />
                    <input type="hidden" name="emergencyContactRelation" value={emergencyContactRelation ?? ''} />

                    <div className="col-md-6">
                      <label htmlFor="address-detail" className="form-label">Address detail</label>
                      <textarea
                        id="address-detail"
                        name="addressDetail"
                        className="form-control"
                        rows={3}
                        defaultValue={homeAddressLine ?? ''}
                        placeholder="Building, street, floor, apartment"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="address-landmark" className="form-label">Landmark</label>
                      <input
                        id="address-landmark"
                        name="landmark"
                        type="text"
                        className="form-control"
                        defaultValue={homeAddressLandmark ?? ''}
                        placeholder="Nearest landmark or delivery note"
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="address-map-url" className="form-label">Location link</label>
                      <input
                        id="address-map-url"
                        name="addressMapUrl"
                        type="url"
                        inputMode="url"
                        className="form-control"
                        defaultValue={homeAddressMapUrl ?? ''}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>

                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Save residence</button>
                    </div>
                  </form>
                </details>
              ) : (
                <div className="alert alert-info mb-0" role="alert">Residence details are read-only for your role.</div>
              )}
            </div>
          </div>
          )}

          {isTab('snapshot') && (
          <div className="card bg-white">
            <div className="card-header">
              <h2 className="h6 mb-0">Emergency contact</h2>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <Row label="Name" value={emergencyContactName} />
                <Row label="Phone" value={emergencyContactPhone} />
                <Row label="Relationship" value={emergencyContactRelation} />
                <Row label="Secondary contact" value={secondaryEmergencyContactName} />
                <Row label="Secondary phone" value={secondaryEmergencyContactPhone} />
                <Row label="Secondary relation" value={secondaryEmergencyContactRelation} />
              </div>

              {editableDemographics ? (
                <details className="mt-3">
                  <summary className="fw-semibold">Edit emergency contacts</summary>
                  <form action={updatePatientDemographicsAction} className="row g-3 mt-3">
                    <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                    <input type="hidden" name="patientVersionId" value={patient.meta?.versionId ?? ''} />
                    <input type="hidden" name="demographicSection" value="emergency" />
                    <input type="hidden" name="addressDetail" value={homeAddressLine ?? ''} />
                    <input type="hidden" name="landmark" value={homeAddressLandmark ?? ''} />
                    <input type="hidden" name="addressMapUrl" value={homeAddressMapUrl ?? ''} />

                    <div className="col-12">
                      <h3 className="h6 mb-0">Primary contact</h3>
                    </div>

                    <div className="col-md-12">
                      <label htmlFor="emergency-contact-name" className="form-label">Emergency contact name</label>
                      <input
                        id="emergency-contact-name"
                        name="emergencyContactName"
                        type="text"
                        className="form-control"
                        defaultValue={emergencyContactName ?? ''}
                        placeholder="Parent, spouse, or guardian"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="emergency-contact-phone" className="form-label">Emergency contact phone</label>
                      <input
                        id="emergency-contact-phone"
                        name="emergencyContactPhone"
                        type="text"
                        className="form-control"
                        defaultValue={emergencyContactPhone ?? ''}
                        placeholder="+20..."
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="emergency-contact-relation" className="form-label">Emergency contact relation</label>
                      <input
                        id="emergency-contact-relation"
                        name="emergencyContactRelation"
                        type="text"
                        className="form-control"
                        defaultValue={emergencyContactRelation ?? ''}
                        placeholder="Mother, father, spouse, sibling"
                      />
                    </div>

                    <div className="col-12 mt-2">
                      <h3 className="h6 mb-0">Secondary contact</h3>
                      <p className="text-muted small mb-0">Optional backup contact for escalation and handoffs.</p>
                    </div>

                    <div className="col-md-12">
                      <label htmlFor="secondary-emergency-contact-name" className="form-label">Secondary contact name</label>
                      <input
                        id="secondary-emergency-contact-name"
                        name="secondaryEmergencyContactName"
                        type="text"
                        className="form-control"
                        defaultValue={secondaryEmergencyContactName ?? ''}
                        placeholder="Backup family contact"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="secondary-emergency-contact-phone" className="form-label">Secondary contact phone</label>
                      <input
                        id="secondary-emergency-contact-phone"
                        name="secondaryEmergencyContactPhone"
                        type="text"
                        className="form-control"
                        defaultValue={secondaryEmergencyContactPhone ?? ''}
                        placeholder="+20..."
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="secondary-emergency-contact-relation" className="form-label">Secondary contact relation</label>
                      <input
                        id="secondary-emergency-contact-relation"
                        name="secondaryEmergencyContactRelation"
                        type="text"
                        className="form-control"
                        defaultValue={secondaryEmergencyContactRelation ?? ''}
                        placeholder="Son, daughter, sibling, friend"
                      />
                    </div>

                    <div className="col-12">
                      <button type="submit" className="btn btn-primary">Save emergency contacts</button>
                    </div>
                  </form>
                </details>
              ) : (
                <div className="alert alert-info mb-0" role="alert">Emergency contact details are read-only for your role.</div>
              )}
            </div>
          </div>
          )}
    </>
  );
}
