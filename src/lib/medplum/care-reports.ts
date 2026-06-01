import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

export type CareReportResource = {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  code?: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
    text?: string;
  };
  subject?: FhirReference;
  encounter?: FhirReference;
  performer?: FhirReference[];
  effectiveDateTime?: string;
  note?: Array<{ text?: string }>;
  component?: Array<{
    code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
    valueString?: string;
    valueInteger?: number;
  }>;
};

type CreateBaseReportInput = {
  patientId: string;
  encounterId?: string | null;
  performerReference?: string | null;
  performerDisplay?: string | null;
  noteBody: string;
  recordedAt?: Date;
};

export type CreateNursingReportInput = CreateBaseReportInput & {
  conditionSummary?: string | null;
  escalationNeeded?: boolean | null;
  followUpPlan?: string | null;
};

export type CreatePhysioReportInput = CreateBaseReportInput & {
  interventions?: string | null;
  painBefore?: number | null;
  painAfter?: number | null;
  responseSummary?: string | null;
  homePlan?: string | null;
};

export type CreateNursingShiftHandoffInput = CreateBaseReportInput & {
  shiftStartAt: Date;
  shiftEndAt: Date;
  patientStatusSummary: string;
  pendingTasksSummary: string;
  medicationSafetySummary: string;
  escalationStatus: 'none' | 'active' | 'resolved';
  nextShiftFocus: string;
  handoffLatitude: number;
  handoffLongitude: number;
  handoffAccuracyMeters?: number | null;
  distanceFromPatientMeters: number;
  withinPatientRadius: boolean;
  handoffAttestation: string;
};

export type NursingHandoffPerformerSummary = {
  id: string;
  effectiveDateTime: string | null;
  withinPatientRadius: boolean | null;
  distanceFromPatientMeters: number | null;
  incomingNurseAcknowledgedAt: string | null;
};

function baseReport(input: CreateBaseReportInput): Omit<CareReportResource, 'resourceType' | 'code' | 'component'> {
  return {
    status: 'final',
    category: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.observationCategory,
            code: 'survey',
            display: 'Survey',
          },
        ],
      },
    ],
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    performer: input.performerReference
      ? [{ reference: input.performerReference, display: input.performerDisplay ?? undefined }]
      : undefined,
    effectiveDateTime: (input.recordedAt ?? new Date()).toISOString(),
    note: input.noteBody ? [{ text: input.noteBody }] : undefined,
  };
}

export async function createNursingReport(input: CreateNursingReportInput): Promise<CareReportResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'Observation',
    ...baseReport(input),
    code: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.reportType,
          code: 'nursing-daily-report',
          display: 'Nursing Daily Report',
        },
      ],
      text: 'Nursing Daily Report',
    },
    component: [
      input.conditionSummary
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'condition-summary',
                  display: 'Condition Summary',
                },
              ],
            },
            valueString: input.conditionSummary,
          }
        : undefined,
      typeof input.escalationNeeded === 'boolean'
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'escalation-needed',
                  display: 'Escalation Needed',
                },
              ],
            },
            valueString: input.escalationNeeded ? 'yes' : 'no',
          }
        : undefined,
      input.followUpPlan
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'follow-up-plan',
                  display: 'Follow-up Plan',
                },
              ],
            },
            valueString: input.followUpPlan,
          }
        : undefined,
    ].filter(Boolean) as NonNullable<CareReportResource['component']>,
  } as never)) as CareReportResource;
}

export async function createPhysioSessionReport(input: CreatePhysioReportInput): Promise<CareReportResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'Observation',
    ...baseReport(input),
    code: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.reportType,
          code: 'physio-session-report',
          display: 'Physiotherapy Session Report',
        },
      ],
      text: 'Physiotherapy Session Report',
    },
    component: [
      input.interventions
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'interventions',
                  display: 'Interventions',
                },
              ],
            },
            valueString: input.interventions,
          }
        : undefined,
      typeof input.painBefore === 'number'
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'pain-before',
                  display: 'Pain Before',
                },
              ],
            },
            valueInteger: input.painBefore,
          }
        : undefined,
      typeof input.painAfter === 'number'
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'pain-after',
                  display: 'Pain After',
                },
              ],
            },
            valueInteger: input.painAfter,
          }
        : undefined,
      input.responseSummary
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'response-summary',
                  display: 'Response Summary',
                },
              ],
            },
            valueString: input.responseSummary,
          }
        : undefined,
      input.homePlan
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'home-plan',
                  display: 'Home Plan',
                },
              ],
            },
            valueString: input.homePlan,
          }
        : undefined,
    ].filter(Boolean) as NonNullable<CareReportResource['component']>,
  } as never)) as CareReportResource;
}

