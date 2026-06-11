'use client';

import { useEffect, useId, useState } from 'react';

type SuggestionTerm = {
  label: string;
  codings: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;
};

type ProblemCodeFieldsProps = {
  problemInputName: string;
  codeInputName: string;
};

function getIcd10Code(term: SuggestionTerm | null): string {
  if (!term) {
    return '';
  }
  const icd = term.codings.find((coding) => (coding.system ?? '').toLowerCase().includes('icd-10'));
  return icd?.code ?? '';
}

export function ProblemCodeFields({ problemInputName, codeInputName }: ProblemCodeFieldsProps) {
  const inputId = useId();
  const codeId = useId();
  const [typed, setTyped] = useState('');
  const [selected, setSelected] = useState<SuggestionTerm | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = typed.trim();
    if (!open && q.length < 2) {
      return;
    }

    let ignore = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const url = `/api/ehr/terminology/suggest?domain=problem&q=${encodeURIComponent(q)}&limit=12`;
        const response = await fetch(url, { method: 'GET', credentials: 'same-origin' });
        if (!response.ok) {
          if (!ignore) setSuggestions([]);
          return;
        }
        const json = (await response.json()) as { terms?: SuggestionTerm[] };
        if (!ignore) {
          setSuggestions((json.terms ?? []).filter((term) => getIcd10Code(term)));
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
  }, [open, typed]);

  // Coded-only: the form only carries a value when a coded suggestion is picked.
  const selectedCode = getIcd10Code(selected);
  const isCoded = Boolean(selected && selectedCode);
  const hasUnresolvedText = typed.trim().length > 0 && !isCoded;

  return (
    <>
      <div className="col-md-4">
        <label htmlFor={inputId} className="form-label">Problem (ICD-10)</label>
        <input
          id={inputId}
          className={`form-control${hasUnresolvedText ? ' is-invalid' : ''}${isCoded ? ' is-valid' : ''}`}
          placeholder="Type to search ICD-10, then pick a match"
          value={typed}
          onChange={(event) => {
            setTyped(event.currentTarget.value);
            setSelected(null); // editing invalidates any prior coded selection
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          aria-invalid={hasUnresolvedText}
        />
        {/* Hidden inputs only emit a value when an ICD-10 coded term is selected. */}
        <input type="hidden" name={problemInputName} value={isCoded ? selected!.label : ''} />
        {open && suggestions.length > 0 && (
          <div className="list-group mt-2" role="listbox" aria-label="ICD-10 problem suggestions">
            {suggestions.map((item) => {
              const code = getIcd10Code(item);
              return (
                <button
                  key={`${item.label}-${code}`}
                  type="button"
                  className="list-group-item list-group-item-action"
                  onMouseDown={() => {
                    setSelected(item);
                    setTyped(item.label);
                    setOpen(false);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{item.label}</span>
                    <small className="text-muted">{code}</small>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className={`form-text${hasUnresolvedText ? ' text-danger' : ''}`}>
          {isCoded
            ? 'Coded problem selected.'
            : loading
              ? 'Searching ICD-10…'
              : hasUnresolvedText
                ? 'Pick a coded match from the list — free-text problems cannot be saved.'
                : 'Search ICD-10 and choose a suggestion. If a code is missing, ask an admin to load it.'}
        </div>
      </div>

      <div className="col-md-2">
        <label htmlFor={codeId} className="form-label">ICD-10 code</label>
        <input
          id={codeId}
          className="form-control"
          value={selectedCode}
          placeholder="Auto"
          readOnly
        />
        <input type="hidden" name={codeInputName} value={selectedCode} />
        <div className="form-text">
          {isCoded ? 'Locked from the selected problem.' : 'Fills when you pick a problem.'}
        </div>
      </div>
    </>
  );
}
