'use client';

import { useEffect } from 'react';

/**
 * Injects a <link rel="stylesheet"> on mount so the asset does not block
 * first paint. Suitable for non-critical stylesheets (icon fonts, etc.).
 *
 * The link is deduplicated by id when provided.
 */
const LazyStylesheet: React.FC<{ href: string; id?: string }> = ({ href, id }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (id && document.getElementById(id)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) link.id = id;
    document.head.appendChild(link);
  }, [href, id]);

  return null;
};

export default LazyStylesheet;
