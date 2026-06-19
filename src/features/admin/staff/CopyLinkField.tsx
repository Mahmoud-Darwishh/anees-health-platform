'use client';

import { useState } from 'react';

/**
 * Renders a one-time set-password link with a copy button. The link is never
 * persisted server-side (only its hash is), so this is the only moment it can
 * be captured — the admin conveys it to the staff member out-of-band.
 */
export function CopyLinkField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3">
      <label className="form-label small fw-semibold mb-1">One-time access link (share securely — shown once)</label>
      <div className="input-group input-group-sm">
        <input type="text" className="form-control font-monospace" value={url} readOnly aria-label="One-time access link" />
        <button type="button" className="btn btn-outline-primary" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-muted small mt-1 mb-0">
        Valid for 7 days, single use. Send it to the staff member over a trusted channel (e.g. WhatsApp). Re-issuing a
        link voids this one.
      </p>
    </div>
  );
}
