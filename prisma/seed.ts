import { Prisma, PrismaClient } from '@prisma/client';
import { ClientStorage, MedplumClient, MemoryStorage } from '@medplum/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.|prof\.|dr)\s+/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadJson(filename: string): any[] {
  const filePath = join(process.cwd(), 'src', 'features', 'doctors', 'components', 'doctorgrid', filename);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

const ANEES_PATIENT_CODE_SYSTEM = 'https://anees.health/fhir/identifier/patient-code';
const ANEES_SEED_SYSTEM = 'https://anees.health/fhir/identifier/seed';
const ANEES_TASK_CODE_SYSTEM = 'https://anees.health/fhir/task-type';
const ANEES_CLINICAL_NOTE_TEXT_EXTENSION =
  'https://anees.health/fhir/StructureDefinition/clinical-note-text';

type MedplumSeedResourceType =
  | 'Patient'
  | 'Practitioner'
  | 'Encounter'
  | 'Observation'
  | 'Composition'
  | 'Task'
  | 'Condition'
  | 'AllergyIntolerance'
  | 'MedicationStatement'
  | 'ServiceRequest'
  | 'DiagnosticReport'
  | 'QuestionnaireResponse'
  | 'DocumentReference';

type CasePhysioSession = {
  date: string;
  title: string;
  notes: string;
};

type CaseVitalsPoint = {
  date: string;
  bpSys: number;
  bpDia: number;
  hr: number;
  temp: number;
  spo2: number;
  weight: number;
};

type RehabCaseProfile = {
  patient: {
    name: string;
    patientId: string;
    ageYears: number;
    gender: 'M' | 'F' | 'other';
  };
  caregiver: {
    name: string;
    contact: string;
    relationship: string;
  };
  admission: {
    admittedAt: string;
    dischargedAt: string;
  };
  mechanism: string;
  presentingComplaint: string;
  chronicConditions: string[];
  surgery: string;
  restrictions: string;
  diagnosticsSummary: string[];
  pastHistory: string[];
  physioSessions: CasePhysioSession[];
  followUpPlan: string;
  conclusion: string;
};

type MedplumSeedResult = {
  medplumPatientId: string | null;
  seeded: boolean;
  warning?: string;
};

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function isMedplumSeedStrictMode(): boolean {
  return process.env.SEED_MEDPLUM_STRICT?.trim().toLowerCase() === 'true';
}

function buildCaseNotes(profile: RehabCaseProfile): string {
  return [
    `Mechanism: ${profile.mechanism}`,
    `Chronic conditions: ${profile.chronicConditions.join(', ')}`,
    `Surgery: ${profile.surgery}`,
    `Restrictions: ${profile.restrictions}`,
    `Diagnostics: ${profile.diagnosticsSummary.join(' | ')}`,
    `Past history: ${profile.pastHistory.join(' | ')}`,
    `Follow-up: ${profile.followUpPlan}`,
    `Conclusion: ${profile.conclusion}`,
  ].join('\n');
}

function buildRehabCaseProfile(): RehabCaseProfile {
  return {
    patient: {
      name: envOrDefault('SEED_EHR_CASE_PATIENT_NAME', 'Case Patient AN-3211-0725'),
      patientId: 'AN-3211-0725',
      ageYears: 73,
      gender: 'F',
    },
    caregiver: {
      name: envOrDefault('SEED_EHR_CASE_CAREGIVER_NAME', 'Primary Caregiver'),
      contact: envOrDefault('SEED_EHR_CASE_CAREGIVER_PHONE', '+201055500321'),
      relationship: 'Son',
    },
    admission: {
      admittedAt: '2025-06-20',
      dischargedAt: '2025-06-26',
    },
    mechanism: 'Road Traffic Accident (RTA)',
    presentingComplaint: 'Right hip pain due to trans-trochanteric fracture of the right femur.',
    chronicConditions: ['Diabetes mellitus', 'Hypertension'],
    surgery: 'Open reduction and internal fixation (ORIF) with proximal femoral nail (PFN).',
    restrictions: 'Strict non-weight-bearing on right leg for one month after discharge.',
    diagnosticsSummary: [
      'X-ray pelvis: displaced trans-trochanteric fracture (right femur), no lytic/sclerotic lesions.',
      'CT hip joints: displaced fracture with displaced lesser trochanter, soft tissue edema, osteopenia.',
      'Post-op X-ray: fixation in place, no loosening/displacement, persistent osteopenia.',
      'FAST: no free fluid, no organ tears, no hematoma.',
    ],
    pastHistory: [
      'Status post contralateral total knee replacement',
      'Grade 3 left knee osteoarthritis',
      'History of spinal surgeries',
      'History of nerve root decompression procedures (radiofrequency)',
    ],
    physioSessions: [
      {
        date: '2025-07-16',
        title: 'Session 2',
        notes:
          'Bedridden baseline. Release gastro/hamstrings + VMO/IT band, VMO/quad/hamstring activation, heel slide; progressed with hip abductors and core activation (rectus abdominis).',
      },
      {
        date: '2025-07-20',
        title: 'Session 3',
        notes:
          'Patient able to sit independently. Mobilization for knee extension; gentle isometric resistance, short arc quad, bridging.',
      },
      {
        date: '2025-07-22',
        title: 'Session 4',
        notes: 'Continued prior protocol plus hip flexion via forward trunk movement.',
      },
      {
        date: '2025-07-24',
        title: 'Session 5',
        notes:
          'Added hip external rotation, static hip abductors, seated isometric quad/hamstring work, kinesio taping for patellar medialization.',
      },
      {
        date: '2025-07-27',
        title: 'Session 6',
        notes:
          'Added iliopsoas release, bridging, assisted SLR, rectus femoris activation, rolling on sound limb.',
      },
      {
        date: '2025-07-29',
        title: 'Session 7',
        notes: 'Added assisted hip flexion on affected side from sitting.',
      },
      {
        date: '2025-07-31',
        title: 'Session 8',
        notes: 'Continued same rehabilitation protocol.',
      },
      {
        date: '2025-08-03',
        title: 'Session 9',
        notes: 'Continued progression plan.',
      },
      {
        date: '2025-08-17',
        title: 'Additional block - Session 1',
        notes: 'Continued protocol plus VMO and clamshell exercises.',
      },
      {
        date: '2025-08-19',
        title: 'Additional block - Session 2',
        notes: 'Progressed with increased repetitions.',
      },
      {
        date: '2025-08-21',
        title: 'Additional block - Session 3',
        notes: 'Continued protocol with iliotibial band release.',
      },
      {
        date: '2025-08-26',
        title: 'Additional block - Session 5',
        notes: 'Continued protocol with pelvic rocking exercises.',
      },
      {
        date: '2025-08-31',
        title: 'Additional block - Session 7',
        notes: 'Continued protocol with sacrum release.',
      },
    ],
    followUpPlan:
      'After initial 12 sessions, X-ray showed incomplete bone healing. Surgeon recommended additional 12 physiotherapy sessions for consolidation and progressive strengthening (quadriceps/hamstrings).',
    conclusion:
      'Post-ORIF recovery was uneventful. Discharge plan, medications, and physiotherapy referrals provided; close follow-up required for outcomes, comorbidity management, and progressive rehabilitation.',
  };
}

function getOptionalMedplumSeedConfig() {
  const baseUrl = process.env.MEDPLUM_BASE_URL?.trim();
  const clientId = process.env.MEDPLUM_CLIENT_ID?.trim();
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET?.trim();

  if (!baseUrl || !clientId || !clientSecret) {
    return null;
  }

  return { baseUrl, clientId, clientSecret };
}

async function getMedplumSeedClient(): Promise<MedplumClient | null> {
  const config = getOptionalMedplumSeedConfig();
  if (!config) return null;

  const client = new MedplumClient({
    baseUrl: config.baseUrl,
    cacheTime: 0,
    logLevel: 'none',
    storage: new ClientStorage(new MemoryStorage()),
  });

  await client.startClientLogin(config.clientId, config.clientSecret);
  return client;
}

async function upsertMedplumResourceByIdentifier(
  medplum: MedplumClient,
  resourceType: MedplumSeedResourceType,
  seedIdentifierValue: string,
  payload: Record<string, unknown>,
): Promise<{ id?: string }> {
  const existing = await medplum.searchOne(resourceType, {
    identifier: `${ANEES_SEED_SYSTEM}|${seedIdentifierValue}`,
  });

  const resource = {
    ...payload,
    identifier: [
      {
        system: ANEES_SEED_SYSTEM,
        value: seedIdentifierValue,
      },
    ],
  };

  if (existing?.id) {
    return (await medplum.updateResource({ ...existing, ...resource, id: existing.id } as never)) as {
      id?: string;
    };
  }

  return (await medplum.createResource(resource as never)) as { id?: string };
}

