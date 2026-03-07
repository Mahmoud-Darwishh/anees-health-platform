'use client';

import { useEffect } from 'react';

const SCROLLED_CLASS = 'has-started-scroll';
const SHOW_THRESHOLD_PX = 8;

export default function FloatingIconsOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let rafId: number | null = null;

    const updateVisibilityState = () => {
      const hasStartedScroll = window.scrollY > SHOW_THRESHOLD_PX;
      root.classList.toggle(SCROLLED_CLASS, hasStartedScroll);
      rafId = null;
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateVisibilityState);
    };

    // Handle restored scroll position on route load/refresh.
    updateVisibilityState();

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return null;
}
