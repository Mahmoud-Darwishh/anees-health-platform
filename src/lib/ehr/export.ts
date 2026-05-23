import crypto from 'crypto';
import type { PatientEhrSnapshot } from './patient-snapshot';

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue };

function normalizeValue(value: unknown): SerializableValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, SerializableValue>>((accumulator, key) => {
        accumulator[key] = normalizeValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }
  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

export function hashExportPayload(value: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function createExportVerificationToken(payload: { patientId: string; generatedAt: string; exportHash: string }): string {
  return Buffer.from(stableStringify(payload), 'utf8').toString('base64url');
}

export function decodeExportVerificationToken(token: string): { patientId: string; generatedAt: string; exportHash: string } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as Partial<{ patientId: string; generatedAt: string; exportHash: string }>;

    if (!parsed || typeof parsed.patientId !== 'string' || typeof parsed.generatedAt !== 'string' || typeof parsed.exportHash !== 'string') {
      return null;
    }

    return {
      patientId: parsed.patientId,
      generatedAt: parsed.generatedAt,
      exportHash: parsed.exportHash,
    };
  } catch {
    return null;
  }
}

export function buildPatientExportManifest(snapshot: PatientEhrSnapshot, generatedAt: Date) {
  return {
    version: 1,
    kind: 'patient-ehr-export',
    generatedAt: generatedAt.toISOString(),
    patient: {
      id: snapshot.id,
      code: snapshot.code,
      fullName: snapshot.fullName,
      phone: snapshot.phone,
      status: snapshot.status,
      dateOfBirth: snapshot.dateOfBirth,
      registrationDate: snapshot.registrationDate,
      chiefComplaint: snapshot.chiefComplaint,
      notes: snapshot.notes,
    },
    counts: {
      visits: snapshot.visits.length,
      allergies: snapshot.allergies.length,
      medications: snapshot.medications.length,
      progressNotes: snapshot.progressNotes.length,
      progressNoteAddendums: snapshot.progressNotes.reduce((total, note) => total + note.addendums.length, 0),
      diagnoses: snapshot.diagnoses.length,
      vitalSigns: snapshot.vitalSigns.length,
      physioSessionReports: snapshot.physioSessionReports.length,
      nurseDailyReports: snapshot.nurseDailyReports.length,
      careTeamMessages: snapshot.careTeamMessages.length,
      callRoutingTickets: snapshot.callRoutingTickets.length,
      aiTriageCases: snapshot.aiTriageCases.length,
      documents: snapshot.documents.length,
    },
    highlights: {
      latestVisit: snapshot.visits[0]
        ? {
            code: snapshot.visits[0].code,
            scheduledDate: snapshot.visits[0].scheduledDate,
            serviceName: snapshot.visits[0].service.name,
            status: snapshot.visits[0].status,
          }
        : null,
      latestProgressNote: snapshot.progressNotes[0]
        ? {
            createdAt: snapshot.progressNotes[0].createdAt,
            signedOffAt: snapshot.progressNotes[0].signedOffAt,
            addendaCount: snapshot.progressNotes[0].addendums.length,
          }
        : null,
      latestPhysioReport: snapshot.physioSessionReports[0]
        ? {
            sessionDate: snapshot.physioSessionReports[0].sessionDate,
            sessionNumber: snapshot.physioSessionReports[0].sessionNumber,
            nextSessionDate: snapshot.physioSessionReports[0].nextSessionDate,
          }
        : null,
      latestNurseReport: snapshot.nurseDailyReports[0]
        ? {
            reportDate: snapshot.nurseDailyReports[0].reportDate,
            escalationFlag: snapshot.nurseDailyReports[0].escalationFlag,
          }
        : null,
      latestCareMessage: snapshot.careTeamMessages[0]
        ? {
            createdAt: snapshot.careTeamMessages[0].createdAt,
            channelType: snapshot.careTeamMessages[0].channelType,
            visibilityScope: snapshot.careTeamMessages[0].visibilityScope,
          }
        : null,
    },
  };
}