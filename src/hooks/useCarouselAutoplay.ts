'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared autoplay coordination for carousels.
 *
 * Owns: active-index state, pause/resume timing, prefers-reduced-motion gate,
 * tab-visibility pause. Does NOT own the advancement mechanism — call sites
 * (transform-translate, scroll-snap, anything else) implement that and pass
 * an `onAdvance(nextIndex)` callback.
 *
 * Pattern is intentional: scroll-snap and transform carousels have different
 * imperative APIs; forcing one shared layer leaks abstractions. Sharing the
 * timing logic alone reclaims ~50 lines per call site.
 */
export type UseCarouselAutoplayOptions = {
  /** Total number of slides. */
  total: number;
  /** Autoplay interval in ms. Default 5000. */
  autoplayMs?: number;
  /** Delay after user interaction before autoplay resumes. Default 4000. */
  resumeDelayMs?: number;
  /** External gate (e.g., mobile-only). Default true. */
  enabled?: boolean;
  /**
   * Optional side-effect on each autoplay tick (e.g., imperatively scroll to
   * the next slide). The hook already advances `activeIndex` internally —
   * only provide this if your carousel mechanism is not React-state driven.
   */
  onAdvance?: (nextIndex: number) => void;
};

export type UseCarouselAutoplayResult = {
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  isPaused: boolean;
  prefersReducedMotion: boolean;
  /** Pause autoplay until `scheduleResume()` runs (or component unmounts). */
  pause: () => void;
  /** Resume autoplay after `delay` ms (defaults to `resumeDelayMs`). */
  scheduleResume: (delay?: number) => void;
};

export function useCarouselAutoplay({
  total,
  autoplayMs = 5000,
  resumeDelayMs = 4000,
  enabled = true,
  onAdvance,
}: UseCarouselAutoplayOptions): UseCarouselAutoplayResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAdvanceRef = useRef(onAdvance);

  // Keep latest onAdvance without retriggering the interval effect.
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  // Track reduced-motion preference + tab visibility.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPrefersReducedMotion(media.matches);
    apply();
    media.addEventListener('change', apply);

    const onVisibility = () => setIsPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      media.removeEventListener('change', apply);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Autoplay loop.
  useEffect(() => {
    if (!enabled || isPaused || prefersReducedMotion || total < 2) return;
    const id = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % total;
        onAdvanceRef.current?.(next);
        return next;
      });
    }, autoplayMs);
    return () => clearInterval(id);
  }, [enabled, isPaused, prefersReducedMotion, total, autoplayMs]);

  // Cleanup pending resume timer on unmount.
  useEffect(() => {
    return () => {
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
    if (resumeRef.current) {
      clearTimeout(resumeRef.current);
      resumeRef.current = null;
    }
  }, []);

  const scheduleResume = useCallback(
    (delay = resumeDelayMs) => {
      if (resumeRef.current) clearTimeout(resumeRef.current);
      resumeRef.current = setTimeout(() => setIsPaused(false), delay);
    },
    [resumeDelayMs]
  );

  return {
    activeIndex,
    setActiveIndex,
    isPaused,
    prefersReducedMotion,
    pause,
    scheduleResume,
  };
}
