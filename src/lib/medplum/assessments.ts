import 'server-only';

import { getMedplumClient } from './client';

type FhirReference = {
  reference?: string;
  display?: string;
};

export type QuestionnaireResponseResource = {
  resourceType: 'QuestionnaireResponse';
  id?: string;
  meta?: { versionId?: string; lastUpdated?: string };
  status: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  questionnaire: string;
  subject?: FhirReference;
  authored?: string;
  author?: FhirReference;
  encounter?: FhirReference;
  item?: Array<{
    linkId: string;
    text?: string;
    answer?: Array<{
      valueString?: string;
      valueInteger?: number;
    }>;
  }>;
};

export type AssessmentSummary = {
  id: string;
  title: string;
  type: string;
  score?: number;
  summary?: string;
  authored?: string;
  author?: string;
};

export type CreateAssessmentInput = {
  patientId: string;
  title: string;
  assessmentType: 'functional' | 'mobility' | 'pain' | 'other';
  score?: number | null;
  summary: string;
  notes?: string | null;
  encounterId?: string | null;
  recordedByReference?: string | null;
  recordedByDisplay?: string | null;
};

type QuestionnaireItem = NonNullable<QuestionnaireResponseResource['item']>[number];
type QuestionnaireAnswer = NonNullable<QuestionnaireItem['answer']>[number];

function pickAnswer(items: QuestionnaireResponseResource['item'], linkId: string): QuestionnaireAnswer | undefined {
  return items?.find((entry) => entry.linkId === linkId)?.answer?.[0];
}

function normalizeAssessment(resource: QuestionnaireResponseResource): AssessmentSummary | null {
  if (!resource.id) return null;

  const type = pickAnswer(resource.item, 'assessment-type')?.valueString ?? 'other';
  const score = pickAnswer(resource.item, 'assessment-score')?.valueInteger;
  const summary = pickAnswer(resource.item, 'assessment-summary')?.valueString;

  return {
    id: resource.id,
    title: pickAnswer(resource.item, 'assessment-title')?.valueString ?? 'Assessment',
    type,
    score,
    summary,
    authored: resource.authored,
    author: resource.author?.display ?? resource.author?.reference,
  };
}

export async function listPatientAssessments(patientId: string, count = 50): Promise<AssessmentSummary[]> {
  const medplum = await getMedplumClient();

  const responses = (await medplum.searchResources('QuestionnaireResponse', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-authored',
  })) as QuestionnaireResponseResource[];

  return responses.map(normalizeAssessment).filter((item): item is AssessmentSummary => !!item);
}

export async function createPatientAssessment(input: CreateAssessmentInput): Promise<QuestionnaireResponseResource> {
  const medplum = await getMedplumClient();

  return (await medplum.createResource({
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: 'Questionnaire/anees-assessment',
    subject: { reference: `Patient/${input.patientId}` },
    authored: new Date().toISOString(),
    author: input.recordedByReference
      ? { reference: input.recordedByReference, display: input.recordedByDisplay ?? undefined }
      : undefined,
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    item: [
      {
        linkId: 'assessment-type',
        text: 'Assessment Type',
        answer: [{ valueString: input.assessmentType }],
      },
      {
        linkId: 'assessment-title',
        text: 'Assessment Title',
        answer: [{ valueString: input.title }],
      },
      ...(typeof input.score === 'number'
        ? [{ linkId: 'assessment-score', text: 'Score', answer: [{ valueInteger: input.score }] }]
        : []),
      {
        linkId: 'assessment-summary',
        text: 'Summary',
        answer: [{ valueString: input.summary }],
      },
      ...(input.notes
        ? [{ linkId: 'assessment-notes', text: 'Notes', answer: [{ valueString: input.notes }] }]
        : []),
    ],
  } as never)) as QuestionnaireResponseResource;
}