'use client';

import { useEffect, useId, useState } from 'react';
import type { MedplumTerminologyDomain } from '@/lib/medplum/terminology';

type SuggestionTerm = {
  label: string;
};

type TerminologyTextFieldProps = {
  name: string;
  label: string;
  domain: MedplumTerminologyDomain;
  placeholder?: string;
  required?: boolean;
  className?: string;
  minQueryLength?: number;
};

export function TerminologyTextField({
  name,
  label,
  domain,
  placeholder,
  required,
  className,
  minQueryLength = 2,
}: TerminologyTextFieldProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionTerm[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (!open && q.length < minQueryLength) {
      return;
    }

    let ignore = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const url = `/api/ehr/terminology/suggest?domain=${encodeURIComponent(domain)}&q=${encodeURIComponent(q)}&limit=12`;
        const response = await fetch(url, { method: 'GET', credentials: 'same-origin' });
        if (!response.ok) {
          if (!ignore) setSuggestions([]);
          return;
        }

        const json = (await response.json()) as { terms?: SuggestionTerm[] };
        if (!ignore) {
          setSuggestions(json.terms ?? []);
        }
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
  }, [domain, minQueryLength, open, value]);

  return (
    <>
      <label htmlFor={inputId} className="form-label">{label}</label>
      <input
        id={inputId}
        name={name}
        className={className ?? 'form-control'}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div id={listId} className="list-group mt-2" role="listbox" aria-label={`${label} suggestions`}>
          {suggestions.map((item) => (
            <button
              key={item.label}
              type="button"
              className="list-group-item list-group-item-action"
              onMouseDown={() => setValue(item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div className="form-text">
        {loading ? 'Searching Medplum terminology...' : `Use Medplum suggestions for safer coding.`}
      </div>
    </>
  );
}
