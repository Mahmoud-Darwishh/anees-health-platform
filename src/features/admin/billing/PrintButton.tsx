'use client';

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-sm btn-outline-secondary d-print-none" onClick={() => window.print()}>
      {label}
    </button>
  );
}
