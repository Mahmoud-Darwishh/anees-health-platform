import 'server-only';

import { getMedplumClient } from './client';
import { MEDPLUM_CODE_SYSTEMS } from './constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

type FhirCodeableConcept = {
  coding?: FhirCoding[];
  text?: string;
};

type GoalTarget = {
  measure?: FhirCodeableConcept;
  detailString?: string;
  dueDate?: string;
};

export type GoalResource = {
  resourceType: 'Goal';
  id?: string;
  identifier?: Array<{ system?: string; value?: string }>;
  lifecycleStatus?:
    | 'proposed'
    | 'planned'
    | 'accepted'
    | 'active'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'entered-in-error'
    | 'rejected';
  achievementStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  description?: FhirCodeableConcept;
  subject?: FhirReference;
  startDate?: string;
  statusDate?: string;
  expressedBy?: FhirReference;
  target?: GoalTarget[];
  note?: Array<{
    authorReference?: FhirReference;
    time?: string;
    text?: string;
  }>;
};

export type LegacyPatientGoalSnapshot = {
  localGoalId: string;
  patientMedplumId: string;
  text: string;
  category: string | null;
  baselineValue: string | null;
  currentValue: string | null;
  targetValue: string | null;
  measurementUnit: string | null;
  targetDate: Date | null;
  status: 'in_progress' | 'met' | 'discontinued';
  metAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorReference?: string;
  authorDisplay?: string;
};

export type PhysioGoalSummary = {
  id: string;
  text: string;
  status: 'in_progress' | 'met' | 'discontinued';
  category: string | null;
  currentValue: string | null;
  targetValue: string | null;
  targetDate: Date | null;
  measurementUnit: string | null;
};

function toLifecycleStatus(status: LegacyPatientGoalSnapshot['status']): GoalResource['lifecycleStatus'] {
  if (status === 'met') return 'completed';
  if (status === 'discontinued') return 'cancelled';
  return 'active';
}

function toAchievementStatus(status: LegacyPatientGoalSnapshot['status']): FhirCodeableConcept | undefined {
  if (status === 'met') {
    return {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
          code: 'achieved',
          display: 'Achieved',
        },
      ],
      text: 'Achieved',
    };
  }

  if (status === 'discontinued') {
    return {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
          code: 'not-achieved',
          display: 'Not Achieved',
        },
      ],
      text: 'Not achieved',
    };
  }

  return {
    coding: [
      {
        system: 'http://terminology.hl7.org/CodeSystem/goal-achievement',
        code: 'in-progress',
        display: 'In Progress',
      },
    ],
    text: 'In progress',
  };
}

function buildGoalNote(input: LegacyPatientGoalSnapshot): string {
  const lines: string[] = [];

  if (input.category) {
    lines.push(`Category: ${input.category}`);
  }

  if (input.baselineValue) {
    lines.push(`Baseline: ${input.baselineValue}`);
  }

  if (input.currentValue) {
    lines.push(`Current: ${input.currentValue}`);
  }

  if (input.targetValue) {
    lines.push(`Target: ${input.targetValue}`);
  }

  if (input.measurementUnit) {
    lines.push(`Unit: ${input.measurementUnit}`);
  }

  if (input.status === 'met' && input.metAt) {
    lines.push(`Met at: ${input.metAt.toISOString()}`);
  }

  return lines.join('\n');
}

function buildTarget(input: LegacyPatientGoalSnapshot): GoalTarget[] | undefined {
  if (!input.targetValue && !input.targetDate && !input.measurementUnit) {
    return undefined;
  }

  return [
    {
      measure: input.measurementUnit ? { text: input.measurementUnit } : undefined,
      detailString: input.targetValue ?? undefined,
      dueDate: input.targetDate?.toISOString(),
    },
  ];
}

