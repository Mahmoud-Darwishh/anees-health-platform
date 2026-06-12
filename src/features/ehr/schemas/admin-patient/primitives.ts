import { z } from 'zod';

export const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  });

export const optionalHttpsUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed || undefined;
  })
  .refine((value) => !value || /^https:\/\//i.test(value), 'Location link must start with https://');

export const optionalNumber = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => value === null || Number.isFinite(value), 'Invalid number value');

export const requiredLatitude = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return Number.NaN;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => Number.isFinite(value), 'Current latitude is required')
  .refine((value) => value >= -90 && value <= 90, 'Latitude must be between -90 and 90');

export const requiredLongitude = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return Number.NaN;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => Number.isFinite(value), 'Current longitude is required')
  .refine((value) => value >= -180 && value <= 180, 'Longitude must be between -180 and 180');

export const optionalAccuracyMeters = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => value === null || Number.isFinite(value), 'Invalid location accuracy value')
  .refine((value) => value === null || value >= 0, 'Location accuracy must be positive');

export const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

export const optionalSeverity = z
  .union([z.enum(['mild', 'moderate', 'severe']), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value ? value : undefined));

export const optionalBoolean = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'yes' || normalized === 'true') return true;
    if (normalized === 'no' || normalized === 'false') return false;
    return null;
  });

export const requiredDate = z
  .string()
  .trim()
  .refine((value) => !!value, 'Required date value is missing')
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date value');

export const requiredPatientId = z.string().trim().min(1, 'Patient id is required');
export const optionalEmail = optionalTrimmedString.transform((value) => value?.toLowerCase());

export const requiredVisitId = z.string().trim().min(1, 'Visit id is required');
export const visitDisruptionCode = z.enum([
  'patient_late_cancel',
  'patient_no_show',
  'patient_refused_care',
  'patient_hospitalised',
  'patient_deceased',
  'family_blocked_access',
  'unsafe_environment',
  'physio_personal_emergency',
  'physio_vehicle_breakdown',
  'physio_traffic_blocked',
  'weather',
  'med_ops_reassignment',
  'equipment_failure',
  'internet_blackout',
  'other',
]);

