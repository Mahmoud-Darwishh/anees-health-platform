'use client';

import { useActionState, useState } from 'react';
import { recordNurseVitalsAction } from './actions';
import { idleNurseFormState } from './types';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const NUMERIC_FIELDS: { name: string; label: string; min?: number; max?: number; step?: string; unit?: string }[] = [
  { name: 'systolicBp', label: 'Systolic BP', min: 40, max: 300, unit: 'mmHg' },
  { name: 'diastolicBp', label: 'Diastolic BP', min: 20, max: 200, unit: 'mmHg' },
  { name: 'heartRate', label: 'Heart rate', min: 20, max: 250, unit: 'bpm' },
  { name: 'respiratoryRate', label: 'Resp. rate', min: 4, max: 80, unit: '/min' },
  { name: 'temperatureC', label: 'Temperature', min: 30, max: 45, step: '0.1', unit: '°C' },
  { name: 'spo2Pct', label: 'SpO₂', min: 50, max: 100, unit: '%' },
  { name: 'glucoseMgDl', label: 'Glucose', min: 20, max: 800, unit: 'mg/dL' },
  { name: 'weightKg', label: 'Weight', min: 1, max: 400, step: '0.1', unit: 'kg' },
  { name: 'painScore', label: 'Pain (0–10)', min: 0, max: 10, unit: '/10' },
];

export function NurseVitalsForm({ visitId }: { visitId: string }) {
  const [state, formAction, isPending] = useActionState(recordNurseVitalsAction, idleNurseFormState);
  const [recordedAt] = useState(() => toLocalInputValue(new Date()));

  return (
    <form action={formAction} className="clinician-doc-form">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="mb-2">
        <label htmlFor="vitals-recordedAt" className="form-label small mb-1">Recorded at</label>
        <input id="vitals-recordedAt" name="recordedAt" type="datetime-local" className="form-control form-control-sm" defaultValue={recordedAt} required />
      </div>

      <div className="row g-2">
        {NUMERIC_FIELDS.map((field) => (
          <div className="col-6 col-md-4" key={field.name}>
            <label htmlFor={`vitals-${field.name}`} className="form-label small mb-1">
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </label>
            <input
              id={`vitals-${field.name}`}
              name={field.name}
              type="number"
              inputMode="decimal"
              className="form-control form-control-sm"
              min={field.min}
              max={field.max}
              step={field.step ?? '1'}
            />
          </div>
        ))}
      </div>

      <p className="text-muted small mt-2 mb-2">Enter at least one value. Blood pressure needs both systolic and diastolic.</p>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2">{state.message}</div> : null}
      {state.status === 'success' ? <div className="alert alert-success py-2 mb-2">{state.message}</div> : null}

      <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Record vitals'}
      </button>
    </form>
  );
}