function buildGoalResource(input: LegacyPatientGoalSnapshot): GoalResource {
  const noteText = buildGoalNote(input);

  return {
    resourceType: 'Goal',
    identifier: [
      {
        system: MEDPLUM_CODE_SYSTEMS.patientGoalId,
        value: input.localGoalId,
      },
    ],
    lifecycleStatus: toLifecycleStatus(input.status),
    achievementStatus: toAchievementStatus(input.status),
    category: input.category
      ? [
          {
            coding: [
              {
                system: MEDPLUM_CODE_SYSTEMS.reportType,
                code: `patient-goal-${input.category}`,
                display: input.category,
              },
            ],
            text: input.category,
          },
        ]
      : undefined,
    description: {
      text: input.text,
    },
    subject: {
      reference: `Patient/${input.patientMedplumId}`,
    },
    startDate: input.createdAt.toISOString(),
    statusDate: (input.metAt ?? input.updatedAt).toISOString(),
    expressedBy: input.authorReference
      ? {
          reference: input.authorReference,
          display: input.authorDisplay,
        }
      : undefined,
    target: buildTarget(input),
    note: noteText
      ? [
          {
            authorReference: input.authorReference
              ? {
                  reference: input.authorReference,
                  display: input.authorDisplay,
                }
              : undefined,
            time: input.updatedAt.toISOString(),
            text: noteText,
          },
        ]
      : undefined,
  };
}

function extractNoteValue(noteText: string | undefined, label: string): string | null {
  if (!noteText) return null;

  const match = noteText.match(new RegExp(`^${label}:\\s*(.+)$`, 'mi'));
  return match?.[1]?.trim() || null;
}

function parseGoalStatus(resource: GoalResource): PhysioGoalSummary['status'] {
  const lifecycleStatus = resource.lifecycleStatus ?? '';
  if (lifecycleStatus === 'completed') return 'met';
  if (lifecycleStatus === 'cancelled' || lifecycleStatus === 'entered-in-error') return 'discontinued';

  const achievementCode = resource.achievementStatus?.coding?.[0]?.code ?? '';
  if (achievementCode === 'achieved') return 'met';
  if (achievementCode === 'not-achieved') return 'discontinued';

  return 'in_progress';
}

function normalizeGoalResource(resource: GoalResource): PhysioGoalSummary | null {
  if (!resource.id) {
    return null;
  }

  const noteText = resource.note?.[0]?.text;
  const target = resource.target?.[0];
  const category = resource.category?.[0]?.text ?? resource.category?.[0]?.coding?.[0]?.display ?? null;
  const text = resource.description?.text ?? noteText ?? 'Goal';

  return {
    id: resource.id,
    text,
    status: parseGoalStatus(resource),
    category,
    currentValue: extractNoteValue(noteText, 'Current'),
    targetValue: target?.detailString ?? extractNoteValue(noteText, 'Target'),
    targetDate: target?.dueDate ? new Date(target.dueDate) : null,
    measurementUnit: target?.measure?.text ?? extractNoteValue(noteText, 'Unit'),
  };
}

export async function listPatientGoalsFromMedplum(
  patientMedplumId: string,
  count = 50,
): Promise<PhysioGoalSummary[]> {
  const medplum = await getMedplumClient();

  const resources = (await medplum.searchResources('Goal', {
    subject: `Patient/${patientMedplumId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as GoalResource[];

  return resources.map(normalizeGoalResource).filter((goal): goal is PhysioGoalSummary => !!goal);
}

async function findGoalByLegacyId(localGoalId: string): Promise<GoalResource | null> {
  const medplum = await getMedplumClient();
  const existing = (await medplum.searchOne('Goal', {
    identifier: `${MEDPLUM_CODE_SYSTEMS.patientGoalId}|${localGoalId}`,
  })) as GoalResource | null;

  return existing;
}

export async function upsertMedplumGoalFromLegacy(input: LegacyPatientGoalSnapshot): Promise<GoalResource> {
  const medplum = await getMedplumClient();
  const draft = buildGoalResource(input);

  const existing = await findGoalByLegacyId(input.localGoalId);
  const saved = existing?.id
    ? ((await medplum.updateResource({
        ...existing,
        ...draft,
        id: existing.id,
      } as never)) as GoalResource)
    : ((await medplum.createResource(draft as never)) as GoalResource);

  if (!saved.id) {
    throw new Error('Failed to persist FHIR Goal id.');
  }

  return saved;
}
