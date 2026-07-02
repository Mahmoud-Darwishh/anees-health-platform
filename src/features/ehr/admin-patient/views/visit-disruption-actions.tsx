'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  cancelVisitByMedOpsAction,
  cancelVisitByPatientAction,
  declineVisitAction,
  reassignVisitAction,
  divertVisitAction,
  interruptSessionAction,
  rescheduleInPlaceAction,
  markRefusedAtDoorAction,
  markPatientNotHomeAction,
  disputeVisitAction,
} from '../actions';

type VisitFlags = {
  acknowledged: boolean;
  enRoute: boolean;
  arrived: boolean;
  checkedIn: boolean;
  checkedOut: boolean;
  closed: boolean;
};

// Friendly labels for every disruption reason code (order mirrors the Zod enum).
const DISRUPTION_CODE_LABELS: Record<string, string> = {
  patient_late_cancel: 'Patient — late cancellation',
  patient_no_show: 'Patient — no-show',
  patient_refused_care: 'Patient — refused care',
  patient_hospitalised: 'Patient — hospitalised',
  patient_deceased: 'Patient — deceased',
  family_blocked_access: 'Family blocked access',
  unsafe_environment: 'Unsafe environment',
  physio_personal_emergency: 'Clinician — personal emergency',
  physio_vehicle_breakdown: 'Clinician — vehicle breakdown',
  physio_traffic_blocked: 'Clinician — traffic blocked',
  weather: 'Weather',
  med_ops_reassignment: 'Med Ops reassignment',
  equipment_failure: 'Equipment failure',
  internet_blackout: 'Internet blackout',
  other: 'Other',
};

const DISRUPTION_CODES = Object.keys(DISRUPTION_CODE_LABELS);

type DisruptionOp = {
  key: string;
  label: string;
  hint: string;
  action: (formData: FormData) => Promise<void>;
  defaultCode: string;
  noteMinLength: number;
  wantsProvider?: boolean;
  wantsReschedule?: boolean;
  available: (flags: VisitFlags) => boolean;
};

// The full disruption catalogue. Each op maps 1:1 to a server action; the panel
// only offers the ones legal for the visit's current phase (mirrors the
// transition-legality map enforced server-side).
const DISRUPTION_OPS: DisruptionOp[] = [
  {
    key: 'cancel_medops',
    label: 'Cancel — Med Ops',
    hint: 'Operations cancels the visit (applies the cancellation-fee policy).',
    action: cancelVisitByMedOpsAction,
    defaultCode: 'med_ops_reassignment',
    noteMinLength: 0,
    available: (f) => !f.checkedOut && !f.closed,
  },
  {
    key: 'cancel_patient',
    label: 'Cancel — patient request',
    hint: 'Patient asked to cancel (fee depends on how close to the slot).',
    action: cancelVisitByPatientAction,
    defaultCode: 'patient_late_cancel',
    noteMinLength: 0,
    available: (f) => !f.checkedOut && !f.closed,
  },
  {
    key: 'decline',
    label: 'Clinician declined',
    hint: 'Clinician declined before travelling.',
    action: declineVisitAction,
    defaultCode: 'physio_personal_emergency',
    noteMinLength: 0,
    available: (f) => !f.enRoute && !f.closed,
  },
  {
    key: 'reassign',
    label: 'Reassign to another provider',
    hint: 'Hand the visit to a different clinician (queues a reschedule).',
    action: reassignVisitAction,
    defaultCode: 'med_ops_reassignment',
    noteMinLength: 0,
    wantsProvider: true,
    available: (f) => !f.checkedIn && !f.closed,
  },
  {
    key: 'divert',
    label: 'Divert in transit',
    hint: 'Clinician was pulled off-route mid-travel; queue for reschedule.',
    action: divertVisitAction,
    defaultCode: 'med_ops_reassignment',
    noteMinLength: 0,
    available: (f) => f.enRoute && !f.checkedIn && !f.closed,
  },
  {
    key: 'refused_at_door',
    label: 'Refused at door',
    hint: 'Patient refused care on arrival (log the attempt).',
    action: markRefusedAtDoorAction,
    defaultCode: 'patient_refused_care',
    noteMinLength: 8,
    available: (f) => f.arrived && !f.checkedIn && !f.closed,
  },
  {
    key: 'patient_not_home',
    label: 'Patient not home',
    hint: 'No answer / patient absent on arrival (log the attempt).',
    action: markPatientNotHomeAction,
    defaultCode: 'patient_no_show',
    noteMinLength: 8,
    available: (f) => f.arrived && !f.checkedIn && !f.closed,
  },
  {
    key: 'interrupt',
    label: 'Session interrupted',
    hint: 'Care started but was interrupted (visit stays in progress).',
    action: interruptSessionAction,
    defaultCode: 'other',
    noteMinLength: 0,
    available: (f) => f.checkedIn && !f.checkedOut && !f.closed,
  },
  {
    key: 'reschedule',
    label: 'Reschedule in place',
    hint: 'Keep the clinician; move the visit to a new date/time.',
    action: rescheduleInPlaceAction,
    defaultCode: 'other',
    noteMinLength: 0,
    wantsReschedule: true,
    available: (f) => !f.checkedOut && !f.closed,
  },
  {
    key: 'dispute',
    label: 'Raise dispute',
    hint: 'Flag the visit for Med Ops review (creates a dispute task).',
    action: disputeVisitAction,
    defaultCode: 'other',
    noteMinLength: 10,
    available: (f) => !f.closed,
  },
];

