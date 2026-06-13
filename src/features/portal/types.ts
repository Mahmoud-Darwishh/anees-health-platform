import type { getTranslations } from 'next-intl/server';
import type { getOwnPatientRecord } from '@/lib/portal/patient-record';

/** The eight workspace tabs the patient portal exposes via `?tab=`. */
export type PortalWorkspaceTab =
  | 'overview'
  | 'clinical'
  | 'files'
  | 'care'
  | 'visits'
  | 'vitals'
  | 'notes'
  | 'tasks';

export const PORTAL_WORKSPACE_TABS: PortalWorkspaceTab[] = [
  'overview',
  'clinical',
  'files',
  'care',
  'visits',
  'vitals',
  'notes',
  'tasks',
];

/** Falls back to `overview` for unknown/absent `?tab=` values. */
export function resolvePortalWorkspaceTab(rawTab?: string): PortalWorkspaceTab {
  const value = PORTAL_WORKSPACE_TABS.find((tab) => tab === rawTab);
  return value ?? 'overview';
}

/** The session-resolved patient record — never client-supplied (see patient-record.ts). */
export type PortalRecord = NonNullable<Awaited<ReturnType<typeof getOwnPatientRecord>>>;

/** The bound `portal`-namespace translator passed down to every section. */
export type PortalTranslator = Awaited<ReturnType<typeof getTranslations>>;
