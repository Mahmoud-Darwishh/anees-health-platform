'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "Data as of" signal + refresh control. The server passes the render timestamp
 * (each admin page is force-dynamic, so this reflects the actual data fetch).
 * Pressing it re-fetches the server data via router.refresh(), which re-renders
 * with a fresh timestamp. The time is formatted inline in the viewer's locale;
 * `suppressHydrationWarning` covers the expected server-vs-client timezone diff.
 */
export function LastRefreshed({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const label = new Date(renderedAt).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRefresh = () => startTransition(() => router.refresh());

  return (
    <button
      type="button"
      className={`anees-admin-refreshed ${pending ? 'is-refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={pending}
      title="Refresh data"
      aria-label="Refresh data"
    >
      <svg
        className="anees-admin-refreshed-icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
      <span className="anees-admin-refreshed-text" suppressHydrationWarning>Data as of {label}</span>
    </button>
  );
}

/**
 * Floating back-to-top control. Hidden until the user scrolls past the fold so
 * it never competes with above-the-fold content; respects reduced-motion.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`anees-back-to-top ${visible ? 'is-visible' : ''}`}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
