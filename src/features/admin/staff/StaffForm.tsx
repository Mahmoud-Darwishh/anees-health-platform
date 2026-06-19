'use client';

import { useActionState, useState } from 'react';
import { idleStaffActionState, type StaffActionState } from './types';
import { ROLE_GROUPS, ROLE_LABELS, LICENSE_LABELS } from './labels';
import { LICENSE_TYPE_VALUES, REQUIRED_LICENSE_BY_ROLE } from './schemas';
import { CopyLinkField } from './CopyLinkField';

export type DoctorOption = { id: number; label: string };

export type StaffFormInitial = {
  staffId?: string;
  name: string;
  email: string;
  role: string;
  clinicalLicenseType: string;
  clinicalLicenseNumber: string;
  clinicalLicenseExpiry: string;
  licenseIssuingBody: string;
  isOnCall: boolean;
  isClinicalDirector: boolean;
  publicDoctorId: string;
};

const EMPTY_INITIAL: StaffFormInitial = {
  name: '',
  email: '',
  role: '',
  clinicalLicenseType: '',
  clinicalLicenseNumber: '',
  clinicalLicenseExpiry: '',
  licenseIssuingBody: '',
  isOnCall: false,
  isClinicalDirector: false,
  publicDoctorId: '',
};

type Props = {
  mode: 'create' | 'edit';
  action: (prev: StaffActionState, formData: FormData) => Promise<StaffActionState>;
  initial?: StaffFormInitial;
  doctorOptions?: DoctorOption[];
};

export function StaffForm({ mode, action, initial, doctorOptions = [] }: Props) {
  const values = initial ?? EMPTY_INITIAL;
  const [state, formAction, isPending] = useActionState(action, idleStaffActionState);
  const [role, setRole] = useState(values.role);

  const requiredLicence = REQUIRED_LICENSE_BY_ROLE[role as keyof typeof REQUIRED_LICENSE_BY_ROLE];

  return (
    <form action={formAction} className="row g-3" noValidate>
      {mode === 'edit' && values.staffId ? <input type="hidden" name="staffId" value={values.staffId} /> : null}

      <div className="col-md-6">
        <label htmlFor="name" className="form-label">Full name</label>
        <input id="name" name="name" type="text" className="form-control" defaultValue={values.name} required dir="auto" />
      </div>

      <div className="col-md-6">
        <label htmlFor="email" className="form-label">Email (used to sign in)</label>
        <input id="email" name="email" type="email" className="form-control" defaultValue={values.email} required dir="ltr" autoComplete="off" />
      </div>

      <div className="col-md-6">
        <label htmlFor="role" className="form-label">Role</label>
        <select
          id="role"
          name="role"
          className="form-select"
          defaultValue={values.role}
          onChange={(event) => setRole(event.target.value)}
          required
        >
          <option value="" disabled>Select a role…</option>
          {ROLE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.roles.map((roleValue) => (
                <option key={roleValue} value={roleValue}>{ROLE_LABELS[roleValue]}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {requiredLicence ? (
          <div className="form-text text-warning-emphasis">
            This clinical role requires a valid {LICENSE_LABELS[requiredLicence]} licence before it can sign clinical records.
          </div>
        ) : null}
      </div>

      <div className="col-md-6">
        <label htmlFor="clinicalLicenseType" className="form-label">Licence type</label>
        <select id="clinicalLicenseType" name="clinicalLicenseType" className="form-select" defaultValue={values.clinicalLicenseType}>
          <option value="">— none —</option>
          {LICENSE_TYPE_VALUES.filter((type) => type !== 'none').map((type) => (
            <option key={type} value={type}>{LICENSE_LABELS[type]}</option>
          ))}
        </select>
      </div>

      <div className="col-md-4">
        <label htmlFor="clinicalLicenseNumber" className="form-label">Licence / syndicate number</label>
        <input id="clinicalLicenseNumber" name="clinicalLicenseNumber" type="text" className="form-control" defaultValue={values.clinicalLicenseNumber} dir="ltr" />
      </div>

      <div className="col-md-4">
        <label htmlFor="clinicalLicenseExpiry" className="form-label">Licence expiry</label>
        <input id="clinicalLicenseExpiry" name="clinicalLicenseExpiry" type="date" className="form-control" defaultValue={values.clinicalLicenseExpiry} dir="ltr" />
      </div>

      <div className="col-md-4">
        <label htmlFor="licenseIssuingBody" className="form-label">Issuing body</label>
        <input id="licenseIssuingBody" name="licenseIssuingBody" type="text" className="form-control" defaultValue={values.licenseIssuingBody} dir="auto" />
      </div>

      {requiredLicence ? (
        <div className="col-md-6">
          <label htmlFor="publicDoctorId" className="form-label">Public profile link (optional)</label>
          <select id="publicDoctorId" name="publicDoctorId" className="form-select" defaultValue={values.publicDoctorId}>
            <option value="">— not linked —</option>
            {doctorOptions.map((option) => (
              <option key={option.id} value={String(option.id)}>{option.label}</option>
            ))}
          </select>
          <div className="form-text">Link to a public doctor profile so this clinician&apos;s approved profile edits publish to the website.</div>
        </div>
      ) : null}

      <div className="col-12 d-flex gap-4">
        <div className="form-check">
          <input id="isOnCall" name="isOnCall" type="checkbox" className="form-check-input" defaultChecked={values.isOnCall} />
          <label htmlFor="isOnCall" className="form-check-label">On-call</label>
        </div>
        <div className="form-check">
          <input id="isClinicalDirector" name="isClinicalDirector" type="checkbox" className="form-check-input" defaultChecked={values.isClinicalDirector} />
          <label htmlFor="isClinicalDirector" className="form-check-label">Clinical director</label>
        </div>
      </div>

      {state.status === 'error' ? <div className="col-12"><div className="alert alert-danger mb-0" role="alert">{state.message}</div></div> : null}
      {state.status === 'success' ? (
        <div className="col-12">
          <div className="alert alert-success mb-0" role="status">
            {state.message}
            {state.inviteUrl ? <CopyLinkField url={state.inviteUrl} /> : null}
          </div>
        </div>
      ) : null}

      <div className="col-12">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : mode === 'create' ? 'Create staff member' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