async function seedMedplumDataForCase(params: {
  patientCode: string;
  patientName: string;
  patientPhone: string;
  patientGender: 'M' | 'F' | 'other';
  medplumPatientId?: string | null;
  physioSessions: CasePhysioSession[];
}): Promise<MedplumSeedResult> {
  const medplum = await getMedplumSeedClient();
  if (!medplum) {
    console.log('Medplum env not configured; skipped Medplum seed resources.');
    return { medplumPatientId: params.medplumPatientId ?? null, seeded: false };
  }

  try {

  const medplumGender =
    params.patientGender === 'M' ? 'male' : params.patientGender === 'F' ? 'female' : 'other';

  const patientByIdentifier = await medplum.searchOne('Patient', {
    identifier: `${ANEES_PATIENT_CODE_SYSTEM}|${params.patientCode}`,
  });

  const patientPayload = {
    resourceType: 'Patient',
    active: true,
    identifier: [
      {
        system: ANEES_PATIENT_CODE_SYSTEM,
        value: params.patientCode,
      },
      {
        system: ANEES_SEED_SYSTEM,
        value: `case-${params.patientCode}`,
      },
    ],
    name: [{ use: 'official', text: params.patientName }],
    telecom: [{ system: 'phone', value: params.patientPhone, use: 'mobile' }],
    gender: medplumGender,
  };

  const medplumPatient = (patientByIdentifier?.id
    ? await medplum.updateResource({
        ...patientByIdentifier,
        ...patientPayload,
        id: patientByIdentifier.id,
      } as never)
    : await medplum.createResource(patientPayload as never)) as { id?: string };

  const medplumPatientId = medplumPatient.id as string;

  const practitioner = await upsertMedplumResourceByIdentifier(
    medplum,
    'Practitioner',
    `case-${params.patientCode}-practitioner`,
    {
      resourceType: 'Practitioner',
      active: true,
      name: [{ text: 'Anees Seed Clinician' }],
    },
  );

  const practitionerId = practitioner.id as string;

  const seededEncounters: Array<{ id: string; startDate: string }> = [];
  for (const [index, session] of params.physioSessions.slice(0, 5).entries()) {
    const encounter = await upsertMedplumResourceByIdentifier(
      medplum,
      'Encounter',
      `case-${params.patientCode}-enc-${String(index + 1).padStart(3, '0')}`,
      {
        resourceType: 'Encounter',
        status: 'completed',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'HH',
          display: 'home health',
        },
        subject: { reference: `Patient/${medplumPatientId}` },
        participant: [{ individual: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' } }],
        period: { start: new Date(session.date).toISOString() },
      },
    );

    seededEncounters.push({ id: encounter.id as string, startDate: session.date });
  }

  const vitalsTimeline: CaseVitalsPoint[] = [
    { date: params.physioSessions[0]?.date ?? '2025-07-16', bpSys: 138, bpDia: 84, hr: 88, temp: 37, spo2: 97, weight: 77 },
    { date: params.physioSessions[1]?.date ?? '2025-07-20', bpSys: 134, bpDia: 82, hr: 84, temp: 36.8, spo2: 98, weight: 76.6 },
  ];

  for (const [index, vital] of vitalsTimeline.entries()) {
    const linkedEncounterId = seededEncounters[index]?.id;
    const effectiveDateTime = new Date(vital.date).toISOString();

    await upsertMedplumResourceByIdentifier(
      medplum,
      'Observation',
      `case-${params.patientCode}-obs-${index + 1}-bp`,
      {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }],
          text: 'Blood pressure',
        },
        subject: { reference: `Patient/${medplumPatientId}` },
        encounter: linkedEncounterId ? { reference: `Encounter/${linkedEncounterId}` } : undefined,
        performer: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
        effectiveDateTime,
        component: [
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
            valueQuantity: { value: vital.bpSys, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
          },
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
            valueQuantity: { value: vital.bpDia, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
          },
        ],
      },
    );

    await upsertMedplumResourceByIdentifier(
      medplum,
      'Observation',
      `case-${params.patientCode}-obs-${index + 1}-hr`,
      {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }], text: 'Heart rate' },
        subject: { reference: `Patient/${medplumPatientId}` },
        encounter: linkedEncounterId ? { reference: `Encounter/${linkedEncounterId}` } : undefined,
        performer: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
        effectiveDateTime,
        valueQuantity: { value: vital.hr, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
      },
    );

    await upsertMedplumResourceByIdentifier(
      medplum,
      'Observation',
      `case-${params.patientCode}-obs-${index + 1}-spo2`,
      {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' }],
          text: 'SpO2',
        },
        subject: { reference: `Patient/${medplumPatientId}` },
        encounter: linkedEncounterId ? { reference: `Encounter/${linkedEncounterId}` } : undefined,
        performer: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
        effectiveDateTime,
        valueQuantity: { value: vital.spo2, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
      },
    );

    await upsertMedplumResourceByIdentifier(
      medplum,
      'Observation',
      `case-${params.patientCode}-obs-${index + 1}-temp`,
      {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }],
          text: 'Body temperature',
        },
        subject: { reference: `Patient/${medplumPatientId}` },
        encounter: linkedEncounterId ? { reference: `Encounter/${linkedEncounterId}` } : undefined,
        performer: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
        effectiveDateTime,
        valueQuantity: { value: vital.temp, unit: 'C', system: 'http://unitsofmeasure.org', code: 'Cel' },
      },
    );

    await upsertMedplumResourceByIdentifier(
      medplum,
      'Observation',
      `case-${params.patientCode}-obs-${index + 1}-weight`,
      {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
          text: 'Body weight',
        },
        subject: { reference: `Patient/${medplumPatientId}` },
        encounter: linkedEncounterId ? { reference: `Encounter/${linkedEncounterId}` } : undefined,
        performer: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
        effectiveDateTime,
        valueQuantity: { value: vital.weight, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
      },
    );
  }

  await upsertMedplumResourceByIdentifier(medplum, 'Condition', `case-${params.patientCode}-condition-001`, {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
    },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item', display: 'Problem List Item' }] }],
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'I10', display: 'Hypertension' }],
      text: 'Hypertension',
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    onsetDateTime: new Date('2024-04-01').toISOString(),
    recordedDate: new Date('2026-01-15').toISOString(),
    recorder: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    note: [{ text: 'Managed with lifestyle changes and regular BP monitoring.' }],
  });

  await upsertMedplumResourceByIdentifier(medplum, 'Condition', `case-${params.patientCode}-condition-002`, {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
    },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item', display: 'Problem List Item' }] }],
    code: {
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'E11.9', display: 'Type 2 diabetes mellitus without complications' }],
      text: 'Type 2 diabetes mellitus without complications',
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    onsetDateTime: new Date('2023-08-01').toISOString(),
    recordedDate: new Date('2026-01-15').toISOString(),
    recorder: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    note: [{ text: 'Diet-controlled and monitored with periodic glucose checks.' }],
  });

  await upsertMedplumResourceByIdentifier(medplum, 'AllergyIntolerance', `case-${params.patientCode}-allergy-001`, {
    resourceType: 'AllergyIntolerance',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: 'Confirmed' }],
    },
    type: 'allergy',
    category: ['medication'],
    criticality: 'high',
    code: { text: 'Penicillin' },
    patient: { reference: `Patient/${medplumPatientId}` },
    onsetDateTime: new Date('2022-02-01').toISOString(),
    recorder: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    reaction: [
      {
        manifestation: [{ text: 'Rash' }],
        severity: 'moderate',
        note: [{ text: 'Avoid beta-lactam antibiotics unless reviewed.' }],
      },
    ],
    note: [{ text: 'Documented during intake.' }],
  });

  await upsertMedplumResourceByIdentifier(medplum, 'MedicationStatement', `case-${params.patientCode}-med-001`, {
    resourceType: 'MedicationStatement',
    status: 'active',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361', display: 'Amlodipine' }],
      text: 'Amlodipine',
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    effectivePeriod: { start: new Date('2025-12-01').toISOString() },
    dateAsserted: new Date('2026-01-15').toISOString(),
    informationSource: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    dosage: [
      {
        text: '5 mg once daily',
        route: { text: 'Oral' },
        timing: { code: { text: 'Once daily' } },
      },
    ],
    note: [{ text: 'Home BP control medication.' }],
  });

  await upsertMedplumResourceByIdentifier(medplum, 'MedicationStatement', `case-${params.patientCode}-med-002`, {
    resourceType: 'MedicationStatement',
    status: 'active',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860975', display: 'Metformin' }],
      text: 'Metformin',
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    effectivePeriod: { start: new Date('2025-11-10').toISOString() },
    dateAsserted: new Date('2026-01-15').toISOString(),
    informationSource: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    dosage: [
      {
        text: '500 mg twice daily',
        route: { text: 'Oral' },
        timing: { code: { text: 'Twice daily' } },
      },
    ],
    note: [{ text: 'Used for glycemic control.' }],
  });

  const existingDocument = (await medplum.searchOne('DocumentReference', {
    identifier: `${ANEES_SEED_SYSTEM}|case-${params.patientCode}-document-001`,
  })) as { id?: string; content?: Array<{ attachment?: { url?: string } }> } | null;

  let binaryId = existingDocument?.content?.[0]?.attachment?.url?.replace(/^Binary\//, '');
  const seededDocumentBody = Buffer.from(
    [
      'Anees Health - Clinical Progress Snapshot',
      `Patient case: ${params.patientCode}`,
      'Summary: Functional mobility improved with caregiver-assisted daily exercise.',
      'Plan: Continue supervised strengthening and follow-up physiotherapy in one week.',
    ].join('\n'),
    'utf-8',
  ).toString('base64');

  const binaryPayload = {
    resourceType: 'Binary',
    contentType: 'text/plain',
    data: seededDocumentBody,
    securityContext: { reference: `Patient/${medplumPatientId}` },
  };

  if (binaryId) {
    try {
      await medplum.updateResource({
        ...binaryPayload,
        id: binaryId,
      } as never);
    } catch {
      binaryId = undefined;
    }
  }

  if (!binaryId) {
    const createdBinary = (await medplum.createResource(binaryPayload as never)) as { id?: string };
    binaryId = createdBinary.id;
  }

  if (!binaryId) {
    throw new Error('Failed to seed DocumentReference binary payload.');
  }

  await upsertMedplumResourceByIdentifier(medplum, 'DocumentReference', `case-${params.patientCode}-document-001`, {
    resourceType: 'DocumentReference',
    status: 'current',
    subject: { reference: `Patient/${medplumPatientId}` },
    type: {
      coding: [
        {
          system: 'https://anees.health/fhir/document-category',
          code: 'report',
          display: 'Clinical Progress Summary',
        },
      ],
      text: 'Clinical Progress Summary',
    },
    category: [
      {
        coding: [
          {
            system: 'https://anees.health/fhir/document-category',
            code: 'report',
            display: 'Report',
          },
        ],
      },
    ],
    date: new Date('2026-01-18T09:15:00.000Z').toISOString(),
    author: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          title: 'progress-summary.txt',
          url: `Binary/${binaryId}`,
          size: Buffer.byteLength(seededDocumentBody, 'base64'),
        },
      },
    ],
  });

  const labOrder = await upsertMedplumResourceByIdentifier(medplum, 'ServiceRequest', `case-${params.patientCode}-lab-order-001`, {
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/service-request-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [{ system: 'http://loinc.org', code: '24331-1', display: 'Lipid panel' }],
      text: 'Lipid panel follow-up',
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    authoredOn: new Date('2026-01-16T08:00:00.000Z').toISOString(),
    occurrenceDateTime: new Date('2026-01-18T08:30:00.000Z').toISOString(),
    requester: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    note: [{ text: 'Follow-up after medication adjustment.' }],
  });

  await upsertMedplumResourceByIdentifier(medplum, 'DiagnosticReport', `case-${params.patientCode}-lab-result-001`, {
    resourceType: 'DiagnosticReport',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [{ system: 'http://loinc.org', code: '24331-1', display: 'Lipid panel' }],
      text: 'Lipid panel result',
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    basedOn: labOrder.id ? [{ reference: `ServiceRequest/${labOrder.id}` }] : undefined,
    effectiveDateTime: new Date('2026-01-18T09:00:00.000Z').toISOString(),
    issued: new Date('2026-01-18T11:30:00.000Z').toISOString(),
    performer: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
    conclusion: 'LDL improved compared with last month; continue current regimen and repeat in 8 weeks.',
  });

  const assessmentSeedIdentifier = `case-${params.patientCode}-assessment-001`;
  const existingAssessment = await medplum.searchOne('QuestionnaireResponse', {
    identifier: `${ANEES_SEED_SYSTEM}|${assessmentSeedIdentifier}`,
  });

  const assessmentPayload = {
    resourceType: 'QuestionnaireResponse',
    identifier: {
      system: ANEES_SEED_SYSTEM,
      value: assessmentSeedIdentifier,
    },
    status: 'completed',
    questionnaire: 'Questionnaire/anees-assessment',
    subject: { reference: `Patient/${medplumPatientId}` },
    authored: new Date('2026-01-19T10:00:00.000Z').toISOString(),
    author: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    item: [
      {
        linkId: 'assessment-type',
        text: 'Assessment Type',
        answer: [{ valueString: 'mobility' }],
      },
      {
        linkId: 'assessment-title',
        text: 'Assessment Title',
        answer: [{ valueString: 'Timed Up and Go follow-up' }],
      },
      {
        linkId: 'assessment-score',
        text: 'Score',
        answer: [{ valueInteger: 16 }],
      },
      {
        linkId: 'assessment-summary',
        text: 'Summary',
        answer: [{ valueString: 'Improved gait stability and transfer safety vs baseline.' }],
      },
      {
        linkId: 'assessment-notes',
        text: 'Notes',
        answer: [{ valueString: 'Continue balance drills and caregiver supervision outdoors.' }],
      },
    ],
  };

  if (existingAssessment?.id) {
    await medplum.updateResource({
      ...existingAssessment,
      ...assessmentPayload,
      id: existingAssessment.id,
    } as never);
  } else {
    await medplum.createResource(assessmentPayload as never);
  }

  const compositionTitle = 'Post-ORIF Rehabilitation Progress Summary';
  const existingComposition = await medplum.searchOne('Composition', {
    subject: `Patient/${medplumPatientId}`,
    title: compositionTitle,
  });

  const compositionPayload = {
    resourceType: 'Composition',
    status: 'final',
    type: {
      coding: [
        {
          system: 'https://anees.health/fhir/document-type',
          code: 'clinical-note',
          display: 'Clinical Note',
        },
      ],
    },
    subject: { reference: `Patient/${medplumPatientId}` },
    encounter: seededEncounters[0]?.id ? { reference: `Encounter/${seededEncounters[0].id}` } : undefined,
    date: new Date('2025-08-31').toISOString(),
    author: [{ reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' }],
    title: compositionTitle,
    section: [
      {
        title: 'Assessment',
        text: {
          status: 'generated',
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>Progressive rehabilitation with mobility gains, stable vitals, and ongoing strengthening plan.</p></div>',
        },
      },
    ],
    extension: [
      {
        url: ANEES_CLINICAL_NOTE_TEXT_EXTENSION,
        valueString:
          'Progressive rehabilitation with mobility gains, stable vitals, and ongoing strengthening plan.',
      },
    ],
  };

  if (existingComposition?.id) {
    await medplum.updateResource({ ...existingComposition, ...compositionPayload, id: existingComposition.id } as never);
  } else {
    await medplum.createResource(compositionPayload as never);
  }

  await upsertMedplumResourceByIdentifier(medplum, 'Task', `case-${params.patientCode}-task-001`, {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    code: {
      coding: [
        {
          system: ANEES_TASK_CODE_SYSTEM,
          code: 'follow-up',
          display: 'Follow-up X-ray review',
        },
      ],
      text: 'Follow-up X-ray review',
    },
    description: 'Review bone healing progress and update weight-bearing recommendation.',
    for: { reference: `Patient/${medplumPatientId}` },
    owner: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    authoredOn: new Date('2025-09-01').toISOString(),
    executionPeriod: { end: new Date('2025-09-07').toISOString() },
  });

  await upsertMedplumResourceByIdentifier(medplum, 'Task', `case-${params.patientCode}-task-002`, {
    resourceType: 'Task',
    status: 'in-progress',
    intent: 'order',
    code: {
      coding: [
        {
          system: ANEES_TASK_CODE_SYSTEM,
          code: 'follow-up',
          display: 'Home exercise adherence check',
        },
      ],
      text: 'Home exercise adherence check',
    },
    description: 'Validate caregiver-supported exercise adherence and pain response.',
    for: { reference: `Patient/${medplumPatientId}` },
    owner: { reference: `Practitioner/${practitionerId}`, display: 'Anees Seed Clinician' },
    authoredOn: new Date('2025-09-02').toISOString(),
    executionPeriod: { end: new Date('2025-09-10').toISOString() },
  });

    return { medplumPatientId, seeded: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Medplum seeding error.';
    if (isMedplumSeedStrictMode()) {
      throw error;
    }

    console.warn(`Medplum seed warning: ${message}`);
    return {
      medplumPatientId: params.medplumPatientId ?? null,
      seeded: false,
      warning: message,
    };
  }
}

async function main() {
  console.log('Seeding lookup tables...');

  // Areas
  await prisma.area.createMany({
    skipDuplicates: true,
    data: [
      { code: 'AR-001', name: 'Zamalek', governorate: 'Cairo' },
      { code: 'AR-002', name: 'Nasr City', governorate: 'Cairo' },
      { code: 'AR-003', name: 'Heliopolis', governorate: 'Cairo' },
      { code: 'AR-004', name: 'Madinaty & El Shorouk', governorate: 'Cairo' },
      { code: 'AR-005', name: 'Fifth Settlement', governorate: 'Cairo' },
      { code: 'AR-006', name: 'Maadi & Mokattam', governorate: 'Cairo' },
      { code: 'AR-007', name: 'Helwan', governorate: 'Cairo' },
      { code: 'AR-008', name: 'Mohandessin & Dokki', governorate: 'Giza' },
      { code: 'AR-009', name: '6th of October', governorate: 'Giza' },
      { code: 'AR-010', name: 'Sheikh Zayed', governorate: 'Giza' },
      { code: 'AR-011', name: 'Haram & Hadayek El Ahram', governorate: 'Giza' },
    ],
  });

  // Service Categories
  await prisma.serviceCategory.createMany({
    skipDuplicates: true,
    data: [
      { code: 'CAT-01', name: 'Doctor Consultation', defaultProviderRole: 'Doctor', notes: 'In-home' },
      { code: 'CAT-02', name: 'Physiotherapy', defaultProviderRole: 'Physiotherapist', notes: 'Rehab and mobility' },
      { code: 'CAT-03', name: 'Nursing Care', defaultProviderRole: 'Nurse', notes: 'Wound care, injections, IV, etc.' },
      { code: 'CAT-04', name: 'Nurse Aid', defaultProviderRole: 'Nurse Aid', notes: 'Daily living support' },
      { code: 'CAT-05', name: 'Nutrition', defaultProviderRole: 'Nutritionist', notes: 'Dietary planning' },
      { code: 'CAT-06', name: 'Lab at Home', defaultProviderRole: 'Lab Tech', notes: 'Sample collection' },
      { code: 'CAT-07', name: 'Telemedicine', defaultProviderRole: 'Doctor', notes: 'Remote consultation' },
      { code: 'CAT-08', name: 'Remote Monitoring', defaultProviderRole: 'Nurse', notes: 'Ongoing vitals tracking' },
      { code: 'CAT-09', name: 'Mental Health', defaultProviderRole: 'Doctor', notes: 'Psychiatry / counseling' },
    ],
  });

  // Provider Roles
  await prisma.providerRole.createMany({
    skipDuplicates: true,
    data: [
      { code: 'RL-01', name: 'Doctor', notes: 'Licensed physician' },
      { code: 'RL-02', name: 'Physiotherapist' },
      { code: 'RL-03', name: 'Nurse', notes: 'Registered nurse' },
      { code: 'RL-04', name: 'Nurse Aid', notes: 'Nurse Assistant' },
      { code: 'RL-05', name: 'Nutritionist' },
      { code: 'RL-06', name: 'Lab Technician' },
      { code: 'RL-07', name: 'Pharmacist' },
      { code: 'RL-08', name: 'Psychologist' },
    ],
  });

  // Payment Methods
  await prisma.paymentMethod.createMany({
    skipDuplicates: true,
    data: [
      { code: 'PM-01', name: 'Cash' },
      { code: 'PM-02', name: 'InstaPay', notes: 'Egyptian instant payment' },
      { code: 'PM-03', name: 'Bank Transfer' },
      { code: 'PM-04', name: 'Credit/Debit Card', notes: 'Through Payment Gateway' },
      { code: 'PM-05', name: 'Vodafone Cash' },
      { code: 'PM-06', name: 'Fawry' },
    ],
  });

  // Expense Categories
  await prisma.expenseCategory.createMany({
    skipDuplicates: true,
    data: [
      { code: 'EC-01', name: 'Provider Payouts', notes: 'Payments to doctors/nurses/etc.' },
      { code: 'EC-02', name: 'Transport', notes: 'Fuel, rideshare, taxis for home visits' },
      { code: 'EC-03', name: 'Medical Supplies', notes: 'Consumables, dressings, syringes' },
      { code: 'EC-04', name: 'Equipment', notes: 'Devices, monitors, durable items' },
      { code: 'EC-05', name: 'Marketing', notes: 'Ads, content, agency fees' },
      { code: 'EC-06', name: 'Salaries (Office)', notes: 'Admin / non-clinical staff' },
      { code: 'EC-07', name: 'Rent & Utilities' },
      { code: 'EC-08', name: 'Software & Tools', notes: 'SaaS, comms tools' },
      { code: 'EC-09', name: 'Licenses & Permits' },
      { code: 'EC-10', name: 'Bank & Payment Fees' },
      { code: 'EC-11', name: 'Other' },
    ],
  });

  // Referral Sources
  await prisma.referralSource.createMany({
    skipDuplicates: true,
    data: [
      { code: 'RS-01', name: 'META / TikTok', channelType: 'Paid Social', notes: 'Facebook / Instagram / TikTok / LinkedIn' },
      { code: 'RS-02', name: 'Google Ads', channelType: 'Paid Search' },
      { code: 'RS-03', name: 'Google Search', channelType: 'Organic', notes: 'Google Search / SEO' },
      { code: 'RS-04', name: 'Doctor Referral', channelType: 'Partner' },
      { code: 'RS-05', name: 'Medical Partner', channelType: 'Partner', notes: 'Labs / Hospitals / Medical Partners' },
      { code: 'RS-06', name: 'Word of Mouth', channelType: 'Referral', notes: 'Friends / Family / Community referrals' },
      { code: 'RS-07', name: 'Existing Patient', channelType: 'Returning Patient', notes: 'Returning or repeat patients' },
      { code: 'RS-08', name: 'Walk-in / Direct', channelType: 'Direct' },
      { code: 'RS-09', name: 'Offline Marketing', channelType: 'Offline', notes: 'Booths / Events / Billboards / Outdoor' },
      { code: 'RS-10', name: 'Other', channelType: 'Other' },
    ],
  });

  console.log('Seeding services...');

  const cat01 = await prisma.serviceCategory.findUnique({ where: { code: 'CAT-01' } });
  const cat02 = await prisma.serviceCategory.findUnique({ where: { code: 'CAT-02' } });
  const cat03 = await prisma.serviceCategory.findUnique({ where: { code: 'CAT-03' } });
  const cat04 = await prisma.serviceCategory.findUnique({ where: { code: 'CAT-04' } });
  const cat06 = await prisma.serviceCategory.findUnique({ where: { code: 'CAT-06' } });
  const cat07 = await prisma.serviceCategory.findUnique({ where: { code: 'CAT-07' } });
  const rl01 = await prisma.providerRole.findUnique({ where: { code: 'RL-01' } });
  const rl02 = await prisma.providerRole.findUnique({ where: { code: 'RL-02' } });
  const rl03 = await prisma.providerRole.findUnique({ where: { code: 'RL-03' } });
  const rl04 = await prisma.providerRole.findUnique({ where: { code: 'RL-04' } });
  const rl06 = await prisma.providerRole.findUnique({ where: { code: 'RL-06' } });

  if (cat01 && cat02 && cat03 && cat04 && cat06 && cat07 && rl01 && rl02 && rl03 && rl04 && rl06) {
    await prisma.service.createMany({
      skipDuplicates: true,
      data: [
        {
          code: 'SV-001',
          name: 'Home Doctor Visit — General',
          categoryId: cat01.id,
          requiredRoleId: rl01.id,
          durationMins: 45,
          listPriceEgp: 1500,
          defaultProviderPayoutEgp: 1200,
          description: 'General physician home visit including basic exam',
        },
        {
          code: 'SV-002',
          name: 'Home Doctor Visit — Specialist',
          categoryId: cat01.id,
          requiredRoleId: rl01.id,
          durationMins: 45,
          listPriceEgp: 1800,
          defaultProviderPayoutEgp: 1500,
          description: 'Specialist home visit including basic exam',
        },
        {
          code: 'SV-003',
          name: 'Home Doctor Visit — Consultant',
          categoryId: cat01.id,
          requiredRoleId: rl01.id,
          durationMins: 45,
          listPriceEgp: 2500,
          defaultProviderPayoutEgp: 1800,
          description: 'Consultant home visit including basic exam',
        },
        {
          code: 'SV-004',
          name: 'Home Nursing — Wound Care',
          categoryId: cat03.id,
          requiredRoleId: rl03.id,
          durationMins: 60,
          listPriceEgp: 2000,
          defaultProviderPayoutEgp: 250,
          description: 'Dressing change, wound assessment',
        },
        {
          code: 'SV-005',
          name: 'Physiotherapy Session',
          categoryId: cat02.id,
          requiredRoleId: rl02.id,
          durationMins: 60,
          listPriceEgp: 500,
          defaultProviderPayoutEgp: 300,
          description: 'Single physio session at patient home',
        },
        {
          code: 'SV-006',
          name: 'Telemedicine Consultation',
          categoryId: cat07.id,
          requiredRoleId: rl01.id,
          durationMins: 30,
          listPriceEgp: 350,
          defaultProviderPayoutEgp: 200,
          description: 'Video consultation',
        },
        {
          code: 'SV-007',
          name: 'Lab Sample Collection',
          categoryId: cat06.id,
          requiredRoleId: rl06.id,
          durationMins: 20,
          listPriceEgp: 200,
          defaultProviderPayoutEgp: 100,
          description: 'Home sample collection, lab fees not included',
        },
        {
          code: 'SV-008',
          name: 'Nurse Aid — Daily Care (4h)',
          categoryId: cat04.id,
          requiredRoleId: rl04.id,
          durationMins: 240,
          listPriceEgp: 600,
          defaultProviderPayoutEgp: 400,
          description: '4-hour daily-living support shift',
        },
      ],
    });
  }

  // ── Doctors ──────────────────────────────────────────────────────────────────
  // JSON source files were removed after data was migrated to PostgreSQL.
  // This block is kept for reference and skips gracefully if files are absent.
  const safeDoctorUpsert = async (payload: Parameters<typeof prisma.doctor.upsert>[0]) => {
    try {
      await prisma.doctor.upsert(payload);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'P2011'
      ) {
        console.log('Skipping doctor upsert due to DB drift (required doctors.doctorCode).');
        return;
      }
      throw error;
    }
  };

  let doctorCount = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enDoctors: any[] = loadJson('doctors.en.json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arDoctors: any[] = loadJson('doctors.ar.json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arById = new Map<number, any>(arDoctors.map((d) => [d.id, d]));

    for (const en of enDoctors) {
      const ar = arById.get(en.id) || en;
      await safeDoctorUpsert({
        where: { id: en.id },
        update: {},
        create: {
          id: en.id,
          slug: generateSlug(en.doctorName),
          image: en.image,
          rating: en.rating,
          gender: en.gender,
          location: en.location,
          experienceYears: en.experienceYears,
          successRate: en.successRate,
          avgWaitTime: en.avgWaitTime,
          totalPatients: en.totalPatients,
          availabilityStatus: en.availabilityStatus,
          availabilityBadgeClass: en.availabilityBadgeClass,
          specialityColorClass: en.specialityColorClass,
          specialityTextClass: en.specialityTextClass,
          duration: en.duration,
          consultationFee: en.consultationFee,
          maxConsultationFee: en.maxConsultationFee,
          channels: en.channels,
          languages: en.languages,
          clinics: en.clinics,
          areaCoverage: en.areaCoverage,
          clinicDetails: en.clinicDetails,
          testimonials: en.testimonials || [],
          workHistory: en.workHistory || null,
          priceTelemedicine: en.pricing?.telemedicine || 'N/A',
          priceHomeVisit: en.pricing?.homeVisit || 'N/A',
          priceClinicVisit: en.pricing?.clinicVisit || 'N/A',
          nameEn: en.doctorName,
          specialityEn: en.speciality,
          professionalTitleEn: en.professionalTitle,
          bioEn: en.bio || null,
          certificationsEn: en.certifications || [],
          educationEn: en.education || [],
          nameAr: ar.doctorName,
          specialityAr: ar.speciality,
          professionalTitleAr: ar.professionalTitle,
          bioAr: ar.bio || null,
          certificationsAr: ar.certifications || [],
          educationAr: ar.education || [],
        },
      });
      doctorCount++;
    }
    console.log(`Seeded ${doctorCount} doctors.`);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('Doctor JSON files not found — skipping (already migrated to DB).');
    } else {
      throw e;
    }
  }

  await safeDoctorUpsert({
    where: { id: 19 },
    update: {
      slug: 'mahmoud-darwish',
      image: 'assets/img/doctor-grid-optimized/2.webp',
      rating: 4.8,
      gender: 'Male',
      location: 'Cairo, Egypt',
      experienceYears: 7,
      successRate: '95%',
      avgWaitTime: '10 min',
      totalPatients: '700+',
      availabilityStatus: 'Available',
      availabilityBadgeClass: 'bg-success-light',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'Tele-Medicine',
      channels: ['Home', 'video', 'chat'],
      languages: ['Arabic', 'English'],
      clinics: ['New Qasr Ainy Hospital', 'El Mashreq'],
      areaCoverage: ['Nasr City', 'New Cairo', 'Fifth Settlement', 'Heliopolis', 'Maadi'],
      clinicDetails: [
        {
          name: 'New Qasr Ainy Hospital',
          hours: 'Not specified',
          slots: 'Not specified',
          mapUrl: '',
          address: 'Cairo, Egypt',
          location: 'Cairo, Egypt',
        },
        {
          name: 'El Mashreq',
          hours: 'Not specified',
          slots: 'Not specified',
          mapUrl: '',
          address: 'Cairo, Egypt',
          location: 'Cairo, Egypt',
        },
      ],
      testimonials: [],
      workHistory: [
        {
          institution: 'New Qasr Ainy Hospital',
          focus: 'Orthopedic rehabilitation and sports injury recovery',
        },
        {
          institution: 'El Mashreq',
          focus: 'Orthopedic rehabilitation and sports injury recovery',
        },
      ],
      priceTelemedicine: 'EGP 800',
      priceHomeVisit: 'EGP 1500',
      priceClinicVisit: 'EGP 1000',
      consultationFee: 'EGP 800',
      maxConsultationFee: 'EGP 1500',
      nameEn: 'Dr. Mahmoud Darwish',
      specialityEn: 'Physical Therapy & Rehabilitation',
      professionalTitleEn: 'Physical Therapist specializing in orthopedic rehabilitation and sports injuries',
      bioEn:
        'Physical Therapist with 7 years of experience focused on orthopedic rehabilitation, sports injury recovery, and functional return-to-activity. Worked with New Qasr Ainy Hospital, El Mashreq, and other clinics in Cairo.',
      certificationsEn: [
        'Postgraduate Diploma in Sports Injuries',
        'Sports Medical Analytics and Decision Making',
        'Sports Rehabilitation Specialist',
      ],
      educationEn: [
        {
          year: 'Not specified',
          degree: 'Bachelor of Physiotherapy',
          university: 'Heliopolis University',
        },
        {
          year: 'Not specified',
          degree: 'Postgraduate Diploma in Sports Injuries',
          university: 'Not specified',
        },
        {
          year: 'Not specified',
          degree: 'Sports Medical Analytics and Decision Making',
          university: 'Not specified',
        },
      ],
      nameAr: 'د. محمود درويش',
      specialityAr: 'العلاج الطبيعي وإعادة التأهيل',
      professionalTitleAr: 'أخصائي علاج طبيعي متخصص في تأهيل إصابات العظام والرياضة',
      bioAr:
        'أخصائي علاج طبيعي لديه 7 سنوات من الخبرة مع تركيز على تأهيل إصابات العظام، والتعافي من الإصابات الرياضية، واستعادة القدرة الوظيفية. عمل في مستشفى قصر العيني الجديد، والمشرق، وغيرها من العيادات في القاهرة.',
      certificationsAr: [
        'دبلوم الدراسات العليا في إصابات الرياضة',
        'تحليلات الطب الرياضي واتخاذ القرار',
        'أخصائي تأهيل رياضي',
      ],
      educationAr: [
        {
          year: 'غير محدد',
          degree: 'دبلوم الدراسات العليا في إصابات الرياضة',
          university: 'غير محدد',
        },
        {
          year: 'غير محدد',
          degree: 'تحليلات الطب الرياضي واتخاذ القرار',
          university: 'غير محدد',
        },
      ],
      isActive: true,
    },
    create: {
      id: 19,
      slug: 'mahmoud-darwish',
      image: 'assets/img/doctor-grid-optimized/2.webp',
      rating: 4.8,
      gender: 'Male',
      location: 'Cairo, Egypt',
      experienceYears: 6,
      successRate: '95%',
      avgWaitTime: '10 min',
      totalPatients: '700+',
      availabilityStatus: 'Available',
      availabilityBadgeClass: 'bg-success-light',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'Tele-Medicine',
      channels: ['Home', 'video', 'chat'],
      languages: ['Arabic', 'English'],
      clinics: ['New Qasr Ainy Hospital', 'El Mashreq'],
      areaCoverage: ['Nasr City', 'New Cairo', 'Fifth Settlement', 'Heliopolis', 'Maadi'],
      clinicDetails: [
        {
          name: 'New Qasr Ainy Hospital',
          hours: 'Not specified',
          slots: 'Not specified',
          mapUrl: '',
          address: 'Cairo, Egypt',
          location: 'Cairo, Egypt',
        },
        {
          name: 'El Mashreq',
          hours: 'Not specified',
          slots: 'Not specified',
          mapUrl: '',
          address: 'Cairo, Egypt',
          location: 'Cairo, Egypt',
        },
      ],
      testimonials: [],
      workHistory: [
        {
          institution: 'New Qasr Ainy Hospital',
          focus: 'Orthopedic rehabilitation and sports injury recovery',
        },
        {
          institution: 'El Mashreq',
          focus: 'Orthopedic rehabilitation and sports injury recovery',
        },
      ],
      priceTelemedicine: 'EGP 800',
      priceHomeVisit: 'EGP 1500',
      priceClinicVisit: 'EGP 1000',
      consultationFee: 'EGP 800',
      maxConsultationFee: 'EGP 1500',
      nameEn: 'Dr. Mahmoud Darwish',
      specialityEn: 'Physical Therapy & Rehabilitation',
      professionalTitleEn: 'Physical Therapist specializing in orthopedic rehabilitation and sports injuries',
      bioEn:
        'Physical Therapist with 6 years of experience focused on orthopedic rehabilitation, sports injury recovery, and functional return-to-activity. Worked with New Qasr Ainy Hospital, El Mashreq, and other clinics in Cairo.',
      certificationsEn: [
        'Postgraduate Diploma in Sports Injuries',
        'Sports Medical Analytics and Decision Making',
        'Sports Rehabilitation Specialist',
      ],
      educationEn: [
        {
          year: 'Not specified',
          degree: 'Postgraduate Diploma in Sports Injuries',
          university: 'Not specified',
        },
        {
          year: 'Not specified',
          degree: 'Sports Medical Analytics and Decision Making',
          university: 'Not specified',
        },
      ],
      nameAr: 'د. محمود درويش',
      specialityAr: 'العلاج الطبيعي وإعادة التأهيل',
      professionalTitleAr: 'أخصائي علاج طبيعي متخصص في تأهيل إصابات العظام والرياضة',
      bioAr:
        'أخصائي علاج طبيعي لديه 6 سنوات من الخبرة مع تركيز على تأهيل إصابات العظام، والتعافي من الإصابات الرياضية، واستعادة القدرة الوظيفية. عمل في مستشفى قصر العيني الجديد، والمشرق، وغيرها من العيادات في القاهرة.',
      certificationsAr: [
        'دبلوم الدراسات العليا في إصابات الرياضة',
        'تحليلات الطب الرياضي واتخاذ القرار',
        'أخصائي تأهيل رياضي',
      ],
      educationAr: [
        {
          year: 'غير محدد',
          degree: 'دبلوم الدراسات العليا في إصابات الرياضة',
          university: 'غير محدد',
        },
        {
          year: 'غير محدد',
          degree: 'تحليلات الطب الرياضي واتخاذ القرار',
          university: 'غير محدد',
        },
      ],
      isActive: true,
    },
  });

  await safeDoctorUpsert({
    where: { id: 101 },
    update: {
      slug: 'reem-ragab',
      image: 'assets/img/doctor-grid-optimized/reem-rajab.webp',
      rating: 0,
      gender: 'Female',
      location: 'Cairo, Egypt',
      experienceYears: 2,
      successRate: 'Not specified',
      avgWaitTime: 'Not specified',
      totalPatients: 'Not specified',
      availabilityStatus: 'Check availability',
      availabilityBadgeClass: '',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'By appointment',
      channels: ['Home'],
      languages: ['Arabic'],
      clinics: [],
      areaCoverage: [
        'Fifth Settlement (التجمع الخامس)',
        'New Cairo (القاهرة الجديدة)',
        'Heliopolis (مصر الجديدة)',
        'Sheraton (الشيراتون)',
        'Nasr City (مدينة نصر)',
        'Maadi (المعادي)',
        'Mokattam (المقطم)',
      ],
      clinicDetails: [],
      testimonials: [],
      workHistory: Prisma.JsonNull,
      priceTelemedicine: 'N/A',
      priceHomeVisit: 'N/A',
      priceClinicVisit: 'N/A',
      consultationFee: 'N/A',
      maxConsultationFee: 'N/A',
      nameEn: 'Reem Ragab',
      specialityEn: 'Physical Therapy & Rehabilitation',
      professionalTitleEn: 'Physiotherapist focused on orthopedic, post-operative, and general surgery rehabilitation cases',
      bioEn:
        'Reem Ragab is a physiotherapist and a 2024 graduate of the Faculty of Physical Therapy at Cairo University, where she earned her bachelor\'s degree with an excellent grade. Since graduation, she has been building practical clinical experience with a focus on orthopedic cases, post-operative rehabilitation, and general surgery physiotherapy care.',
      certificationsEn: [],
      educationEn: [
        {
          year: '2024',
          degree: 'Bachelor of Physical Therapy (Excellent grade)',
          university: 'Cairo University',
        },
      ],
      nameAr: 'ريم رجب',
      specialityAr: 'العلاج الطبيعي وإعادة التأهيل',
      professionalTitleAr: 'أخصائية علاج طبيعي تركز على حالات العظام والتأهيل بعد العمليات وحالات الجراحة العامة',
      bioAr:
        'ريم رجب أخصائية علاج طبيعي، تخرجت في كلية العلاج الطبيعي بجامعة القاهرة عام 2024 بتقدير امتياز. منذ التخرج وهي تبني خبرة عملية في الرعاية الإكلينيكية مع تركيز على حالات العظام، والتأهيل بعد العمليات، وحالات الجراحة العامة من منظور العلاج الطبيعي.',
      certificationsAr: [],
      educationAr: [
        {
          year: '2024',
          degree: 'بكالوريوس العلاج الطبيعي (تقدير امتياز)',
          university: 'جامعة القاهرة',
        },
      ],
      isActive: true,
    },
    create: {
      id: 101,
      slug: 'reem-ragab',
      image: 'assets/img/doctor-grid-optimized/reem-rajab.webp',
      rating: 0,
      gender: 'Female',
      location: 'Cairo, Egypt',
      experienceYears: 2,
      successRate: 'Not specified',
      avgWaitTime: 'Not specified',
      totalPatients: 'Not specified',
      availabilityStatus: 'Check availability',
      availabilityBadgeClass: '',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'By appointment',
      channels: ['Home'],
      languages: ['Arabic'],
      clinics: [],
      areaCoverage: [
        'Fifth Settlement (التجمع الخامس)',
        'New Cairo (القاهرة الجديدة)',
        'Heliopolis (مصر الجديدة)',
        'Sheraton (الشيراتون)',
        'Nasr City (مدينة نصر)',
        'Maadi (المعادي)',
        'Mokattam (المقطم)',
      ],
      clinicDetails: [],
      testimonials: [],
      workHistory: Prisma.JsonNull,
      priceTelemedicine: 'N/A',
      priceHomeVisit: 'N/A',
      priceClinicVisit: 'N/A',
      consultationFee: 'N/A',
      maxConsultationFee: 'N/A',
      nameEn: 'Reem Ragab',
      specialityEn: 'Physical Therapy & Rehabilitation',
      professionalTitleEn: 'Physiotherapist focused on orthopedic, post-operative, and general surgery rehabilitation cases',
      bioEn:
        'Reem Ragab is a physiotherapist and a 2024 graduate of the Faculty of Physical Therapy at Cairo University, where she earned her bachelor\'s degree with an excellent grade. Since graduation, she has been building practical clinical experience with a focus on orthopedic cases, post-operative rehabilitation, and general surgery physiotherapy care.',
      certificationsEn: [],
      educationEn: [
        {
          year: '2024',
          degree: 'Bachelor of Physical Therapy (Excellent grade)',
          university: 'Cairo University',
        },
      ],
      nameAr: 'ريم رجب',
      specialityAr: 'العلاج الطبيعي وإعادة التأهيل',
      professionalTitleAr: 'أخصائية علاج طبيعي تركز على حالات العظام والتأهيل بعد العمليات وحالات الجراحة العامة',
      bioAr:
        'ريم رجب أخصائية علاج طبيعي، تخرجت في كلية العلاج الطبيعي بجامعة القاهرة عام 2024 بتقدير امتياز. منذ التخرج وهي تبني خبرة عملية في الرعاية الإكلينيكية مع تركيز على حالات العظام، والتأهيل بعد العمليات، وحالات الجراحة العامة من منظور العلاج الطبيعي.',
      certificationsAr: [],
      educationAr: [
        {
          year: '2024',
          degree: 'بكالوريوس العلاج الطبيعي (تقدير امتياز)',
          university: 'جامعة القاهرة',
        },
      ],
      isActive: true,
    },
  });

  await safeDoctorUpsert({
    where: { id: 102 },
    update: {
      slug: 'menna-m-yahia',
      image: 'assets/img/doctor-grid-optimized/menna-yahia.webp',
      rating: 0,
      gender: 'Female',
      location: 'Cairo, Egypt',
      experienceYears: 2,
      successRate: 'Not specified',
      avgWaitTime: 'Not specified',
      totalPatients: 'Not specified',
      availabilityStatus: 'Check availability',
      availabilityBadgeClass: '',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'By appointment',
      channels: ['Home'],
      languages: ['Arabic'],
      clinics: [],
      areaCoverage: ['Nasr City (مدينة نصر)', 'Maadi (المعادي)'],
      clinicDetails: [],
      testimonials: [],
      workHistory: Prisma.JsonNull,
      priceTelemedicine: 'N/A',
      priceHomeVisit: 'N/A',
      priceClinicVisit: 'N/A',
      consultationFee: 'N/A',
      maxConsultationFee: 'N/A',
      nameEn: 'Menna M. Yahia',
      specialityEn: 'Physical Therapy & Rehabilitation',
      professionalTitleEn: 'Physiotherapist with 2 years of experience in orthopedic and post-operative rehabilitation care',
      bioEn:
        'Menna M. Yahia is an experienced physiotherapist with 2 years of experience, working mainly with general orthopedic cases and common rehabilitation needs including osteoarthritis, shoulder conditions, and post-operative rehab cases. She holds a bachelor\'s degree from Heliopolis University.',
      certificationsEn: [],
      educationEn: [
        {
          year: 'Not specified',
          degree: 'Bachelor of Physical Therapy',
          university: 'Heliopolis University',
        },
      ],
      nameAr: 'منة م. يحيى',
      specialityAr: 'العلاج الطبيعي وإعادة التأهيل',
      professionalTitleAr: 'أخصائية علاج طبيعي بخبرة سنتين في حالات العظام والتأهيل بعد العمليات',
      bioAr:
        'منة م. يحيى أخصائية علاج طبيعي لديها خبرة سنتين، وتعمل بشكل أساسي مع حالات العظام العامة والحالات الشائعة مثل خشونة المفاصل، وحالات الكتف، والتأهيل بعد العمليات. حاصلة على درجة البكالوريوس من جامعة هليوبوليس.',
      certificationsAr: [],
      educationAr: [
        {
          year: 'غير محدد',
          degree: 'بكالوريوس العلاج الطبيعي',
          university: 'جامعة هليوبوليس',
        },
      ],
      isActive: true,
    },
    create: {
      id: 102,
      slug: 'menna-m-yahia',
      image: 'assets/img/doctor-grid-optimized/menna-yahia.webp',
      rating: 0,
      gender: 'Female',
      location: 'Cairo, Egypt',
      experienceYears: 2,
      successRate: 'Not specified',
      avgWaitTime: 'Not specified',
      totalPatients: 'Not specified',
      availabilityStatus: 'Check availability',
      availabilityBadgeClass: '',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'By appointment',
      channels: ['Home'],
      languages: ['Arabic'],
      clinics: [],
      areaCoverage: ['Nasr City (مدينة نصر)', 'Maadi (المعادي)'],
      clinicDetails: [],
      testimonials: [],
      workHistory: Prisma.JsonNull,
      priceTelemedicine: 'N/A',
      priceHomeVisit: 'N/A',
      priceClinicVisit: 'N/A',
      consultationFee: 'N/A',
      maxConsultationFee: 'N/A',
      nameEn: 'Menna M. Yahia',
      specialityEn: 'Physical Therapy & Rehabilitation',
      professionalTitleEn: 'Physiotherapist with 2 years of experience in orthopedic and post-operative rehabilitation care',
      bioEn:
        'Menna M. Yahia is an experienced physiotherapist with 2 years of experience, working mainly with general orthopedic cases and common rehabilitation needs including osteoarthritis, shoulder conditions, and post-operative rehab cases. She holds a bachelor\'s degree from Heliopolis University.',
      certificationsEn: [],
      educationEn: [
        {
          year: 'Not specified',
          degree: 'Bachelor of Physical Therapy',
          university: 'Heliopolis University',
        },
      ],
      nameAr: 'منة م. يحيى',
      specialityAr: 'العلاج الطبيعي وإعادة التأهيل',
      professionalTitleAr: 'أخصائية علاج طبيعي بخبرة سنتين في حالات العظام والتأهيل بعد العمليات',
      bioAr:
        'منة م. يحيى أخصائية علاج طبيعي لديها خبرة سنتين، وتعمل بشكل أساسي مع حالات العظام العامة والحالات الشائعة مثل خشونة المفاصل، وحالات الكتف، والتأهيل بعد العمليات. حاصلة على درجة البكالوريوس من جامعة هليوبوليس.',
      certificationsAr: [],
      educationAr: [
        {
          year: 'غير محدد',
          degree: 'بكالوريوس العلاج الطبيعي',
          university: 'جامعة هليوبوليس',
        },
      ],
      isActive: true,
    },
  });

  await safeDoctorUpsert({
    where: { id: 103 },
    update: {
      slug: 'mohamed-mahmoud-hamza',
      image: 'assets/img/doctor-grid-optimized/hamza.webp',
      rating: 0,
      gender: 'Male',
      location: 'Cairo, Egypt',
      experienceYears: 3,
      successRate: 'Not specified',
      avgWaitTime: 'Not specified',
      totalPatients: 'Not specified',
      availabilityStatus: 'Check availability',
      availabilityBadgeClass: '',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'By appointment',
      channels: ['Home', 'Clinic'],
      languages: ['Arabic'],
      clinics: ['Clinic location available via map link'],
      areaCoverage: [
        'Fifth Settlement (التجمع الخامس)',
        'New Cairo (القاهرة الجديدة)',
        'Obour (العبور)',
      ],
      clinicDetails: [
        {
          name: 'Clinic location',
          hours: 'Not specified',
          slots: 'Not specified',
          mapUrl: 'https://maps.app.goo.gl/E3tCgHexcdGo696R9',
          address: 'Not specified',
          location: 'Cairo, Egypt',
        },
      ],
      testimonials: [],
      workHistory: Prisma.JsonNull,
      priceTelemedicine: 'N/A',
      priceHomeVisit: 'N/A',
      priceClinicVisit: 'N/A',
      consultationFee: 'N/A',
      maxConsultationFee: 'N/A',
      nameEn: 'Mohamed Mahmoud Hamza',
      specialityEn: 'Neurological Physical Therapy',
      professionalTitleEn: 'Physical therapist specializing in neurological cases',
      bioEn:
        'Mohamed Mahmoud Hamza is a physical therapist specializing in neurological cases, with 3 years of experience in neuro-focused physiotherapy care.',
      certificationsEn: [],
      educationEn: [],
      nameAr: 'محمد محمود حمزة',
      specialityAr: 'العلاج الطبيعي للحالات العصبية',
      professionalTitleAr: 'أخصائي علاج طبيعي متخصص في حالات المخ والأعصاب',
      bioAr:
        'محمد محمود حمزة أخصائي علاج طبيعي متخصص في حالات المخ والأعصاب، ولديه خبرة 3 سنوات في الرعاية التأهيلية للحالات العصبية.',
      certificationsAr: [],
      educationAr: [],
      isActive: true,
    },
    create: {
      id: 103,
      slug: 'mohamed-mahmoud-hamza',
      image: 'assets/img/doctor-grid-optimized/hamza.webp',
      rating: 0,
      gender: 'Male',
      location: 'Cairo, Egypt',
      experienceYears: 3,
      successRate: 'Not specified',
      avgWaitTime: 'Not specified',
      totalPatients: 'Not specified',
      availabilityStatus: 'Check availability',
      availabilityBadgeClass: '',
      specialityColorClass: 'active-bar-success',
      specialityTextClass: 'text-success',
      duration: 'By appointment',
      channels: ['Home', 'Clinic'],
      languages: ['Arabic'],
      clinics: ['Clinic location available via map link'],
      areaCoverage: [
        'Fifth Settlement (التجمع الخامس)',
        'New Cairo (القاهرة الجديدة)',
        'Obour (العبور)',
      ],
      clinicDetails: [
        {
          name: 'Clinic location',
          hours: 'Not specified',
          slots: 'Not specified',
          mapUrl: 'https://maps.app.goo.gl/E3tCgHexcdGo696R9',
          address: 'Not specified',
          location: 'Cairo, Egypt',
        },
      ],
      testimonials: [],
      workHistory: Prisma.JsonNull,
      priceTelemedicine: 'N/A',
      priceHomeVisit: 'N/A',
      priceClinicVisit: 'N/A',
      consultationFee: 'N/A',
      maxConsultationFee: 'N/A',
      nameEn: 'Mohamed Mahmoud Hamza',
      specialityEn: 'Neurological Physical Therapy',
      professionalTitleEn: 'Physical therapist specializing in neurological cases',
      bioEn:
        'Mohamed Mahmoud Hamza is a physical therapist specializing in neurological cases, with 3 years of experience in neuro-focused physiotherapy care.',
      certificationsEn: [],
      educationEn: [],
      nameAr: 'محمد محمود حمزة',
      specialityAr: 'العلاج الطبيعي للحالات العصبية',
      professionalTitleAr: 'أخصائي علاج طبيعي متخصص في حالات المخ والأعصاب',
      bioAr:
        'محمد محمود حمزة أخصائي علاج طبيعي متخصص في حالات المخ والأعصاب، ولديه خبرة 3 سنوات في الرعاية التأهيلية للحالات العصبية.',
      certificationsAr: [],
      educationAr: [],
      isActive: true,
    },
  });

  // ── Booking Prices ────────────────────────────────────────────────────────
  console.log('Seeding booking prices...');
  await prisma.bookingPrice.deleteMany({});
  await prisma.bookingPrice.createMany({
    skipDuplicates: true,
    data: [
      { key: 'telemedicine',        label: 'Telemedicine Consultation',                priceEgp: 700   },
      { key: 'package:haraka',      label: 'Haraka — Joint & Arthritis Care (3 mo)',   priceEgp: 19500 },
      { key: 'package:wai',         label: 'Wai — Cognitive & Dementia Care (3 mo)',   priceEgp: 19500 },
      { key: 'package:amal',        label: 'Amal — Stroke Recovery (3 mo)',            priceEgp: 19500 },
      { key: 'package:sanad:3m',    label: 'Sanad — Continuous Care (3 months)',       priceEgp: 19500 },
      { key: 'package:sanad:1y',    label: 'Sanad — Continuous Care (1 year)',         priceEgp: 65000 },
    ],
  });

  // ── Promocodes ────────────────────────────────────────────────────────────
  console.log('Seeding promocodes...');
  await prisma.promocode.upsert({
    where: { code: 'TEST99' },
    update: {
      isActive: true,
      kind: 'percentage',
      value: 99,
      description: 'Internal test code — 99% off',
    },
    create: {
      code: 'TEST99',
      description: 'Internal test code — 99% off',
      kind: 'percentage',
      value: 99,
      isActive: true,
    },
  });

  // ── Specialties ───────────────────────────────────────────────────────────
  console.log('Seeding specialties...');
  await prisma.specialty.createMany({
    skipDuplicates: true,
    data: [
      { code: 'geriatrics',       nameEn: 'Geriatrics',              nameAr: 'طب الشيخوخة',                sortOrder: 1  },
      { code: 'orthopedics',      nameEn: 'Orthopedics',             nameAr: 'جراحة العظام',               sortOrder: 2  },
      { code: 'neurology',        nameEn: 'Neurology',               nameAr: 'طب الأعصاب',                 sortOrder: 3  },
      { code: 'cardiology',       nameEn: 'Cardiology',              nameAr: 'أمراض القلب',                sortOrder: 4  },
      { code: 'generalMedicine',  nameEn: 'General Medicine',        nameAr: 'الطب العام',                 sortOrder: 5  },
      { code: 'pediatrics',       nameEn: 'Pediatrics',              nameAr: 'طب الأطفال',                 sortOrder: 6  },
      { code: 'dermatology',      nameEn: 'Dermatology',             nameAr: 'الأمراض الجلدية',            sortOrder: 7  },
      { code: 'gynecology',       nameEn: 'Gynecology',              nameAr: 'أمراض النساء والتوليد',      sortOrder: 8  },
      { code: 'ophthalmology',    nameEn: 'Ophthalmology',           nameAr: 'طب العيون',                  sortOrder: 9  },
      { code: 'otolaryngology',   nameEn: 'Ear, Nose & Throat',      nameAr: 'أنف وأذن وحنجرة',            sortOrder: 10 },
      { code: 'psychiatry',       nameEn: 'Psychiatry',              nameAr: 'الطب النفسي',                sortOrder: 11 },
      { code: 'urology',          nameEn: 'Urology',                 nameAr: 'طب المسالك البولية',         sortOrder: 12 },
      { code: 'gastroenterology', nameEn: 'Gastroenterology',        nameAr: 'أمراض الجهاز الهضمي',       sortOrder: 13 },
      { code: 'pulmonology',      nameEn: 'Pulmonology',             nameAr: 'أمراض الصدر والتنفس',        sortOrder: 14 },
      { code: 'rheumatology',     nameEn: 'Rheumatology',            nameAr: 'أمراض الروماتيزم',           sortOrder: 15 },
      { code: 'endocrinology',    nameEn: 'Endocrinology & Diabetes',nameAr: 'الغدد الصماء والسكري',       sortOrder: 16 },
      { code: 'nephrology',       nameEn: 'Nephrology',              nameAr: 'أمراض الكلى',                sortOrder: 17 },
      { code: 'oncology',         nameEn: 'Oncology',                nameAr: 'علاج الأورام',               sortOrder: 18 },
      { code: 'hematology',       nameEn: 'Hematology',              nameAr: 'أمراض الدم',                 sortOrder: 19 },
      { code: 'immunology',       nameEn: 'Allergy & Immunology',    nameAr: 'الحساسية والمناعة',           sortOrder: 20 },
    ],
  });

  // ── Content Services (marketing /services page) ───────────────────────────
  console.log('Seeding content services...');
  await prisma.contentService.createMany({
    skipDuplicates: true,
    data: [
      { code: 'doctorVisits',     iconClass: 'isax isax-health',          landingSlug: 'doctor-at-home',          sortOrder: 1  },
      { code: 'elderlyCare',      iconClass: 'isax isax-heart-add',        landingSlug: 'elderly-care-at-home',    sortOrder: 2  },
      { code: 'telemedicine',     iconClass: 'isax isax-video',            landingSlug: null,                      sortOrder: 3  },
      { code: 'nursingCare',      iconClass: 'isax isax-hospital',         landingSlug: null,                      sortOrder: 4  },
      { code: 'physiotherapy',    iconClass: 'isax isax-activity',         landingSlug: 'physiotherapy-at-home',   sortOrder: 5  },
      { code: 'labTests',         iconClass: 'isax isax-clipboard-text',   landingSlug: null,                      sortOrder: 6  },
      { code: 'medications',      iconClass: 'isax isax-box-time',         landingSlug: null,                      sortOrder: 7  },
      { code: 'postOperative',    iconClass: 'isax isax-security-user',    landingSlug: null,                      sortOrder: 8  },
      { code: 'remoteMonitoring', iconClass: 'isax isax-monitor',          landingSlug: null,                      sortOrder: 9  },
      { code: 'homeRadiology',    iconClass: 'isax isax-scan',             landingSlug: null,                      sortOrder: 10 },
      { code: 'palliativeCare',   iconClass: 'isax isax-heart',            landingSlug: null,                      sortOrder: 11 },
    ],
  });

  // ── Demo Portal Data (patient profile + visits) ───────────────────────────
  console.log('Seeding demo portal data...');

  const demoArea = await prisma.area.findFirst({ where: { code: 'AR-005' } });
  const demoService = await prisma.service.findFirst({ where: { code: 'SV-001' } });
  const demoProviderRole = await prisma.providerRole.findFirst({ where: { code: 'RL-01' } });

  if (demoArea && demoService && demoProviderRole) {
    await prisma.provider.upsert({
      where: { code: 'PRV-DEMO-001' },
      update: {
        fullName: 'Dr. Demo Care',
        roleId: demoProviderRole.id,
        joiningDate: new Date('2025-01-01'),
        baseRateEgp: 1200,
        paymentType: 'per_visit',
        primaryAreaId: demoArea.id,
        status: 'active',
      },
      create: {
        code: 'PRV-DEMO-001',
        fullName: 'Dr. Demo Care',
        roleId: demoProviderRole.id,
        joiningDate: new Date('2025-01-01'),
        baseRateEgp: 1200,
        paymentType: 'per_visit',
        primaryAreaId: demoArea.id,
        status: 'active',
      },
    });

    const demoProvider = await prisma.provider.findUnique({ where: { code: 'PRV-DEMO-001' } });
    if (!demoProvider) {
      throw new Error('Failed to seed demo provider.');
    }

    const patientPasswordHash = await bcrypt.hash('Portal@123', 10);

    await prisma.patient.upsert({
      where: { code: 'PT-DEMO-001' },
      update: {
        fullName: 'Demo Patient One',
        phone: '+201055500001',
        areaId: demoArea.id,
        addressDetail: 'Fifth Settlement, Cairo',
        primaryCaregiver: 'Mahmoud Ali',
        primaryCaregiverPhone: '+201155500099',
        caregiverRelation: 'Son',
        chiefComplaint: 'Follow-up for blood pressure and mobility',
        status: 'active',
        gender: 'M',
        dateOfBirth: new Date('1958-03-14'),
        bloodGroup: 'O_POSITIVE',
        insuranceProvider: 'AXA Egypt — Premium Care',
        insurancePolicyNumber: 'POL-2026-44871',
        insuranceMemberId: 'AXA-EG-554-001',
        insuranceExpiry: new Date('2026-12-31'),
        addressMapUrl: 'https://maps.google.com/?q=30.0287,31.4969',
      },
      create: {
        code: 'PT-DEMO-001',
        fullName: 'Demo Patient One',
        phone: '+201055500001',
        areaId: demoArea.id,
        addressDetail: 'Fifth Settlement, Cairo',
        registrationDate: new Date('2026-01-10'),
        primaryCaregiver: 'Mahmoud Ali',
        primaryCaregiverPhone: '+201155500099',
        caregiverRelation: 'Son',
        chiefComplaint: 'Follow-up for blood pressure and mobility',
        status: 'active',
        gender: 'M',
        dateOfBirth: new Date('1958-03-14'),
        bloodGroup: 'O_POSITIVE',
        insuranceProvider: 'AXA Egypt — Premium Care',
        insurancePolicyNumber: 'POL-2026-44871',
        insuranceMemberId: 'AXA-EG-554-001',
        insuranceExpiry: new Date('2026-12-31'),
        addressMapUrl: 'https://maps.google.com/?q=30.0287,31.4969',
      },
    });

    await prisma.patient.upsert({
      where: { code: 'PT-DEMO-002' },
      update: {
        fullName: 'Demo Patient Two',
        phone: '+201055500002',
        areaId: demoArea.id,
        addressDetail: 'New Cairo, Cairo',
        primaryCaregiver: 'Mona Hassan',
        caregiverRelation: 'Daughter',
        chiefComplaint: 'Post-operative home monitoring',
        status: 'active',
      },
      create: {
        code: 'PT-DEMO-002',
        fullName: 'Demo Patient Two',
        phone: '+201055500002',
        areaId: demoArea.id,
        addressDetail: 'New Cairo, Cairo',
        registrationDate: new Date('2026-02-03'),
        primaryCaregiver: 'Mona Hassan',
        caregiverRelation: 'Daughter',
        chiefComplaint: 'Post-operative home monitoring',
        status: 'active',
      },
    });

    const demoPatient1 = await prisma.patient.findUnique({ where: { code: 'PT-DEMO-001' } });
    const demoPatient2 = await prisma.patient.findUnique({ where: { code: 'PT-DEMO-002' } });
    if (!demoPatient1 || !demoPatient2) {
      throw new Error('Failed to seed demo patients.');
    }

    await prisma.user.upsert({
      where: { phone: '+201055500001' },
      update: {
        name: demoPatient1.fullName,
        role: 'patient',
        patientId: demoPatient1.id,
        phone: demoPatient1.phone,
        passwordHash: patientPasswordHash,
      },
      create: {
        name: demoPatient1.fullName,
        phone: demoPatient1.phone,
        role: 'patient',
        patientId: demoPatient1.id,
        passwordHash: patientPasswordHash,
      },
    });

    await prisma.user.upsert({
      where: { phone: '+201055500002' },
      update: {
        name: demoPatient2.fullName,
        role: 'patient',
        patientId: demoPatient2.id,
        phone: demoPatient2.phone,
        passwordHash: patientPasswordHash,
      },
      create: {
        name: demoPatient2.fullName,
        phone: demoPatient2.phone,
        role: 'patient',
        patientId: demoPatient2.id,
        passwordHash: patientPasswordHash,
      },
    });

    const caregiverPasswordHash = await bcrypt.hash('Caregiver@123', 10);
    await prisma.user.upsert({
      where: { phone: '+201155500099' },
      update: {
        name: 'Demo Caregiver Mahmoud',
        role: 'patient',
        patientId: null,
        phone: '+201155500099',
        passwordHash: caregiverPasswordHash,
      },
      create: {
        name: 'Demo Caregiver Mahmoud',
        role: 'patient',
        patientId: null,
        phone: '+201155500099',
        passwordHash: caregiverPasswordHash,
      },
    });

    const demoVisit1 = await prisma.visit.upsert({
      where: { code: 'VIS-DEMO-001' },
      update: {
        patientId: demoPatient1.id,
        providerId: demoProvider.id,
        serviceId: demoService.id,
        areaId: demoArea.id,
        scheduledDate: new Date('2026-06-10'),
        bookedDate: new Date('2026-06-08'),
        status: 'scheduled',
        visitType: 'in_home',
        servicePriceEgp: 1500,
        discountEgp: 0,
        netPriceEgp: 1500,
        providerPayoutEgp: 1200,
        notes: 'Demo upcoming portal visit',
      },
      create: {
        code: 'VIS-DEMO-001',
        patientId: demoPatient1.id,
        providerId: demoProvider.id,
        serviceId: demoService.id,
        areaId: demoArea.id,
        scheduledDate: new Date('2026-06-10'),
        bookedDate: new Date('2026-06-08'),
        status: 'scheduled',
        visitType: 'in_home',
        servicePriceEgp: 1500,
        discountEgp: 0,
        netPriceEgp: 1500,
        providerPayoutEgp: 1200,
        notes: 'Demo upcoming portal visit',
      },
    });

    const demoVisit2 = await prisma.visit.upsert({
      where: { code: 'VIS-DEMO-002' },
      update: {
        patientId: demoPatient1.id,
        providerId: demoProvider.id,
        serviceId: demoService.id,
        areaId: demoArea.id,
        scheduledDate: new Date('2026-05-12'),
        bookedDate: new Date('2026-05-10'),
        status: 'completed',
        visitType: 'telemedicine',
        servicePriceEgp: 350,
        discountEgp: 0,
        netPriceEgp: 350,
        providerPayoutEgp: 200,
        notes: 'Demo completed portal visit',
      },
      create: {
        code: 'VIS-DEMO-002',
        patientId: demoPatient1.id,
        providerId: demoProvider.id,
        serviceId: demoService.id,
        areaId: demoArea.id,
        scheduledDate: new Date('2026-05-12'),
        bookedDate: new Date('2026-05-10'),
        status: 'completed',
        visitType: 'telemedicine',
        servicePriceEgp: 350,
        discountEgp: 0,
        netPriceEgp: 350,
        providerPayoutEgp: 200,
        notes: 'Demo completed portal visit',
      },
    });

    const staffPasswordHash = await bcrypt.hash('Admin@123', 10);
    await prisma.staff.upsert({
      where: { email: 'admin@aneeshealth.local' },
      update: {
        name: 'Demo Admin',
        role: 'superadmin',
        status: 'active',
        passwordHash: staffPasswordHash,
      },
      create: {
        name: 'Demo Admin',
        email: 'admin@aneeshealth.local',
        role: 'superadmin',
        status: 'active',
        passwordHash: staffPasswordHash,
      },
    });

    const demoStaff = await prisma.staff.findUnique({ where: { email: 'admin@aneeshealth.local' } });
    if (!demoStaff) {
      throw new Error('Failed to seed demo staff account.');
    }

    await prisma.user.upsert({
      where: { email: demoStaff.email },
      update: {
        name: demoStaff.name,
        role: 'staff',
        staffId: demoStaff.id,
      },
      create: {
        name: demoStaff.name,
        email: demoStaff.email,
        role: 'staff',
        staffId: demoStaff.id,
      },
    });

    const operatorPasswordHash = await bcrypt.hash('Operator@123', 10);
    await prisma.staff.upsert({
      where: { email: 'operator@aneeshealth.local' },
      update: {
        name: 'Demo Operator',
        role: 'operator',
        status: 'active',
        passwordHash: operatorPasswordHash,
      },
      create: {
        name: 'Demo Operator',
        email: 'operator@aneeshealth.local',
        role: 'operator',
        status: 'active',
        passwordHash: operatorPasswordHash,
      },
    });

    const demoOperator = await prisma.staff.findUnique({ where: { email: 'operator@aneeshealth.local' } });
    if (!demoOperator) {
      throw new Error('Failed to seed demo operator account.');
    }

    await prisma.user.upsert({
      where: { email: demoOperator.email },
      update: {
        name: demoOperator.name,
        role: 'staff',
        staffId: demoOperator.id,
      },
      create: {
        name: demoOperator.name,
        email: demoOperator.email,
        role: 'staff',
        staffId: demoOperator.id,
      },
    });

    const doctorPasswordHash = await bcrypt.hash('Doctor@123', 10);
    await prisma.staff.upsert({
      where: { email: 'doctor@aneeshealth.local' },
      update: {
        name: 'Demo Doctor',
        role: 'doctor',
        status: 'active',
        passwordHash: doctorPasswordHash,
      },
      create: {
        name: 'Demo Doctor',
        email: 'doctor@aneeshealth.local',
        role: 'doctor',
        status: 'active',
        passwordHash: doctorPasswordHash,
      },
    });

    const physioPasswordHash = await bcrypt.hash('Physio@123', 10);
    await prisma.staff.upsert({
      where: { email: 'physio@aneeshealth.local' },
      update: {
        name: 'Demo Physio',
        role: 'physiotherapist',
        status: 'active',
        passwordHash: physioPasswordHash,
      },
      create: {
        name: 'Demo Physio',
        email: 'physio@aneeshealth.local',
        role: 'physiotherapist',
        status: 'active',
        passwordHash: physioPasswordHash,
      },
    });

    const nursePasswordHash = await bcrypt.hash('Nurse@123', 10);
    await prisma.staff.upsert({
      where: { email: 'nurse@aneeshealth.local' },
      update: {
        name: 'Demo Nurse',
        role: 'nurse',
        status: 'active',
        passwordHash: nursePasswordHash,
      },
      create: {
        name: 'Demo Nurse',
        email: 'nurse@aneeshealth.local',
        role: 'nurse',
        status: 'active',
        passwordHash: nursePasswordHash,
      },
    });

    const demoDoctor = await prisma.staff.findUnique({ where: { email: 'doctor@aneeshealth.local' } });
    const demoPhysio = await prisma.staff.findUnique({ where: { email: 'physio@aneeshealth.local' } });
    const demoNurse = await prisma.staff.findUnique({ where: { email: 'nurse@aneeshealth.local' } });
    if (!demoDoctor || !demoPhysio || !demoNurse) {
      throw new Error('Failed to seed doctor/physio/nurse accounts.');
    }

    await prisma.user.upsert({
      where: { email: demoDoctor.email },
      update: { name: demoDoctor.name, role: 'staff', staffId: demoDoctor.id },
      create: { name: demoDoctor.name, email: demoDoctor.email, role: 'staff', staffId: demoDoctor.id },
    });
    await prisma.user.upsert({
      where: { email: demoPhysio.email },
      update: { name: demoPhysio.name, role: 'staff', staffId: demoPhysio.id },
      create: { name: demoPhysio.name, email: demoPhysio.email, role: 'staff', staffId: demoPhysio.id },
    });
    await prisma.user.upsert({
      where: { email: demoNurse.email },
      update: { name: demoNurse.name, role: 'staff', staffId: demoNurse.id },
      create: { name: demoNurse.name, email: demoNurse.email, role: 'staff', staffId: demoNurse.id },
    });

    const additionalRoleAccounts = [
      { name: 'Demo Medical Ops', email: 'medops@aneeshealth.local', role: 'medical_ops' as const, password: 'MedOps@123' },
      { name: 'Demo Insurance Coordinator', email: 'insurance@aneeshealth.local', role: 'insurance_coordinator' as const, password: 'Insurance@123' },
      { name: 'Demo Compliance Officer', email: 'compliance@aneeshealth.local', role: 'compliance_officer' as const, password: 'Compliance@123' },
      { name: 'Demo Hospital Partner Admin', email: 'partner@aneeshealth.local', role: 'hospital_partner_admin' as const, password: 'Partner@123' },
      { name: 'Demo Finance', email: 'finance@aneeshealth.local', role: 'finance' as const, password: 'Finance@123' },
      { name: 'Demo Viewer', email: 'viewer@aneeshealth.local', role: 'viewer' as const, password: 'Viewer@123' },
    ];

    for (const account of additionalRoleAccounts) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      const staffRow = await prisma.staff.upsert({
        where: { email: account.email },
        update: {
          name: account.name,
          role: account.role,
          status: 'active',
          passwordHash,
        },
        create: {
          name: account.name,
          email: account.email,
          role: account.role,
          status: 'active',
          passwordHash,
        },
      });

      await prisma.user.upsert({
        where: { email: staffRow.email },
        update: {
          name: staffRow.name,
          role: 'staff',
          staffId: staffRow.id,
        },
        create: {
          name: staffRow.name,
          email: staffRow.email,
          role: 'staff',
          staffId: staffRow.id,
        },
      });
    }

    // Invoices + payment for the completed visit
    const cardPaymentMethod = await prisma.paymentMethod.findFirst({ where: { code: 'PM-04' } });
    const cashPaymentMethod = await prisma.paymentMethod.findFirst({ where: { code: 'PM-01' } });

    const existingInvoice1 = await prisma.invoice.findFirst({ where: { code: 'INV-DEMO-001' } });
    const invoice1 = existingInvoice1 ?? await prisma.invoice.create({
      data: {
        code: 'INV-DEMO-001',
        patientId: demoPatient1.id,
        invoiceDate: new Date('2026-05-12'),
        linkedType: 'visit',
        linkedVisitId: demoVisit2.id,
        grossAmountEgp: 350,
        discountPct: 0,
        netAmountEgp: 350,
        dueDate: new Date('2026-05-12'),
        status: 'paid',
        notes: 'Telemedicine follow-up — paid online.',
      },
    });

    const existingInvoice2 = await prisma.invoice.findFirst({ where: { code: 'INV-DEMO-002' } });
    if (!existingInvoice2) {
      await prisma.invoice.create({
        data: {
          code: 'INV-DEMO-002',
          patientId: demoPatient1.id,
          invoiceDate: new Date('2026-06-08'),
          linkedType: 'visit',
          linkedVisitId: demoVisit1.id,
          grossAmountEgp: 1500,
          discountPct: 0,
          netAmountEgp: 1500,
          dueDate: new Date('2026-06-12'),
          status: 'issued',
          notes: 'Upcoming in-home visit — invoice issued at booking.',
        },
      });
    }

    if (cardPaymentMethod) {
      const existingPayment = await prisma.payment.findFirst({ where: { code: 'PAY-DEMO-001' } });
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            code: 'PAY-DEMO-001',
            invoiceId: invoice1.id,
            patientId: demoPatient1.id,
            paymentDate: new Date('2026-05-12'),
            amountEgp: 350,
            paymentMethodId: cardPaymentMethod.id,
            referenceNumber: 'KASHIER-TX-882431',
            notes: 'Online payment via Kashier.',
          },
        });
      }
    } else if (cashPaymentMethod) {
      const existingPayment = await prisma.payment.findFirst({ where: { code: 'PAY-DEMO-001' } });
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            code: 'PAY-DEMO-001',
            invoiceId: invoice1.id,
            patientId: demoPatient1.id,
            paymentDate: new Date('2026-05-12'),
            amountEgp: 350,
            paymentMethodId: cashPaymentMethod.id,
            notes: 'Cash on visit completion.',
          },
        });
      }
    }

    // Insurance/claims demo entities for the insurance workspace.
    const demoInsurer = await prisma.insurerProfile.upsert({
      where: { code: 'INS-AXA-DEMO' },
      update: {
        name: 'AXA Egypt Demo Payer',
        payerType: 'private',
        supportsDirectBilling: true,
        isActive: true,
        notes: 'Seeded insurer profile for role-matrix insurance workspace demo.',
      },
      create: {
        code: 'INS-AXA-DEMO',
        name: 'AXA Egypt Demo Payer',
        payerType: 'private',
        supportsDirectBilling: true,
        isActive: true,
        notes: 'Seeded insurer profile for role-matrix insurance workspace demo.',
      },
    });

    await prisma.coverage.upsert({
      where: { id: 'cov_demo_pt_001' },
      update: {
        patientId: demoPatient1.id,
        insurerProfileId: demoInsurer.id,
        memberId: 'AXA-EG-554-001',
        policyNumber: 'POL-2026-44871',
        planName: 'Premium Care Gold',
        status: 'active',
        startsAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
        tenantId: 'platform',
      },
      create: {
        id: 'cov_demo_pt_001',
        patientId: demoPatient1.id,
        insurerProfileId: demoInsurer.id,
        memberId: 'AXA-EG-554-001',
        policyNumber: 'POL-2026-44871',
        planName: 'Premium Care Gold',
        status: 'active',
        startsAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
        tenantId: 'platform',
      },
    });

    const demoPriorAuth = await prisma.priorAuth.upsert({
      where: { id: 'prior_auth_demo_001' },
      update: {
        patientId: demoPatient1.id,
        insurerProfileId: demoInsurer.id,
        referenceNumber: 'PA-AXA-2026-0001',
        requestedFor: '8-session post-op home physiotherapy block',
        status: 'approved',
        submittedAt: new Date('2026-05-15T10:00:00Z'),
        resolvedAt: new Date('2026-05-16T13:30:00Z'),
        expiresAt: new Date('2026-08-16T00:00:00Z'),
        notes: 'Approved for one quarter under post-op mobility restoration bundle.',
        tenantId: 'platform',
      },
      create: {
        id: 'prior_auth_demo_001',
        patientId: demoPatient1.id,
        insurerProfileId: demoInsurer.id,
        referenceNumber: 'PA-AXA-2026-0001',
        requestedFor: '8-session post-op home physiotherapy block',
        status: 'approved',
        submittedAt: new Date('2026-05-15T10:00:00Z'),
        resolvedAt: new Date('2026-05-16T13:30:00Z'),
        expiresAt: new Date('2026-08-16T00:00:00Z'),
        notes: 'Approved for one quarter under post-op mobility restoration bundle.',
        tenantId: 'platform',
      },
    });

    const demoClaim = await prisma.claim.upsert({
      where: { code: 'CLM-DEMO-0001' },
      update: {
        patientId: demoPatient1.id,
        visitId: demoVisit2.id,
        insurerProfileId: demoInsurer.id,
        priorAuthId: demoPriorAuth.id,
        status: 'submitted',
        submittedAt: new Date('2026-05-17T09:00:00Z'),
        totalAmountEgp: 350,
        approvedAmountEgp: null,
        deniedReason: null,
        tenantId: 'platform',
      },
      create: {
        code: 'CLM-DEMO-0001',
        patientId: demoPatient1.id,
        visitId: demoVisit2.id,
        insurerProfileId: demoInsurer.id,
        priorAuthId: demoPriorAuth.id,
        status: 'submitted',
        submittedAt: new Date('2026-05-17T09:00:00Z'),
        totalAmountEgp: 350,
        approvedAmountEgp: null,
        deniedReason: null,
        tenantId: 'platform',
      },
    });

    await prisma.claimLineItem.upsert({
      where: { id: 'claim_line_demo_001' },
      update: {
        claimId: demoClaim.id,
        serviceCode: 'SV-001',
        description: 'Telemedicine follow-up consultation',
        quantity: 1,
        unitPriceEgp: 350,
        amountEgp: 350,
        status: 'pending',
        notes: 'Awaiting adjudication.',
      },
      create: {
        id: 'claim_line_demo_001',
        claimId: demoClaim.id,
        serviceCode: 'SV-001',
        description: 'Telemedicine follow-up consultation',
        quantity: 1,
        unitPriceEgp: 350,
        amountEgp: 350,
        status: 'pending',
        notes: 'Awaiting adjudication.',
      },
    });

    // Compliance workspace demo events.
    const complianceEvents = [
      { key: 'audit_seed_restricted_read_001', tableName: 'restricted_clinical_access', action: 'read' as const, changedBy: 'staff_nurse_demo', changedFields: { accessType: 'restricted', reason: 'Night shift continuity of care' } },
      { key: 'audit_seed_break_glass_001', tableName: 'restricted_clinical_access', action: 'override' as const, changedBy: 'staff_doctor_demo', changedFields: { accessType: 'break_glass', reason: 'Emergency respiratory decline' } },
      { key: 'audit_seed_export_001', tableName: 'documents', action: 'export' as const, changedBy: 'staff_compliance_demo', changedFields: { route: '/api/ehr/documents/[id]' } },
      { key: 'audit_seed_access_denied_001', tableName: 'documents', action: 'access_denied' as const, changedBy: 'staff_viewer_demo', changedFields: { reason: 'Missing consent scope' } },
      { key: 'audit_seed_login_001', tableName: 'staff', action: 'login' as const, changedBy: 'staff_admin_demo', changedFields: { provider: 'staff-credentials' } },
      { key: 'audit_seed_logout_001', tableName: 'staff', action: 'logout' as const, changedBy: 'staff_admin_demo', changedFields: { source: 'header' } },
    ];

    for (const event of complianceEvents) {
      const exists = await prisma.auditLog.findFirst({
        where: {
          tableName: event.tableName,
          recordId: event.key,
          action: event.action,
        },
        select: { id: true },
      });

      if (!exists) {
        await prisma.auditLog.create({
          data: {
            tableName: event.tableName,
            recordId: event.key,
            action: event.action,
            changedBy: event.changedBy,
            changedFields: event.changedFields as Prisma.JsonObject,
            changedAt: new Date(),
          },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Structured rehab case seed (AN-3211-0725)
    //
    // Structured from supplied medical report text. Dates are seeded only
    // when explicitly provided in the source notes.
    // ─────────────────────────────────────────────────────────────────────
    const raqiaMedicalReport = buildRehabCaseProfile();

    const raqiaArabicAddress =
      process.env.SEED_EHR_CASE_ADDRESS?.trim() || 'القاهرة، منطقة سكنية - بيانات عنوان تجريبية';
    const raqiaMapUrl = process.env.SEED_EHR_CASE_MAP_URL?.trim() || 'https://maps.google.com/?q=30.0500,31.2500';
    const raqiaCaregiverPhone = raqiaMedicalReport.caregiver.contact;

    await prisma.family.upsert({
      where: { code: 'FAM-AN-3211' },
      update: {
        name: 'Family of AN-3211-0725',
        primaryContactName: raqiaMedicalReport.caregiver.name,
        primaryContactPhone: raqiaMedicalReport.caregiver.contact,
        relationToPatients: raqiaMedicalReport.caregiver.relationship,
        areaId: demoArea.id,
        status: 'active',
        notes: 'Primary caregiver manages care coordination and portal communication.',
      },
      create: {
        code: 'FAM-AN-3211',
        name: 'Family of AN-3211-0725',
        primaryContactName: raqiaMedicalReport.caregiver.name,
        primaryContactPhone: raqiaMedicalReport.caregiver.contact,
        relationToPatients: raqiaMedicalReport.caregiver.relationship,
        areaId: demoArea.id,
        registrationDate: new Date(raqiaMedicalReport.admission.admittedAt),
        status: 'active',
        notes: 'Primary caregiver manages care coordination and portal communication.',
      },
    });

    const raqiaFamily = await prisma.family.findUnique({ where: { code: 'FAM-AN-3211' } });
    if (!raqiaFamily) throw new Error('Failed to seed case family record.');

    // Provider for physio visits (separate from the doctor demoProvider so
    // the portal can group visits by clinical role).
    const physioProviderRole = await prisma.providerRole.findUnique({ where: { code: 'RL-02' } });
    if (!physioProviderRole) throw new Error('Provider role RL-02 (Physiotherapist) missing.');
    const physioServiceLookup = await prisma.service.findUnique({ where: { code: 'SV-005' } });
    if (!physioServiceLookup) throw new Error('Service SV-005 (Physiotherapy) missing.');
    await prisma.provider.upsert({
      where: { code: 'PRV-RAQ-PT' },
      update: {
        fullName: 'Anees Physiotherapy Team',
        roleId: physioProviderRole.id,
        paymentType: 'per_visit',
        primaryAreaId: demoArea.id,
        status: 'active',
      },
      create: {
        code: 'PRV-RAQ-PT',
        fullName: 'Anees Physiotherapy Team',
        roleId: physioProviderRole.id,
        joiningDate: new Date('2025-06-01'),
        baseRateEgp: 300,
        paymentType: 'per_visit',
        primaryAreaId: demoArea.id,
        status: 'active',
      },
    });
    const physioProvider = await prisma.provider.findUnique({ where: { code: 'PRV-RAQ-PT' } });
    if (!physioProvider) throw new Error('Failed to seed physio provider.');

    await prisma.patient.upsert({
      where: { code: 'AN-3211-0725' },
      update: {
        familyId: raqiaFamily.id,
        fullName: raqiaMedicalReport.patient.name,
        arabicName: process.env.SEED_EHR_CASE_PATIENT_NAME_AR?.trim() || 'حالة إعادة تأهيل AN-3211-0725',
        phone: raqiaCaregiverPhone,
        gender: raqiaMedicalReport.patient.gender,
        addressDetail: raqiaArabicAddress,
        addressMapUrl: raqiaMapUrl,
        primaryCaregiver: raqiaMedicalReport.caregiver.name,
        primaryCaregiverPhone: raqiaCaregiverPhone,
        primaryCaregiverWhatsapp: raqiaCaregiverPhone,
        caregiverRelation: raqiaMedicalReport.caregiver.relationship,
        emergencyContactName: raqiaMedicalReport.caregiver.name,
        emergencyContactPhone: raqiaCaregiverPhone,
        emergencyContactRelation: raqiaMedicalReport.caregiver.relationship,
        chiefComplaint: raqiaMedicalReport.presentingComplaint,
        status: 'active',
        notes: buildCaseNotes(raqiaMedicalReport),
      },
      create: {
        code: raqiaMedicalReport.patient.patientId,
        familyId: raqiaFamily.id,
        fullName: raqiaMedicalReport.patient.name,
        arabicName: process.env.SEED_EHR_CASE_PATIENT_NAME_AR?.trim() || 'حالة إعادة تأهيل AN-3211-0725',
        phone: raqiaCaregiverPhone,
        gender: raqiaMedicalReport.patient.gender,
        addressDetail: raqiaArabicAddress,
        addressMapUrl: raqiaMapUrl,
        registrationDate: new Date(raqiaMedicalReport.admission.admittedAt),
        primaryCaregiver: raqiaMedicalReport.caregiver.name,
        primaryCaregiverPhone: raqiaCaregiverPhone,
        primaryCaregiverWhatsapp: raqiaCaregiverPhone,
        caregiverRelation: raqiaMedicalReport.caregiver.relationship,
        emergencyContactName: raqiaMedicalReport.caregiver.name,
        emergencyContactPhone: raqiaCaregiverPhone,
        emergencyContactRelation: raqiaMedicalReport.caregiver.relationship,
        chiefComplaint: raqiaMedicalReport.presentingComplaint,
        status: 'active',
        notes: buildCaseNotes(raqiaMedicalReport),
      },
    });

    const raqia = await prisma.patient.findUnique({ where: { code: 'AN-3211-0725' } });
    if (!raqia) throw new Error('Failed to seed rehab case patient.');
    const existingMedplumPatientId =
      (raqia as unknown as { medplumPatientId?: string | null }).medplumPatientId ?? null;

    const seededMedplumCase = await seedMedplumDataForCase({
      patientCode: raqiaMedicalReport.patient.patientId,
      patientName: raqiaMedicalReport.patient.name,
      patientPhone: raqiaCaregiverPhone,
      patientGender: raqiaMedicalReport.patient.gender,
      medplumPatientId: existingMedplumPatientId,
      physioSessions: raqiaMedicalReport.physioSessions,
    });

    if (seededMedplumCase.medplumPatientId && existingMedplumPatientId !== seededMedplumCase.medplumPatientId) {
      await prisma.$executeRaw`
        UPDATE patients
        SET "medplumPatientId" = ${seededMedplumCase.medplumPatientId}
        WHERE id = ${raqia.id}
      `;
    }

    const rehabCarePlan = await prisma.carePlan.upsert({
      where: { code: 'CP-AN3211-REHAB-2025' },
      update: {
        patientId: raqia.id,
        planName: 'Post-ORIF Hip Fracture Rehabilitation',
        startDate: new Date('2025-07-16'),
        endDate: new Date('2025-10-15'),
        totalVisitsPlanned: 24,
        totalPriceEgp: 12000,
        status: 'active',
        notes: raqiaMedicalReport.followUpPlan,
      },
      create: {
        code: 'CP-AN3211-REHAB-2025',
        patientId: raqia.id,
        planName: 'Post-ORIF Hip Fracture Rehabilitation',
        startDate: new Date('2025-07-16'),
        endDate: new Date('2025-10-15'),
        totalVisitsPlanned: 24,
        totalPriceEgp: 12000,
        status: 'active',
        notes: raqiaMedicalReport.followUpPlan,
      },
    });

    await prisma.visit.upsert({
      where: { code: 'VIS-AN3211-ADM-001' },
      update: {
        patientId: raqia.id,
        providerId: demoProvider.id,
        serviceId: demoService.id,
        carePlanId: rehabCarePlan.id,
        areaId: demoArea.id,
        bookedDate: new Date(raqiaMedicalReport.admission.admittedAt),
        scheduledDate: new Date(raqiaMedicalReport.admission.admittedAt),
        status: 'completed',
        visitType: 'in_home',
        servicePriceEgp: 1500,
        discountEgp: 0,
        netPriceEgp: 1500,
        providerPayoutEgp: 1200,
        notes: [
          'Hospital admission case summary (seeded to operational timeline).',
          `Mechanism: ${raqiaMedicalReport.mechanism}`,
          `Presenting complaint: ${raqiaMedicalReport.presentingComplaint}`,
          `Procedure: ${raqiaMedicalReport.surgery}`,
        ].join(' '),
      },
      create: {
        code: 'VIS-AN3211-ADM-001',
        patientId: raqia.id,
        providerId: demoProvider.id,
        serviceId: demoService.id,
        carePlanId: rehabCarePlan.id,
        areaId: demoArea.id,
        bookedDate: new Date(raqiaMedicalReport.admission.admittedAt),
        scheduledDate: new Date(raqiaMedicalReport.admission.admittedAt),
        status: 'completed',
        visitType: 'in_home',
        servicePriceEgp: 1500,
        discountEgp: 0,
        netPriceEgp: 1500,
        providerPayoutEgp: 1200,
        notes: [
          'Hospital admission case summary (seeded to operational timeline).',
          `Mechanism: ${raqiaMedicalReport.mechanism}`,
          `Presenting complaint: ${raqiaMedicalReport.presentingComplaint}`,
          `Procedure: ${raqiaMedicalReport.surgery}`,
        ].join(' '),
      },
    });

    for (const [index, session] of raqiaMedicalReport.physioSessions.entries()) {
      const code = `VIS-AN3211-PT-${String(index + 1).padStart(3, '0')}`;
      const sessionDate = new Date(session.date);

      await prisma.visit.upsert({
        where: { code },
        update: {
          patientId: raqia.id,
          providerId: physioProvider.id,
          serviceId: physioServiceLookup.id,
          carePlanId: rehabCarePlan.id,
          areaId: demoArea.id,
          bookedDate: sessionDate,
          scheduledDate: sessionDate,
          status: 'completed',
          visitType: 'in_home',
          servicePriceEgp: 500,
          discountEgp: 0,
          netPriceEgp: 500,
          providerPayoutEgp: 300,
          notes: `${session.title}: ${session.notes}`,
        },
        create: {
          code,
          patientId: raqia.id,
          providerId: physioProvider.id,
          serviceId: physioServiceLookup.id,
          carePlanId: rehabCarePlan.id,
          areaId: demoArea.id,
          bookedDate: sessionDate,
          scheduledDate: sessionDate,
          status: 'completed',
          visitType: 'in_home',
          servicePriceEgp: 500,
          discountEgp: 0,
          netPriceEgp: 500,
          providerPayoutEgp: 300,
          notes: `${session.title}: ${session.notes}`,
        },
      });
    }

    // Caregiver-driven portal login (idempotent for both phone and patientId uniqueness).
    const existingRaqiaUserByPatient = await prisma.user.findFirst({ where: { patientId: raqia.id } });
    if (existingRaqiaUserByPatient) {
      await prisma.user.update({
        where: { id: existingRaqiaUserByPatient.id },
        data: {
          name: raqia.fullName,
          role: 'patient',
          patientId: raqia.id,
          phone: raqiaCaregiverPhone,
          passwordHash: patientPasswordHash,
        },
      });
    } else {
      await prisma.user.upsert({
        where: { phone: raqiaCaregiverPhone },
        update: {
          name: raqia.fullName,
          role: 'patient',
          patientId: raqia.id,
          passwordHash: patientPasswordHash,
        },
        create: {
          name: raqia.fullName,
          phone: raqiaCaregiverPhone,
          role: 'patient',
          patientId: raqia.id,
          passwordHash: patientPasswordHash,
        },
      });
    }

    console.log('Demo patient seed ready:');
    console.log('  - Identifier (phone): +201055500001');
    console.log('  - Identifier (case id): PT-DEMO-001');
    console.log('  - Password: Portal@123');
    console.log('Structured EHR case seed ready (AN-3211-0725):');
    console.log(`  - Identifier (phone): ${raqiaCaregiverPhone} (caregiver login)`);
    console.log('  - Identifier (case id): AN-3211-0725');
    console.log('  - Password: Portal@123');
    console.log(`  - Rehab sessions seeded: ${raqiaMedicalReport.physioSessions.length} dated sessions`);
    if (seededMedplumCase.seeded) {
      console.log('  - Medplum resources seeded: encounters, vitals, signed note, tasks, problems, allergies, medications, documents, labs, assessments');
    }
    console.log('Demo staff seed ready:');
    console.log('  - Email: admin@aneeshealth.local');
    console.log('  - Password: Admin@123');
    console.log('  - Email: operator@aneeshealth.local');
    console.log('  - Password: Operator@123');
    console.log('  - Email: medops@aneeshealth.local');
    console.log('  - Password: MedOps@123');
    console.log('  - Email: doctor@aneeshealth.local');
    console.log('  - Password: Doctor@123');
    console.log('  - Email: physio@aneeshealth.local');
    console.log('  - Password: Physio@123');
    console.log('  - Email: nurse@aneeshealth.local');
    console.log('  - Password: Nurse@123');
    console.log('  - Email: insurance@aneeshealth.local');
    console.log('  - Password: Insurance@123');
    console.log('  - Email: compliance@aneeshealth.local');
    console.log('  - Password: Compliance@123');
    console.log('  - Email: partner@aneeshealth.local');
    console.log('  - Password: Partner@123');
    console.log('  - Email: finance@aneeshealth.local');
    console.log('  - Password: Finance@123');
    console.log('  - Email: viewer@aneeshealth.local');
    console.log('  - Password: Viewer@123');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
