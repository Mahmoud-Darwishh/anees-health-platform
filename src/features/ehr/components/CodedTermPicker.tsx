'use client';

import { useEffect, useId, useState } from 'react';

type Term = { label: string; code: string };

type CodedTermPickerProps = {
  /** Terminology domain served by `/api/ehr/terminology/suggest` (e.g. `drug`, `allergen`). */
  domain: string;
  /** Form field name that carries the chosen label (free text allowed). */
  labelInputName: string;
  /** Form field name that carries the chosen code (empty when free text). */
  codeInputName: string;
  title: string;
  placeholder?: string;
  className?: string;
  helpCoded?: string;
  helpFree?: string;
  required?: boolean;
};

/**
 * Generic coded-term typeahead with a free-text fallback. The visible input
 * carries the label directly (so a typed value still submits); a hidden input
 * carries the code, set only when a suggestion is picked and cleared on edit.
 *
 * Used for medications (RxNorm) and allergens (Anees allergen slug). For
 * coded-ONLY domains like ICD-10 problems, use `ProblemCodeFields` instead.
 */
export function CodedTermPicker({
  domain,
  labelInputName,
  codeInputName,
  title,
  placeholder,
  className = 'col-md-6',
  helpCoded = 'Coded selection.',
  helpFree = 'Free text — not in the catalog.',
  required = false,
}: CodedTermPickerProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');
  const [suggestions, setSuggestions] = useState<Term[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let ignore = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const url = `/api/ehr/terminology/suggest?domain=${encodeURIComponent(domain)}&q=${encodeURIComponent(
          typed.trim(),
        )}&limit=12`;
        const response = await fetch(url, { method: 'GET', credentials: 'same-origin' });
        if (!response.ok) {
          if (!ignore) setSuggestions([]);
          return;
        }
        const json = (await response.json()) as { terms?: Term[] };
        if (!ignore) setSuggestions(json.terms ?? []);
      } catch {
        if (!ignore) setSuggestions([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 220);

    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [open, typed, domain]);

  const isCoded = Boolean(code);

  return (
    <div className={className}>
      <label htmlFor={inputId} className="form-label">{title}</label>
      <input
        id={inputId}
        name={labelInputName}
        className={`form-control${isCoded ? ' is-valid' : ''}`}
        placeholder={placeholder}
        value={typed}
        required={required}
        autoComplete="off"
        dir="auto"
        onChange={(event) => {
          setTyped(event.currentTarget.value);
          setCode(''); // editing invalidates any prior coded selection
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <input type="hidden" name={codeInputName} value={code} />
      {open && suggestions.length > 0 && (
        <div className="list-group mt-2" role="listbox" aria-label={`${title} suggestions`}>
          {suggestions.map((item) => (
            <button
              key={`${item.label}-${item.code}`}
              type="button"
              className="list-group-item list-group-item-action"
              onMouseDown={() => {
                setTyped(item.label);
                setCode(item.code);
                setOpen(false);
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <span>{item.label}</span>
                <small className="text-muted">{item.code}</small>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="form-text">{isCoded ? helpCoded : loading ? 'Searching…' : helpFree}</div>
    </div>
  );
}
