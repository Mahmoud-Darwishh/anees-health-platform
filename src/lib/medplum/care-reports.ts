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

export async function listPatientCareReports(patientId: string, count = 80): Promise<CareReportResource[]> {
  const medplum = await getMedplumClient();

  return (await medplum.searchResources('Observation', {
    subject: `Patient/${patientId}`,
    category: 'survey',
    _count: String(count),
    _sort: '-date',
  })) as CareReportResource[];
}
