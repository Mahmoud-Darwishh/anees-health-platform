import type { PatientEhrSnapshot } from './patient-snapshot';

export type ChartEventType =
  | 'visit'
  | 'progress-note'
  | 'progress-note-addendum'
  | 'vitals'
  | 'medication'
  | 'allergy'
  | 'document'
  | 'care-message'
  | 'call-routing'
  | 'triage'
  | 'physio-report'
  | 'nurse-report'
  | 'care-plan';

export type ChartEvent = {
  id: string;
  type: ChartEventType;
  timestamp: Date;
  title: string;
  subtitle: string;
  detail?: string;
};

function safeJoin(values: Array<string | null | undefined>, separator: string): string {
  return values.filter((value): value is string => !!value).join(separator);
}

export function buildChartTimeline(patient: PatientEhrSnapshot): ChartEvent[] {
  const events: ChartEvent[] = [];

  patient.visits.forEach((visit) => {
    events.push({
      id: `visit-${visit.id}`,
      type: 'visit',
      timestamp: visit.scheduledDate,
      title: 'Visit scheduled',
      subtitle: safeJoin([visit.code, visit.service.name, visit.status], ' • '),
    });
  });

  patient.progressNotes.forEach((note) => {
    events.push({
      id: `note-${note.id}`,
      type: 'progress-note',
      timestamp: note.createdAt,
      title: note.signedOffAt ? 'Signed progress note' : 'Draft progress note',
      subtitle: note.signedOffAt ? 'Locked clinical note' : 'Awaiting sign-off',
      detail: note.noteBody,
    });

    note.addendums.forEach((addendum) => {
      events.push({
        id: `note-addendum-${addendum.id}`,
        type: 'progress-note-addendum',
        timestamp: addendum.createdAt,
        title: 'Progress note addendum',
        subtitle: addendum.enteredByStaff?.name ?? 'Staff addendum',
        detail: addendum.addendumBody,
      });
    });
  });

  patient.vitalSigns.forEach((vital) => {
    events.push({
      id: `vital-${vital.id}`,
      type: 'vitals',
      timestamp: vital.measuredAt,
      title: 'Vital signs recorded',
      subtitle: safeJoin([
        vital.systolicBp?.toString(),
        vital.diastolicBp?.toString(),
        vital.heartRate ? `HR ${vital.heartRate}` : null,
      ], ' • '),
      detail: vital.notes ?? undefined,
    });
  });

  patient.medications.forEach((medication) => {
    events.push({
      id: `med-${medication.id}`,
      type: 'medication',
      timestamp: medication.startDate ?? medication.createdAt,
      title: medication.medicationName,
      subtitle: safeJoin([medication.dose, medication.frequency, medication.isActive ? 'active' : 'inactive'], ' • '),
    });
  });

  patient.allergies.forEach((allergy) => {
    events.push({
      id: `allergy-${allergy.id}`,
      type: 'allergy',
      timestamp: allergy.createdAt,
      title: allergy.allergen,
      subtitle: safeJoin([allergy.severity, allergy.reaction], ' • '),
    });
  });

  patient.documents.forEach((document) => {
    events.push({
      id: `document-${document.id}`,
      type: 'document',
      timestamp: document.createdAt,
      title: document.title,
      subtitle: document.category,
    });
  });

  patient.careTeamMessages.forEach((message) => {
    events.push({
      id: `message-${message.id}`,
      type: 'care-message',
      timestamp: message.createdAt,
      title: 'Care team message',
      subtitle: safeJoin([message.authorStaff?.name ?? null, message.channelType, message.visibilityScope], ' • '),
      detail: message.messageBody,
    });
  });

  patient.callRoutingTickets.forEach((ticket) => {
    events.push({
      id: `ticket-${ticket.id}`,
      type: 'call-routing',
      timestamp: ticket.createdAt,
      title: 'Routing ticket',
      subtitle: safeJoin([ticket.reasonCategory, ticket.triagePriority, ticket.status], ' • '),
    });
  });

  patient.aiTriageCases.forEach((triage) => {
    events.push({
      id: `triage-${triage.id}`,
      type: 'triage',
      timestamp: triage.createdAt,
      title: 'AI triage draft',
      subtitle: safeJoin([triage.urgencyLevel ?? null, triage.status], ' • '),
      detail: triage.symptomSummary,
    });
  });

  patient.physioSessionReports.forEach((report) => {
    events.push({
      id: `physio-${report.id}`,
      type: 'physio-report',
      timestamp: report.sessionDate,
      title: `Physio session #${report.sessionNumber}`,
      subtitle: safeJoin([
        report.enteredByStaff?.name ?? null,
        report.nextSessionDate ? `next ${report.nextSessionDate.toISOString().slice(0, 10)}` : null,
      ], ' • '),
      detail: report.interventions,
    });
  });

  patient.nurseDailyReports.forEach((report) => {
    events.push({
      id: `nurse-${report.id}`,
      type: 'nurse-report',
      timestamp: report.reportDate,
      title: 'Nurse daily report',
      subtitle: safeJoin([report.enteredByStaff?.name ?? null, report.shiftType ?? null, report.escalationFlag ? 'escalated' : 'routine'], ' • '),
      detail: report.escalationReason ?? report.nursingNotes,
    });
  });

  patient.carePlans.forEach((carePlan) => {
    events.push({
      id: `care-plan-${carePlan.id}`,
      type: 'care-plan',
      timestamp: carePlan.updatedAt,
      title: carePlan.planName,
      subtitle: safeJoin([carePlan.code, carePlan.status, `${carePlan.totalVisitsPlanned} visits`], ' • '),
      detail: carePlan.notes ?? undefined,
    });
  });

  return events.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
}