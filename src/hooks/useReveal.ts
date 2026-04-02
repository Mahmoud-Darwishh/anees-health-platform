import { DependencyList, RefObject, useEffect } from 'react';

const defaultOptions: IntersectionObserverInit = {
  rootMargin: '0px 0px -10% 0px',
  threshold: 0.15,
};

let sharedObserver: IntersectionObserver | null = null;

function getObserver(options: IntersectionObserverInit, prefersReducedMotion: boolean) {
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return null;
  if (sharedObserver) return sharedObserver;

  sharedObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        entry.target.classList.remove('reveal-prep');
        obs.unobserve(entry.target);
      }
    });
  }, options);

  return sharedObserver;
}

// Observes elements with data-reveal inside the provided container and adds
// `is-visible` when they intersect. Pass deps to re-run on route/locale changes.
export function useReveal(
  containerRef: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
  options: IntersectionObserverInit = defaultOptions
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nodes = Array.from(
      container.querySelectorAll('[data-reveal]')
    ) as HTMLElement[];

    // If reduced motion or no IO support: reveal immediately.
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => {
        node.classList.add('is-visible');
        node.classList.remove('reveal-prep');
      });
      return;
    }

    const observer = getObserver(options, prefersReducedMotion);

    nodes.forEach((node, index) => {
      const datasetDelay = node.dataset.revealDelay;
      const parsedDelay = datasetDelay ? Number(datasetDelay) : NaN;
      const staggerDelay = (index % 6) * 65;
      const delay = Number.isFinite(parsedDelay) ? Math.max(0, parsedDelay) : staggerDelay;

      node.style.setProperty('--reveal-delay', `${delay}ms`);
      node.classList.remove('is-visible');
      node.classList.add('reveal-prep');
      observer?.observe(node);
    });

    return () => {
      nodes.forEach((node) => observer?.unobserve(node));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
