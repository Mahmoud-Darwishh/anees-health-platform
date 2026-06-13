import { makeFormatters } from './helpers';
import type { PortalData } from './data';
import type { PortalRecord, PortalTranslator, PortalWorkspaceTab } from './types';

/**
 * Assembles the single `ctx` object every portal section reads from: the
 * translator, locale, the resolved record, all loaded datasets, derived values,
 * consent flags, and the locale-bound date formatters. Flattening flags + data
 * to the top level keeps section call sites terse (`ctx.canSeeVitals`,
 * `ctx.vitals`).
 */
export function buildPortalContext(args: {
  record: PortalRecord;
  data: PortalData;
  t: PortalTranslator;
  locale: string;
  activeTab: PortalWorkspaceTab;
}) {
  const { record, data, t, locale, activeTab } = args;
  const { flags, ...datasets } = data;
  const { formatDate, formatDateTime } = makeFormatters(locale);

  return {
    t,
    locale,
    activeTab,
    record,
    formatDate,
    formatDateTime,
    ...datasets,
    ...flags,
  };
}

export type PortalContext = ReturnType<typeof buildPortalContext>;
