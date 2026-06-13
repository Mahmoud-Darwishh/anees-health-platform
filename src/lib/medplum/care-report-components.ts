import 'server-only';

import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

/**
 * Builders for the FHIR `Observation.component` entries used by care reports.
 * Every care-report component is the same shape — a `report-type`-coded slice
 * carrying a single `valueString` or `valueInteger` — so these helpers replace
 * the hundreds of hand-written, near-identical component literals that made
 * `createPhysioSessionReport` a ~370-line function.
 */

export type ReportComponent = {
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  valueString?: string;
  valueInteger?: number;
};

function reportCode(code: string, display: string) {
  return { coding: [{ system: MEDPLUM_CODE_SYSTEMS.reportType, code, display }] };
}

/** Optional free-text component — emitted only when `value` is a non-empty string. */
export function stringComponent(
  code: string,
  display: string,
  value: string | null | undefined,
): ReportComponent | undefined {
  return value ? { code: reportCode(code, display), valueString: value } : undefined;
}

/** Optional numeric component — emitted only when `value` is a number. */
export function integerComponent(
  code: string,
  display: string,
  value: number | null | undefined,
): ReportComponent | undefined {
  return typeof value === 'number' ? { code: reportCode(code, display), valueInteger: value } : undefined;
}

/** Optional yes/no component — emitted only when `value` is a boolean. */
export function booleanComponent(
  code: string,
  display: string,
  value: boolean | null | undefined,
): ReportComponent | undefined {
  return typeof value === 'boolean'
    ? { code: reportCode(code, display), valueString: value ? 'yes' : 'no' }
    : undefined;
}

/** Always-present free-text component. */
export function requiredStringComponent(code: string, display: string, value: string): ReportComponent {
  return { code: reportCode(code, display), valueString: value };
}

/** Drop the omitted (`undefined`) entries from a sparse component list. */
export function compactComponents(components: Array<ReportComponent | undefined>): ReportComponent[] {
  return components.filter((entry): entry is ReportComponent => Boolean(entry));
}
