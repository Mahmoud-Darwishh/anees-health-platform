import type { StaffRole } from '@prisma/client';
import { getWorkspaceTabsForRole } from './role-scope';

/**
 * Shared workspace-tab definitions + resolution. Lives here (not in page-view) so
 * the data loader and the view resolve the SAME active tab from the same inputs —
 * this is what makes tab-aware data loading safe: the loader fetches exactly the
 * tab the view will render, so a tab can never silently show empty clinical data.
 */
export type AdminWorkspaceTab =
  | 'snapshot'
  | 'problems-risks'
  | 'medications-mar'
  | 'care-plan-goals'
  | 'visits-encounters'
  | 'measurements'
  | 'documents'
  | 'labs'
  | 'care-team-consent'
  | 'orders-tasks'
  | 'activity-audit';

export const ADMIN_WORKSPACE_TAB_LIST: Array<{ id: AdminWorkspaceTab; label: string }> = [
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'problems-risks', label: 'Problems & Risks' },
  { id: 'medications-mar', label: 'Medications & MAR' },
  { id: 'care-plan-goals', label: 'Care Plan & Goals' },
  { id: 'visits-encounters', label: 'Visits & Encounters' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'labs', label: 'Labs & Imaging' },
  { id: 'documents', label: 'Documents' },
  { id: 'care-team-consent', label: 'Care Team & Consent' },
  { id: 'orders-tasks', label: 'Orders & Tasks' },
  { id: 'activity-audit', label: 'Activity & Audit' },
];

export const ADMIN_WORKSPACE_TAB_ALIASES: Record<string, AdminWorkspaceTab> = {
  overview: 'snapshot',
  clinical: 'problems-risks',
  documents: 'documents',
  labs: 'labs',
  assessments: 'measurements',
  consent: 'care-team-consent',
  visits: 'visits-encounters',
  vitals: 'measurements',
  'care-team': 'care-team-consent',
  coordination: 'orders-tasks',
  scheduling: 'visits-encounters',
  tasks: 'orders-tasks',
};

export function resolveAllowedWorkspaceTab(
  rawTab: string | undefined,
  allowedTabs: AdminWorkspaceTab[],
): AdminWorkspaceTab {
  const requestedTab = rawTab ? (ADMIN_WORKSPACE_TAB_ALIASES[rawTab] ?? rawTab) : undefined;
  const found = allowedTabs.find((tabId) => tabId === requestedTab);
  return found ?? allowedTabs[0] ?? 'snapshot';
}

/** Tabs a role may see, narrowed to the admin workspace set. */
export function getAllowedWorkspaceTabs(staffRole: StaffRole | null): AdminWorkspaceTab[] {
  return getWorkspaceTabsForRole(staffRole).filter((tab): tab is AdminWorkspaceTab =>
    ADMIN_WORKSPACE_TAB_LIST.some((candidate) => candidate.id === tab),
  );
}

/** The single resolved tab — identical logic for loader and view. */
export function resolveCurrentWorkspaceTab(
  staffRole: StaffRole | null,
  rawTab: string | undefined,
): AdminWorkspaceTab {
  return resolveAllowedWorkspaceTab(rawTab, getAllowedWorkspaceTabs(staffRole));
}
