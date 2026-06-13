import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';
import { MEDPLUM_CODE_SYSTEMS } from '@/lib/medplum/constants';
import {
  booleanComponent,
  compactComponents,
  integerComponent,
  requiredStringComponent,
  stringComponent,
} from '@/lib/medplum/care-report-components';

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
  sessionTemplate?: 'post_op_knee' | 'stroke_rehab' | 'low_back_pain' | 'geriatric_mobility' | 'custom' | null;
  sessionNumberLabel?: string | null;
  subjectiveFunction?: string | null;
  objectiveSummary?: string | null;
  postOpKneeFlexionDeg?: number | null;
  postOpKneeExtensionDeg?: number | null;
  postOpKneeEffusionGrade?: '0' | '1' | '2' | '3' | null;
  postOpKneeGaitPhase?: 'loading_response' | 'mid_stance' | 'terminal_stance' | 'swing' | 'antalgic' | null;
  strokeAshworthScore?: number | null;
  strokeBergScore?: number | null;
  strokeFunctionalReachCm?: number | null;
  lowBackSlrLeftDeg?: number | null;
  lowBackSlrRightDeg?: number | null;
  lowBackSchoberCm?: number | null;
  lowBackPainWithMovement?: boolean | null;
  geriatricTugSeconds?: number | null;
  geriatricTinettiScore?: number | null;
  geriatricFallRiskClass?: 'low' | 'moderate' | 'high' | null;
  interventions?: string | null;
  painBefore?: number | null;
  painAfter?: number | null;
  responseSummary?: string | null;
  homePlan?: string | null;
  nextSessionFocus?: string | null;
  dischargeReadiness?: 'not_yet' | 'one_to_two_sessions' | 'ready' | null;
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
    component: compactComponents([
      stringComponent('condition-summary', 'Condition Summary', input.conditionSummary),
      booleanComponent('escalation-needed', 'Escalation Needed', input.escalationNeeded),
      stringComponent('follow-up-plan', 'Follow-up Plan', input.followUpPlan),
    ]),
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
    component: compactComponents([
      stringComponent('session-template', 'Session Template', input.sessionTemplate),
      stringComponent('session-number-label', 'Session Number Label', input.sessionNumberLabel),
      stringComponent('subjective-function', 'Subjective Function', input.subjectiveFunction),
      stringComponent('objective-summary', 'Objective Summary', input.objectiveSummary),
      integerComponent('post-op-knee-flexion-deg', 'Post-op Knee Flexion (deg)', input.postOpKneeFlexionDeg),
      integerComponent('post-op-knee-extension-deg', 'Post-op Knee Extension (deg)', input.postOpKneeExtensionDeg),
      stringComponent('post-op-knee-effusion-grade', 'Post-op Knee Effusion Grade', input.postOpKneeEffusionGrade),
      stringComponent('post-op-knee-gait-phase', 'Post-op Knee Gait Phase', input.postOpKneeGaitPhase),
      integerComponent('stroke-ashworth-score', 'Stroke Ashworth Score', input.strokeAshworthScore),
      integerComponent('stroke-berg-score', 'Stroke Berg Score', input.strokeBergScore),
      integerComponent('stroke-functional-reach-cm', 'Stroke Functional Reach (cm)', input.strokeFunctionalReachCm),
      integerComponent('low-back-slr-left-deg', 'Low Back SLR Left (deg)', input.lowBackSlrLeftDeg),
      integerComponent('low-back-slr-right-deg', 'Low Back SLR Right (deg)', input.lowBackSlrRightDeg),
      integerComponent('low-back-schober-cm', 'Low Back Schober (cm)', input.lowBackSchoberCm),
      booleanComponent('low-back-pain-with-movement', 'Low Back Pain with Movement', input.lowBackPainWithMovement),
      integerComponent('geriatric-tug-seconds', 'Geriatric TUG (seconds)', input.geriatricTugSeconds),
      integerComponent('geriatric-tinetti-score', 'Geriatric Tinetti Score', input.geriatricTinettiScore),
      stringComponent('geriatric-fall-risk-class', 'Geriatric Fall Risk Class', input.geriatricFallRiskClass),
      stringComponent('interventions', 'Interventions', input.interventions),
      integerComponent('pain-before', 'Pain Before', input.painBefore),
      integerComponent('pain-after', 'Pain After', input.painAfter),
      stringComponent('response-summary', 'Response Summary', input.responseSummary),
      stringComponent('home-plan', 'Home Plan', input.homePlan),
      stringComponent('next-session-focus', 'Next Session Focus', input.nextSessionFocus),
      stringComponent('discharge-readiness', 'Discharge Readiness', input.dischargeReadiness),
    ]),
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
    component: compactComponents([
      requiredStringComponent('shift-start-at', 'Shift Start Time', input.shiftStartAt.toISOString()),
      requiredStringComponent('shift-end-at', 'Shift End Time', input.shiftEndAt.toISOString()),
      requiredStringComponent('patient-status-summary', 'Patient Status Summary', input.patientStatusSummary),
      requiredStringComponent('pending-tasks-summary', 'Pending Tasks Summary', input.pendingTasksSummary),
      requiredStringComponent('medication-safety-summary', 'Medication Safety Summary', input.medicationSafetySummary),
      requiredStringComponent('escalation-status', 'Escalation Status', input.escalationStatus),
      requiredStringComponent('next-shift-focus', 'Next Shift Focus', input.nextShiftFocus),
      requiredStringComponent('handoff-latitude', 'Handoff Latitude', String(input.handoffLatitude)),
      requiredStringComponent('handoff-longitude', 'Handoff Longitude', String(input.handoffLongitude)),
      stringComponent(
        'handoff-location-accuracy-m',
        'Handoff Location Accuracy (m)',
        typeof input.handoffAccuracyMeters === 'number' ? String(Math.round(input.handoffAccuracyMeters)) : null,
      ),
      requiredStringComponent(
        'distance-from-patient-m',
        'Distance From Patient Location (m)',
        String(Math.round(input.distanceFromPatientMeters)),
      ),
      requiredStringComponent(
        'within-patient-location-radius',
        'Within Patient Location Radius',
        input.withinPatientRadius ? 'yes' : 'no',
      ),
      requiredStringComponent('handoff-attestation', 'Handoff Attestation', input.handoffAttestation),
    ]),
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
