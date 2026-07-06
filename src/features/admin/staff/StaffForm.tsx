'use client';

import { useActionState, useState } from 'react';
import { Button, Input, Select, Toast } from '@/components/ui';
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
  const requiredLicenceHint = requiredLicence
    ? `This clinical role requires a valid ${LICENSE_LABELS[requiredLicence]} licence before it can sign clinical records.`
    : undefined;

  return (
    <form action={formAction} className="row g-3" noValidate>
      {mode === 'edit' && values.staffId ? <input type="hidden" name="staffId" value={values.staffId} /> : null}

      <Input
        id="name"
        name="name"
        type="text"
        label="Full name"
        className="col-md-6"
        defaultValue={values.name}
        required
        dir="auto"
        experience="ops"
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="Email (used to sign in)"
        className="col-md-6"
        defaultValue={values.email}
        required
        dir="ltr"
        autoComplete="off"
        experience="ops"
      />

      <Select
        id="role"
        name="role"
        label="Role"
        className="col-md-6"
        defaultValue={values.role}
        onChange={(event) => setRole(event.target.value)}
        required
        hint={requiredLicenceHint}
        experience="ops"
      >
        <option value="" disabled>Select a role...</option>
        {ROLE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.roles.map((roleValue) => (
              <option key={roleValue} value={roleValue}>{ROLE_LABELS[roleValue]}</option>
            ))}
          </optgroup>
        ))}
      </Select>

      <Select
        id="clinicalLicenseType"
        name="clinicalLicenseType"
        label="Licence type"
        className="col-md-6"
        defaultValue={values.clinicalLicenseType}
        experience="ops"
      >
        <option value="">- none -</option>
        {LICENSE_TYPE_VALUES.filter((type) => type !== 'none').map((type) => (
          <option key={type} value={type}>{LICENSE_LABELS[type]}</option>
        ))}
      </Select>

      <Input
        id="clinicalLicenseNumber"
        name="clinicalLicenseNumber"
        type="text"
        label="Licence / syndicate number"
        className="col-md-4"
        defaultValue={values.clinicalLicenseNumber}
        dir="ltr"
        experience="ops"
      />

      <Input
        id="clinicalLicenseExpiry"
        name="clinicalLicenseExpiry"
        type="date"
        label="Licence expiry"
        className="col-md-4"
        defaultValue={values.clinicalLicenseExpiry}
        dir="ltr"
        experience="ops"
      />

      <Input
        id="licenseIssuingBody"
        name="licenseIssuingBody"
        type="text"
        label="Issuing body"
        className="col-md-4"
        defaultValue={values.licenseIssuingBody}
        dir="auto"
        experience="ops"
      />

      {requiredLicence ? (
        <Select
          id="publicDoctorId"
          name="publicDoctorId"
          label="Public profile link (optional)"
          className="col-md-6"
          defaultValue={values.publicDoctorId}
          hint="Link to a public doctor profile so this clinician's approved profile edits publish to the website."
          experience="ops"
        >
          <option value="">- not linked -</option>
          {doctorOptions.map((option) => (
            <option key={option.id} value={String(option.id)}>{option.label}</option>
          ))}
        </Select>
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

      {state.status === 'error' ? (
        <div className="col-12">
          <Toast experience="ops" tone="danger" description={state.message} />
        </div>
      ) : null}
      {state.status === 'success' ? (
        <div className="col-12">
          <Toast experience="ops" tone="success" description={state.message} />
          {state.inviteUrl ? <CopyLinkField url={state.inviteUrl} /> : null}
        </div>
      ) : null}

      <div className="col-12">
        <Button type="submit" experience="ops" disabled={isPending} loading={isPending}>
          {isPending ? 'Saving...' : mode === 'create' ? 'Create staff member' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