export function VisitDisruptionActions({
  medplumPatientId,
  visitId,
  flags,
}: {
  medplumPatientId: string;
  visitId: string;
  flags: VisitFlags;
}) {
  const available = useMemo(() => DISRUPTION_OPS.filter((op) => op.available(flags)), [flags]);
  const [selectedKey, setSelectedKey] = useState<string>(available[0]?.key ?? '');
  const [code, setCode] = useState<string>('');
  const [note, setNote] = useState('');
  const [provider, setProvider] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = available.find((op) => op.key === selectedKey) ?? available[0] ?? null;

  if (available.length === 0 || !selected) {
    return null;
  }

  const effectiveCode = code || selected.defaultCode;

  function resetFields() {
    setNote('');
    setProvider('');
    setNextDate('');
    setNextTime('');
    setCode('');
    setError(null);
  }

  function handleSelect(key: string) {
    setSelectedKey(key);
    resetFields();
  }

  function submit() {
    if (!selected) return;
    const trimmedNote = note.trim();
    if (selected.noteMinLength > 0 && trimmedNote.length < selected.noteMinLength) {
      setError(`A note of at least ${selected.noteMinLength} characters is required for this action.`);
      return;
    }
    if (selected.wantsReschedule && (!nextDate || !nextTime)) {
      setError('A new date and time are required to reschedule.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('medplumPatientId', medplumPatientId);
      fd.set('visitId', visitId);
      // Stamp the event at action time (never at render — see B18).
      fd.set('eventAt', new Date().toISOString());
      fd.set('disruptionCode', effectiveCode);
      if (trimmedNote) fd.set('disruptionNote', trimmedNote);
      if (selected.wantsProvider && provider.trim()) fd.set('reassignedProviderId', provider.trim());
      if (selected.wantsReschedule) {
        fd.set('nextScheduledDate', nextDate);
        fd.set('nextScheduledTime', nextTime);
      }
      await selected.action(fd);
      resetFields();
    });
  }

  return (
    <details className="anees-vda">
      <summary className="anees-vda-summary">Log disruption / exception</summary>
      <div className="anees-vda-body">
        <label className="anees-vda-field">
          <span className="anees-vda-label">Action</span>
          <select
            className="form-select form-select-sm"
            value={selected.key}
            onChange={(event) => handleSelect(event.target.value)}
            disabled={pending}
          >
            {available.map((op) => (
              <option key={op.key} value={op.key}>{op.label}</option>
            ))}
          </select>
        </label>

        <p className="anees-vda-hint">{selected.hint}</p>

        <label className="anees-vda-field">
          <span className="anees-vda-label">Reason code</span>
          <select
            className="form-select form-select-sm"
            value={effectiveCode}
            onChange={(event) => setCode(event.target.value)}
            disabled={pending}
          >
            {DISRUPTION_CODES.map((value) => (
              <option key={value} value={value}>{DISRUPTION_CODE_LABELS[value]}</option>
            ))}
          </select>
        </label>

        {selected.wantsProvider && (
          <label className="anees-vda-field">
            <span className="anees-vda-label">New provider ID (optional)</span>
            <input
              className="form-control form-control-sm"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="Provider record ID"
              disabled={pending}
            />
          </label>
        )}

        {selected.wantsReschedule && (
          <div className="anees-vda-grid">
            <label className="anees-vda-field">
              <span className="anees-vda-label">New date</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={nextDate}
                onChange={(event) => setNextDate(event.target.value)}
                disabled={pending}
              />
            </label>
            <label className="anees-vda-field">
              <span className="anees-vda-label">New time</span>
              <input
                type="time"
                className="form-control form-control-sm"
                value={nextTime}
                onChange={(event) => setNextTime(event.target.value)}
                disabled={pending}
              />
            </label>
          </div>
        )}

        <label className="anees-vda-field">
          <span className="anees-vda-label">
            Note{selected.noteMinLength > 0 ? ` (required, min ${selected.noteMinLength} chars)` : ' (optional)'}
          </span>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={pending}
          />
        </label>

        {error && <p className="anees-vda-error" role="alert">{error}</p>}

        <button
          type="button"
          className="btn btn-sm btn-outline-danger anees-vda-submit"
          onClick={submit}
          disabled={pending}
        >
          {pending ? 'Working…' : `Confirm: ${selected.label}`}
        </button>
      </div>
    </details>
  );
}
