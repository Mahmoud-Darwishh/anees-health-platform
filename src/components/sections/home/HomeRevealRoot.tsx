'use client';

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useReveal } from '@/hooks/useReveal';

/**
 * Thin client wrapper that owns the <main> ref + scroll-reveal observer
 * so that GeneralHomeOne and every non-interactive home section can stay
 * server components. Children render on the server; only this <main>
 * wrapper ships to the client bundle.
 */
const HomeRevealRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const locale = useLocale();
  useReveal(mainRef, [pathname, locale]);

  return (
    <main id="main-content" tabIndex={-1} ref={mainRef}>
      {children}
    </main>
  );
};

export default HomeRevealRoot;
