import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import {
  CARE_PROGRAM_SYSTEM,
  CareProgramCoding,
  type CareProgramCode,
  EgyptianExtensions,
} from '@/lib/medplum/fhir-extensions';

type FhirReference = {
  reference: string;
  display?: string;
};

type CarePlanStatus = 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';

type CarePlanIntent = 'proposal' | 'plan' | 'order' | 'option';

type FhirExtension = {
  url: string;
  valueCodeableConcept?: {
    coding: Array<{ system: string; code: string; display?: string }>;
    text?: string;
  };
};

type FhirCarePlan = {
  resourceType: 'CarePlan';
  status: CarePlanStatus;
  intent: CarePlanIntent;
  title: string;
  subject: FhirReference;
  period?: {
    start?: string;
    end?: string;
  };
  category: Array<{
    coding: Array<{ system: string; code: string; display?: string }>;
  }>;
  extension: FhirExtension[];
  description?: string;
};

export type CarePlanSummary = {
  id: string;
  title: string;
  status: CarePlanStatus;
  description?: string;
  start?: string;
  end?: string;
  program?: string;
};

type BuildCarePlanInput = {
  patientId: string;
  program: CareProgramCode;
  title?: string;
  description?: string;
  status?: CarePlanStatus;
  intent?: CarePlanIntent;
  start?: Date;
  end?: Date;
};

export function buildProgramCarePlan(input: BuildCarePlanInput): FhirCarePlan {
  const coding = CareProgramCoding[input.program];

  return {
    resourceType: 'CarePlan',
    status: input.status ?? 'active',
    intent: input.intent ?? 'plan',
    title: input.title ?? `${coding.display} Care Plan`,
    subject: { reference: `Patient/${input.patientId}` },
    period: {
      start: input.start?.toISOString(),
      end: input.end?.toISOString(),
    },
    category: [
      {
        coding: [
          {
            system: CARE_PROGRAM_SYSTEM,
            code: coding.code,
            display: coding.display,
          },
        ],
      },
    ],
    extension: [
      {
        url: EgyptianExtensions.careProgram,
        valueCodeableConcept: {
          coding: [
            {
              system: CARE_PROGRAM_SYSTEM,
              code: coding.code,
              display: coding.display,
            },
          ],
          text: coding.display,
        },
      },
    ],
    description: input.description,
  };
}

type CreateProgramCarePlanInput = {
  medplumPatientId: string;
  program: CareProgramCode;
  title?: string;
  description?: string;
  start?: Date;
  end?: Date;
};

/**
 * Create a program CarePlan in Medplum for a patient, idempotent per
 * patient + program: if an active CarePlan for the same program already
 * exists, it is returned instead of creating a duplicate.
 */
export async function createProgramCarePlan(input: CreateProgramCarePlanInput): Promise<FhirCarePlan> {
  const medplum = await getMedplumClient();
  const coding = CareProgramCoding[input.program];

  const existing = await medplum.searchOne('CarePlan', {
    subject: `Patient/${input.medplumPatientId}`,
    category: `${CARE_PROGRAM_SYSTEM}|${coding.code}`,
    status: 'active',
  });

  if (existing) {
    return existing as unknown as FhirCarePlan;
  }

  const carePlan = buildProgramCarePlan({
    patientId: input.medplumPatientId,
    program: input.program,
    title: input.title,
    description: input.description,
    start: input.start,
    end: input.end,
  });

  return (await medplum.createResource(carePlan as never)) as unknown as FhirCarePlan;
}

function extractProgramLabel(carePlan: FhirCarePlan): string | undefined {
  const coding = carePlan.extension?.[0]?.valueCodeableConcept?.coding?.[0];
  return coding?.display ?? coding?.code ?? undefined;
}

export async function listPatientCarePlans(patientId: string, count = 20): Promise<CarePlanSummary[]> {
  const medplum = await getMedplumClient();

  const carePlans = (await medplum.searchResources('CarePlan', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as FhirCarePlan[];

  return carePlans
    .map((carePlan) => ({
      id: (carePlan as { id?: string }).id ?? '',
      title: carePlan.title,
      status: carePlan.status,
      description: carePlan.description,
      start: carePlan.period?.start,
      end: carePlan.period?.end,
      program: extractProgramLabel(carePlan),
    }))
    .filter((carePlan) => !!carePlan.id);
}