export async function createNursingShiftHandoffReport(input: CreateNursingShiftHandoffInput): Promise<CareReportResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'Observation',
    ...baseReport(input),
    code: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.reportType,
          code: 'nursing-shift-handoff',
          display: 'Nursing Shift Handoff',
        },
      ],
      text: 'Nursing Shift Handoff',
    },
    component: [
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'shift-start-at',
              display: 'Shift Start Time',
            },
          ],
        },
        valueString: input.shiftStartAt.toISOString(),
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'shift-end-at',
              display: 'Shift End Time',
            },
          ],
        },
        valueString: input.shiftEndAt.toISOString(),
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'patient-status-summary',
              display: 'Patient Status Summary',
            },
          ],
        },
        valueString: input.patientStatusSummary,
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'pending-tasks-summary',
              display: 'Pending Tasks Summary',
            },
          ],
        },
        valueString: input.pendingTasksSummary,
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'medication-safety-summary',
              display: 'Medication Safety Summary',
            },
          ],
        },
        valueString: input.medicationSafetySummary,
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'escalation-status',
              display: 'Escalation Status',
            },
          ],
        },
        valueString: input.escalationStatus,
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'next-shift-focus',
              display: 'Next Shift Focus',
            },
          ],
        },
        valueString: input.nextShiftFocus,
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'handoff-latitude',
              display: 'Handoff Latitude',
            },
          ],
        },
        valueString: String(input.handoffLatitude),
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'handoff-longitude',
              display: 'Handoff Longitude',
            },
          ],
        },
        valueString: String(input.handoffLongitude),
      },
      typeof input.handoffAccuracyMeters === 'number'
        ? {
            code: {
              coding: [
                {
                  system: MEDPLUM_CODE_SYSTEMS.reportType,
                  code: 'handoff-location-accuracy-m',
                  display: 'Handoff Location Accuracy (m)',
                },
              ],
            },
            valueString: String(Math.round(input.handoffAccuracyMeters)),
          }
        : undefined,
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'distance-from-patient-m',
              display: 'Distance From Patient Location (m)',
            },
          ],
        },
        valueString: String(Math.round(input.distanceFromPatientMeters)),
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'within-patient-location-radius',
              display: 'Within Patient Location Radius',
            },
          ],
        },
        valueString: input.withinPatientRadius ? 'yes' : 'no',
      },
      {
        code: {
          coding: [
            {
              system: MEDPLUM_CODE_SYSTEMS.reportType,
              code: 'handoff-attestation',
              display: 'Handoff Attestation',
            },
          ],
        },
        valueString: input.handoffAttestation,
      },
    ].filter(Boolean) as NonNullable<CareReportResource['component']>,
  } as never)) as CareReportResource;
}

export function careReportCode(report: CareReportResource): string {
  return report.code?.coding?.[0]?.code ?? 'unknown';
}

export function careReportComponentText(report: CareReportResource, code: string): string | null {
  const component = report.component?.find((entry) => entry.code?.coding?.[0]?.code === code);
  if (!component) return null;
  if (typeof component.valueString === 'string' && component.valueString.trim()) return component.valueString;
  if (typeof component.valueInteger === 'number') return String(component.valueInteger);
  return null;
}

function mapNursingHandoffSummary(report: CareReportResource): NursingHandoffPerformerSummary | null {
  if (!report.id) {
    return null;
  }

  const withinRadiusRaw = careReportComponentText(report, 'within-patient-location-radius');
  const distanceRaw = careReportComponentText(report, 'distance-from-patient-m');
  const acknowledgedAt = careReportComponentText(report, 'incoming-nurse-acknowledged-at');

  return {
    id: report.id,
    effectiveDateTime: report.effectiveDateTime ?? null,
    withinPatientRadius:
      withinRadiusRaw === null
        ? null
        : withinRadiusRaw.toLowerCase() === 'yes'
          ? true
          : withinRadiusRaw.toLowerCase() === 'no'
            ? false
            : null,
    distanceFromPatientMeters: distanceRaw ? Number(distanceRaw) : null,
    incomingNurseAcknowledgedAt: acknowledgedAt,
  };
}

export async function listNursingShiftHandoffsByPerformer(
  performerReference: string,
  options?: { count?: number; daysBack?: number },
): Promise<NursingHandoffPerformerSummary[]> {
  const medplum = await getMedplumClient();
  const daysBack = options?.daysBack ?? 30;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);
  const dateParam = `ge${sinceDate.toISOString().slice(0, 10)}`;

  const reports = (await medplum.searchResources('Observation', {
    category: 'survey',
    code: 'nursing-shift-handoff',
    performer: performerReference,
    date: dateParam,
    _count: String(options?.count ?? 200),
    _sort: '-date',
  })) as CareReportResource[];

  return reports
    .map(mapNursingHandoffSummary)
    .filter((item): item is NursingHandoffPerformerSummary => !!item);
}

export async function listPatientCareReports(patientId: string, count = 80): Promise<CareReportResource[]> {
  const medplum = await getMedplumClient();

  return (await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    category: 'survey',
    _count: String(count),
    _sort: '-date',
  })) as CareReportResource[];
}