export function formDataToInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    medplumPatientId: formData.get('medplumPatientId'),
    encounterId: formData.get('encounterId'),
    status: formData.get('status'),
    visitType: formData.get('visitType'),
    startAt: formData.get('startAt'),
    notes: formData.get('notes'),
    visitId: formData.get('visitId'),
    acknowledgedAt: formData.get('acknowledgedAt'),
    enRouteAt: formData.get('enRouteAt'),
    arrivedAt: formData.get('arrivedAt'),
    checkInAt: formData.get('checkInAt'),
    checkInLatitude: formData.get('checkInLatitude'),
    checkInLongitude: formData.get('checkInLongitude'),
    checkInAccuracyMeters: formData.get('checkInAccuracyMeters'),
    geofenceOverrideMethod: formData.get('geofenceOverrideMethod'),
    geofenceOverrideReason: formData.get('geofenceOverrideReason'),
    geofenceOverrideMediaId: formData.get('geofenceOverrideMediaId'),
    checkOutAt: formData.get('checkOutAt'),
    checkOutLatitude: formData.get('checkOutLatitude'),
    checkOutLongitude: formData.get('checkOutLongitude'),
    checkOutAccuracyMeters: formData.get('checkOutAccuracyMeters'),
    eventAt: formData.get('eventAt'),
    disruptionCode: formData.get('disruptionCode'),
    disruptionNote: formData.get('disruptionNote'),
    reassignedProviderId: formData.get('reassignedProviderId'),
    nextScheduledDate: formData.get('nextScheduledDate'),
    nextScheduledTime: formData.get('nextScheduledTime'),
    recordedAt: formData.get('recordedAt'),
    systolicBp: formData.get('systolicBp'),
    diastolicBp: formData.get('diastolicBp'),
    heartRate: formData.get('heartRate'),
    temperatureC: formData.get('temperatureC'),
    glucoseMgDl: formData.get('glucoseMgDl'),
    weightKg: formData.get('weightKg'),
    spo2Pct: formData.get('spo2Pct'),
    painScore: formData.get('painScore'),
    noteTitle: formData.get('noteTitle'),
    noteDiscipline: formData.get('noteDiscipline'),
    noteBody: formData.get('noteBody'),
    compositionId: formData.get('compositionId'),
    noteVersionId: formData.get('noteVersionId'),
    sourceCompositionId: formData.get('sourceCompositionId'),
    amendmentTitle: formData.get('amendmentTitle'),
    amendmentBody: formData.get('amendmentBody'),
    staffId: formData.get('staffId'),
    practitionerReference: formData.get('practitionerReference'),
    careTeamVersionId: formData.get('careTeamVersionId'),
    taskTitle: formData.get('taskTitle'),
    taskDescription: formData.get('taskDescription'),
    taskDueDate: formData.get('taskDueDate'),
    taskId: formData.get('taskId'),
    nextStatus: formData.get('nextStatus'),
    taskVersionId: formData.get('taskVersionId'),
    conditionSummary: formData.get('conditionSummary'),
    escalationNeeded: formData.get('escalationNeeded'),
    followUpPlan: formData.get('followUpPlan'),
    shiftStartAt: formData.get('shiftStartAt'),
    shiftEndAt: formData.get('shiftEndAt'),
    patientStatusSummary: formData.get('patientStatusSummary'),
    pendingTasksSummary: formData.get('pendingTasksSummary'),
    medicationSafetySummary: formData.get('medicationSafetySummary'),
    escalationStatus: formData.get('escalationStatus'),
    nextShiftFocus: formData.get('nextShiftFocus'),
    handoffNote: formData.get('handoffNote'),
    handoffLatitude: formData.get('handoffLatitude'),
    handoffLongitude: formData.get('handoffLongitude'),
    handoffAccuracyMeters: formData.get('handoffAccuracyMeters'),
    handoffConfirmed: formData.get('handoffConfirmed'),
    physioVisitId: formData.get('physioVisitId'),
    sessionTemplate: formData.get('sessionTemplate'),
    sessionNumberLabel: formData.get('sessionNumberLabel'),
    subjectiveFunction: formData.get('subjectiveFunction'),
    objectiveSummary: formData.get('objectiveSummary'),
    postOpKneeFlexionDeg: formData.get('postOpKneeFlexionDeg'),
    postOpKneeExtensionDeg: formData.get('postOpKneeExtensionDeg'),
    postOpKneeEffusionGrade: formData.get('postOpKneeEffusionGrade'),
    postOpKneeGaitPhase: formData.get('postOpKneeGaitPhase'),
    strokeAshworthScore: formData.get('strokeAshworthScore'),
    strokeBergScore: formData.get('strokeBergScore'),
    strokeFunctionalReachCm: formData.get('strokeFunctionalReachCm'),
    lowBackSlrLeftDeg: formData.get('lowBackSlrLeftDeg'),
    lowBackSlrRightDeg: formData.get('lowBackSlrRightDeg'),
    lowBackSchoberCm: formData.get('lowBackSchoberCm'),
    lowBackPainWithMovement: formData.get('lowBackPainWithMovement'),
    geriatricTugSeconds: formData.get('geriatricTugSeconds'),
    geriatricTinettiScore: formData.get('geriatricTinettiScore'),
    geriatricFallRiskClass: formData.get('geriatricFallRiskClass'),
    interventions: formData.get('interventions'),
    painBefore: formData.get('painBefore'),
    painAfter: formData.get('painAfter'),
    responseSummary: formData.get('responseSummary'),
    homePlan: formData.get('homePlan'),
    nextSessionFocus: formData.get('nextSessionFocus'),
    dischargeReadiness: formData.get('dischargeReadiness'),
    conditionCategory: formData.get('conditionCategory'),
    conditionLabel: formData.get('conditionLabel'),
    conditionCode: formData.get('conditionCode'),
    conditionOnsetDate: formData.get('conditionOnsetDate'),
    conditionNote: formData.get('conditionNote'),
    conditionId: formData.get('conditionId'),
    conditionStatus: formData.get('conditionStatus'),
    allergen: formData.get('allergen'),
    allergySeverity: formData.get('allergySeverity'),
    allergyNote: formData.get('allergyNote'),
    allergyId: formData.get('allergyId'),
    allergyStatus: formData.get('allergyStatus'),
    medicationName: formData.get('medicationName'),
    dosageText: formData.get('dosageText'),
    routeText: formData.get('routeText'),
    frequencyText: formData.get('frequencyText'),
    startDate: formData.get('startDate'),
    medicationDurationDays: formData.get('medicationDurationDays'),
    medicationNote: formData.get('medicationNote'),
    medicationId: formData.get('medicationId'),
    medicationManageStatus: formData.get('medicationManageStatus'),
    medicationStatementId: formData.get('medicationStatementId'),
    administrationStatus: formData.get('administrationStatus'),
    scheduledAt: formData.get('scheduledAt'),
    administeredAt: formData.get('administeredAt'),
    administrationReason: formData.get('administrationReason'),
    administrationNote: formData.get('administrationNote'),
    administrationId: formData.get('administrationId'),
    documentTitle: formData.get('documentTitle'),
    documentId: formData.get('documentId'),
    approvalTokenId: formData.get('approvalTokenId'),
    deleteApprovalReason: formData.get('deleteApprovalReason'),
    documentCategory: formData.get('documentCategory'),
    documentDate: formData.get('documentDate'),
    documentNote: formData.get('documentNote'),
    labOrderTitle: formData.get('labOrderTitle'),
    labOrderCategory: formData.get('labOrderCategory'),
    labOrderCode: formData.get('labOrderCode'),
    labOrderDate: formData.get('labOrderDate'),
    labOrderNote: formData.get('labOrderNote'),
    diagnosticTitle: formData.get('diagnosticTitle'),
    diagnosticCategory: formData.get('diagnosticCategory'),
    diagnosticStatus: formData.get('diagnosticStatus'),
    diagnosticConclusion: formData.get('diagnosticConclusion'),
    diagnosticIssuedOn: formData.get('diagnosticIssuedOn'),
    diagnosticEffectiveOn: formData.get('diagnosticEffectiveOn'),
    diagnosticNote: formData.get('diagnosticNote'),
    linkedLabOrderId: formData.get('linkedLabOrderId'),
    assessmentTitle: formData.get('assessmentTitle'),
    assessmentType: formData.get('assessmentType'),
    assessmentScore: formData.get('assessmentScore'),
    assessmentSummary: formData.get('assessmentSummary'),
    assessmentNote: formData.get('assessmentNote'),
    assessmentEncounterId: formData.get('assessmentEncounterId'),
    communicationCategory: formData.get('communicationCategory'),
    communicationPriority: formData.get('communicationPriority'),
    communicationMessage: formData.get('communicationMessage'),
    communicationRecipientStaffId: formData.get('communicationRecipientStaffId'),
    communicationEncounterId: formData.get('communicationEncounterId'),
    linkedTaskId: formData.get('linkedTaskId'),
    incidentType: formData.get('incidentType'),
    incidentSeverity: formData.get('incidentSeverity'),
    incidentSummary: formData.get('incidentSummary'),
    incidentActionsTaken: formData.get('incidentActionsTaken'),
    incidentEscalationNeeded: formData.get('incidentEscalationNeeded'),
    escalationTitle: formData.get('escalationTitle'),
    escalationSummary: formData.get('escalationSummary'),
    escalationPriority: formData.get('escalationPriority'),
    escalationDueDate: formData.get('escalationDueDate'),
    escalationEncounterId: formData.get('escalationEncounterId'),
    escalationOwnerStaffId: formData.get('escalationOwnerStaffId'),
    appointmentStart: formData.get('appointmentStart'),
    appointmentEnd: formData.get('appointmentEnd'),
    appointmentType: formData.get('appointmentType'),
    appointmentNote: formData.get('appointmentNote'),
    appointmentOwnerStaffId: formData.get('appointmentOwnerStaffId'),
    primaryNurseStaffId: formData.get('primaryNurseStaffId'),
    shiftNotes: formData.get('shiftNotes'),
    assignmentId: formData.get('assignmentId'),
    incomingNurseStaffId: formData.get('incomingNurseStaffId'),
    acknowledgementNote: formData.get('acknowledgementNote'),
    handoffGeofenceRadiusMeters: formData.get('handoffGeofenceRadiusMeters'),
    temporarilyAwayUntil: formData.get('temporarilyAwayUntil'),
    temporarilyAwayNote: formData.get('temporarilyAwayNote'),
    restrictedAccessReason: formData.get('restrictedAccessReason'),
    breakGlassReason: formData.get('breakGlassReason'),
    standingOrderDiscipline: formData.get('standingOrderDiscipline'),
    standingOrderTitle: formData.get('standingOrderTitle'),
    standingOrderInstructions: formData.get('standingOrderInstructions'),
    standingOrderValidUntil: formData.get('standingOrderValidUntil'),
    standingOrderId: formData.get('standingOrderId'),
    executionVisitId: formData.get('executionVisitId'),
    executionRecordedAt: formData.get('executionRecordedAt'),
    executionNote: formData.get('executionNote'),
    patientVersionId: formData.get('patientVersionId'),
    addressDetail: formData.get('addressDetail'),
    landmark: formData.get('landmark'),
    addressMapUrl: formData.get('addressMapUrl'),
    emergencyContactName: formData.get('emergencyContactName'),
    emergencyContactPhone: formData.get('emergencyContactPhone'),
    emergencyContactRelation: formData.get('emergencyContactRelation'),
    consentId: formData.get('consentId'),
    consentVersionId: formData.get('consentVersionId'),
    caregiverPhone: formData.get('caregiverPhone'),
    caregiverEmail: formData.get('caregiverEmail'),
    decision: formData.get('decision'),
    scopeProfile: formData.get('scopeProfile'),
    scopeVisits: formData.get('scopeVisits'),
    scopeVitals: formData.get('scopeVitals'),
    scopeNotes: formData.get('scopeNotes'),
    scopeTasks: formData.get('scopeTasks'),
    secondaryEmergencyContactName: formData.get('secondaryEmergencyContactName'),
    secondaryEmergencyContactPhone: formData.get('secondaryEmergencyContactPhone'),
    secondaryEmergencyContactRelation: formData.get('secondaryEmergencyContactRelation'),
  };
}

