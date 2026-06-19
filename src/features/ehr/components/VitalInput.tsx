'use client';

import { useId, useState } from 'react';

type VitalInputProps = {
  name: string;
  label: string;
  unit?: string;
  /** Alert thresholds (from the nursing-ops policy) — shown live as the user types. */
  warnMin?: number;
  warnMax?: number;
  step?: string;
  className?: string;
  hint?: string;
};

/**
 * Numeric vital input with a LIVE out-of-range warning (Phase 5). The warning
 * fires at entry — before the server-side escalation — so the clinician sees an
 * abnormal value immediately. Thresholds come from the server (nursing-ops
 * policy) as props, so there is no client/server duplication of the ranges.
 */
export function VitalInput({ name, label, unit, warnMin, warnMax, step, className = 'col-md-2', hint }: VitalInputProps) {
  const id = useId();
  const [value, setValue] = useState('');

  const num = value.trim() === '' ? null : Number(value);
  const isNum = num !== null && Number.isFinite(num);

  let warning: string | null = null;
  if (isNum) {
    if (typeof warnMin === 'number' && num < warnMin) warning = `Low (alert < ${warnMin})`;
    else if (typeof warnMax === 'number' && num > warnMax) warning = `High (alert > ${warnMax})`;
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">
        {label}
        {unit ? <span className="text-muted"> ({unit})</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        step={step ?? 'any'}
        className={`form-control${warning ? ' border-danger' : ''}`}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
      {warning ? (
        <div className="form-text text-danger">{warning}</div>
      ) : hint ? (
        <div className="form-text">{hint}</div>
      ) : null}
    </div>
  );
}
