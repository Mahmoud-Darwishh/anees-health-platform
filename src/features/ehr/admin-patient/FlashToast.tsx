'use client';

import { useEffect, useState, useTransition } from 'react';
import { dismissAdminPatientFlashAction } from './flash-actions';
import type { AdminPatientFlash } from './types';

const SUCCESS_TIMEOUT_MS = 4500;

/**
 * Fixed-position status toast. Appears regardless of scroll position so a
 * clinician never has to scroll up to confirm an action worked. Success
 * messages auto-dismiss; errors stay until acknowledged so they aren't missed.
 */
export function FlashToast({ flash }: { flash: AdminPatientFlash }) {
  const [visible, setVisible] = useState(true);
  const [, startTransition] = useTransition();
  const isError = flash.type !== 'success';

  useEffect(() => {
    // Clear the server cookie so this message can't reappear on a later render.
    startTransition(() => {
      void dismissAdminPatientFlashAction();
    });

    if (isError) {
      return undefined;
    }
    const timer = setTimeout(() => setVisible(false), SUCCESS_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [flash.message, flash.type, isError, startTransition]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`anees-toast ${isError ? 'is-error' : 'is-success'}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="anees-toast-icon" aria-hidden="true">{isError ? '!' : '✓'}</span>
      <span className="anees-toast-msg">{flash.message}</span>
      <button type="button" className="anees-toast-close" aria-label="Dismiss notification" onClick={() => setVisible(false)}>
        ×
      </button>
    </div>
  );
}
