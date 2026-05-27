'use client';

import styles from './PortalShell.module.scss';

type Props = {
  label: string;
  className?: string;
};

/**
 * Triggers the browser print dialog so the patient can save the portal page
 * as a PDF (Chrome / Edge / Safari all expose "Save as PDF" in the dialog).
 */
export function ExportPdfButton({ label, className }: Props) {
  return (
    <button
      type="button"
      className={className ?? styles.exportBtn}
      onClick={() => window.print()}
    >
      <i className="fa-solid fa-download" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

