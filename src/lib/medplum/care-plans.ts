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
