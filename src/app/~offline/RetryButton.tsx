'use client';

import styles from './RetryButton.module.scss';

export default function RetryButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className={styles.retryButton}>
      <svg
        className={styles.retryIcon}
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.57" />
      </svg>
      Try again / حاول مرة أخرى
    </button>
  );
}
