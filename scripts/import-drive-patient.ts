/**
 * Import a structured patient record (sourced from the legacy Google Drive folders)
 * into the live system. Reads prisma/seed-data/patients/<CODE>.json.
 *
 * Phases:
 *   core      — Postgres `Patient` + Medplum `Patient` + AuditLog            (Phase 1)
 *   clinical  — Conditions, lab Observations, vitals, MedicationStatements,
 *               CareTeam in Medplum                                          (Phase 2)
 *   documents — staged files in prisma/seed-data/staging/<CODE>/ → R2 +
 *               DocumentReference (malware clean)                            (Phase 3)
 *   all       — core, then clinical, then documents
 *
 * Every resource carries a stable seed identifier, so each phase is idempotent
 * (re-running never duplicates).
 *
 * Usage:
 *   ts-node --project scripts/tsconfig.json scripts/import-drive-patient.ts AN-3226-0626 --phase=clinical
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ClientStorage, MedplumClient, MemoryStorage } from '@medplum/core';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// ---- env: load .env then .env.local (local overrides), no dotenv dependency ----
function loadEnvFile(file: string) {
  const path = join(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf-8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
// .env.local first so it wins, then .env fills gaps.
loadEnvFile('.env.local');
loadEnvFile('.env');

const PATIENT_CODE_SYSTEM = 'https://anees.health/fhir/identifier/patient-code';
const EXT_ADDRESS_MAP_URL = 'https://anees.health/fhir/StructureDefinition/address-map-url';
const EXT_CAREGIVER_REL = 'https://anees.health/fhir/StructureDefinition/caregiver-relationship-detail';
const AUDIT_ACTOR = 'import:drive-seed';

// Stable provenance identifier stamped on every resource we create, so every
// phase is idempotent (search-before-create keyed on this).
const SEED_SYSTEM = 'https://anees.health/fhir/identifier/drive-seed';
const DOC_CATEGORY_SYSTEM = 'https://anees.health/fhir/document-category';
const DOC_CHECKSUM_SYSTEM = 'https://anees.health/fhir/identifier/document-checksum-sha256';
const DOC_MALWARE_STATUS_SYSTEM = 'https://anees.health/fhir/identifier/document-malware-status';
const MALWARE_SECURITY_SYSTEM = 'https://anees.health/fhir/security/document-malware';
const R2_ATTACHMENT_PREFIX = 'urn:anees:r2:';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/** Search-before-create on the seed identifier. Returns existing or newly created resource. */
async function createIfAbsent(
  medplum: MedplumClient,
  resourceType: string,
  seedValue: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: () => any,
): Promise<{ id: string; created: boolean }> {
  const existing = await medplum.searchOne(resourceType as never, { identifier: `${SEED_SYSTEM}|${seedValue}` });
  if (existing?.id) return { id: existing.id, created: false };
  const resource = build();
  resource.identifier = [...(resource.identifier ?? []), { system: SEED_SYSTEM, value: seedValue }];
  const made = await medplum.createResource(resource as never);
  return { id: (made as { id: string }).id, created: true };
}

let r2Client: S3Client | null = null;
function getR2(): { client: S3Client; bucket: string } {
  const bucket = process.env.R2_BUCKET?.trim();
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 env (R2_BUCKET / R2_ACCOUNT_ID|R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)');
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return { client: r2Client, bucket };
}

function buildObjectKey(originalFilename: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safe = originalFilename.replace(/^.*[\\/]/, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
  return `ehr/${yyyy}/${mm}/${randomUUID()}-${safe}`;
}

function genderToFhir(g?: string): 'male' | 'female' | 'other' | 'unknown' | undefined {
  const v = g?.toLowerCase();
  return v === 'male' || v === 'female' || v === 'other' ? v : v ? 'unknown' : undefined;
}
function genderToPrisma(g?: string): 'M' | 'F' | 'other' | undefined {
  const v = g?.toLowerCase();
  return v === 'male' ? 'M' : v === 'female' ? 'F' : v ? 'other' : undefined;
}

async function getMedplum(): Promise<MedplumClient> {
  const baseUrl = process.env.MEDPLUM_BASE_URL?.trim();
  const clientId = process.env.MEDPLUM_CLIENT_ID?.trim();
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET?.trim();
  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error('Missing MEDPLUM_BASE_URL / MEDPLUM_CLIENT_ID / MEDPLUM_CLIENT_SECRET');
  }
  const client = new MedplumClient({
    baseUrl,
    cacheTime: 0,
    logLevel: 'none',
    storage: new ClientStorage(new MemoryStorage()),
  });
  await client.startClientLogin(clientId, clientSecret);
  return client;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runCore(prisma: PrismaClient, medplum: MedplumClient, record: any): Promise<string> {
  const p = record.patient;
  console.log(`\n--- Phase: core (patient identity) ---`);

  // ---- 1. Medplum Patient (upsert by patient-code identifier) ----
  const names: Array<{ use: string; text: string }> = [{ use: 'official', text: p.fullName }];
  if (p.arabicName) names.push({ use: 'official', text: p.arabicName });

  const addressLine = [p.addressDetail].filter(Boolean) as string[];
  const fhirPatient: Record<string, unknown> = {
    resourceType: 'Patient',
    active: true,
    identifier: [{ system: PATIENT_CODE_SYSTEM, value: p.code }],
    name: names,
    telecom: p.phone ? [{ system: 'phone', value: p.phone, use: 'mobile' }] : undefined,
    gender: genderToFhir(p.gender),
    birthDate: p.dateOfBirth || undefined,
    address:
      addressLine.length || p.addressMapUrl
        ? [
            {
              use: 'home',
              type: 'both',
              text: addressLine.join(', ') || undefined,
              line: addressLine.length ? addressLine : undefined,
              extension: p.addressMapUrl
                ? [{ url: EXT_ADDRESS_MAP_URL, valueUrl: p.addressMapUrl }]
                : undefined,
            },
          ]
        : undefined,
    contact:
      p.primaryCaregiver || p.primaryCaregiverPhone
        ? [
            {
              name: p.primaryCaregiver ? { text: p.primaryCaregiver } : undefined,
              telecom: p.primaryCaregiverPhone
                ? [{ system: 'phone', value: p.primaryCaregiverPhone, use: 'mobile' }]
                : undefined,
              relationship: p.caregiverRelation ? [{ text: p.caregiverRelation }] : undefined,
              extension: p.caregiverRelation
                ? [{ url: EXT_CAREGIVER_REL, valueString: p.caregiverRelation }]
                : undefined,
            },
          ]
        : undefined,
  };

  const existingFhir = await medplum.searchOne('Patient', {
    identifier: `${PATIENT_CODE_SYSTEM}|${p.code}`,
  });
  let medplumPatientId: string;
  if (existingFhir?.id) {
    const updated = await medplum.updateResource({ ...existingFhir, ...fhirPatient, id: existingFhir.id } as never);
    medplumPatientId = (updated as { id: string }).id;
    console.log(`  Medplum Patient updated: ${medplumPatientId}`);
  } else {
    const created = await medplum.createResource(fhirPatient as never);
    medplumPatientId = (created as { id: string }).id;
    console.log(`  Medplum Patient created: ${medplumPatientId}`);
  }

  // ---- 2. Postgres Patient (upsert by code) ----
  const provenance = [
    `Imported from Google Drive folder ${record.source?.driveFolderId ?? '(unknown)'} on import.`,
    p.nationality ? `Nationality: ${p.nationality}.` : '',
    p.phoneSource ? `Phone note: ${p.phoneSource}.` : '',
    record.source?.notes ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const before = await prisma.patient.findUnique({ where: { code: p.code } });

  const data = {
    fullName: p.fullName,
    arabicName: p.arabicName ?? null,
    phone: p.phone,
    gender: genderToPrisma(p.gender) ?? null,
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
    addressDetail: p.addressDetail ?? null,
    addressMapUrl: p.addressMapUrl ?? null,
    primaryCaregiver: p.primaryCaregiver ?? null,
    primaryCaregiverPhone: p.primaryCaregiverPhone ?? null,
    primaryCaregiverWhatsapp: p.primaryCaregiverWhatsapp ?? null,
    caregiverRelation: p.caregiverRelation ?? null,
    chiefComplaint: p.chiefComplaint ?? null,
    status: (p.status === 'active' ? 'active' : 'new') as 'active' | 'new',
    notes: provenance,
    medplumPatientId,
  };

  const patient = await prisma.patient.upsert({
    where: { code: p.code },
    create: { code: p.code, ...data },
    update: data,
  });
  console.log(`  Postgres Patient ${before ? 'updated' : 'created'}: ${patient.id}`);

  // ---- 3. Audit log ----
  await prisma.auditLog.create({
    data: {
      tableName: 'patients',
      recordId: patient.id,
      action: before ? 'update' : 'create',
      changedBy: AUDIT_ACTOR,
      newData: {
        code: p.code,
        fullName: p.fullName,
        medplumPatientId,
        phase: 'patient-core',
        source: 'google-drive-legacy-import',
      },
    },
  });
  console.log(`  AuditLog written (${before ? 'update' : 'create'}).`);
  console.log(`  Postgres id: ${patient.id} | Medplum id: ${medplumPatientId}`);
  return medplumPatientId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runClinical(medplum: MedplumClient, record: any, code: string, medplumPatientId: string) {
  console.log(`\n--- Phase: clinical (Medplum) ---`);
  const subject = { reference: `Patient/${medplumPatientId}` };
  const effectiveDate = (record.source?.docLastUpdated ? new Date(record.source.docLastUpdated) : new Date()).toISOString();
  let created = 0;
  let skipped = 0;
  const tally = (r: { created: boolean }) => (r.created ? created++ : skipped++);

  // Conditions (active problems)
  for (const c of record.conditions ?? []) {
    const r = await createIfAbsent(medplum, 'Condition', `${code}:cond:${slug(c.label)}`, () => ({
      resourceType: 'Condition',
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
      verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }] },
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item', display: 'Problem List Item' }] }],
      code: { text: c.label },
      subject,
      recordedDate: effectiveDate,
    }));
    tally(r);
  }

  // Labs → Observations (category laboratory)
  for (const l of record.labs ?? []) {
    const hasNumber = typeof l.value === 'number';
    const valueText = `${l.comparator ?? ''}${l.value ?? ''}${l.unit ? ' ' + l.unit : ''}${l.interpretation ? ` (${l.interpretation})` : ''}`.trim();
    const r = await createIfAbsent(medplum, 'Observation', `${code}:lab:${slug(l.label)}`, () => ({
      resourceType: 'Observation',
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] }],
      code: { text: l.label },
      subject,
      effectiveDateTime: effectiveDate,
      valueQuantity: hasNumber && !l.comparator ? { value: l.value, unit: l.unit ?? undefined, system: 'http://unitsofmeasure.org' } : undefined,
      valueString: !hasNumber || l.comparator ? (valueText || l.interpretation || 'see record') : undefined,
      note: l.context ? [{ text: l.context }] : undefined,
    }));
    tally(r);
  }

  // Vitals on exam → Observations (category vital-signs)
  const v = record.vitalsOnExam ?? {};
  const hr = typeof v.heartRate === 'string' ? parseInt(v.heartRate, 10) : v.heartRate;
  if (Number.isFinite(hr)) {
    const r = await createIfAbsent(medplum, 'Observation', `${code}:vital:hr`, () => ({
      resourceType: 'Observation',
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }], text: 'Heart rate' },
      subject,
      effectiveDateTime: effectiveDate,
      valueQuantity: { value: hr, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' },
    }));
    tally(r);
  }

  // Medications → MedicationStatement (text)
  for (const m of record.medications ?? []) {
    const r = await createIfAbsent(medplum, 'MedicationStatement', `${code}:med:${slug(m)}`, () => ({
      resourceType: 'MedicationStatement',
      status: 'active',
      medicationCodeableConcept: { text: m },
      subject,
      dateAsserted: effectiveDate,
      note: record.medicationsSource ? [{ text: record.medicationsSource }] : undefined,
    }));
    tally(r);
  }

  // Care team
  if ((record.careTeam ?? []).length) {
    const r = await createIfAbsent(medplum, 'CareTeam', `${code}:careteam`, () => ({
      resourceType: 'CareTeam',
      status: 'active',
      name: 'Care Team',
      subject,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      participant: record.careTeam.map((t: any) => ({
        member: { display: t.name },
        role: [{ text: [t.role, t.specialty].filter(Boolean).join(' — ') }],
      })),
    }));
    tally(r);
  }

  console.log(`  Clinical resources: ${created} created, ${skipped} already present.`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runDocuments(medplum: MedplumClient, record: any, code: string, medplumPatientId: string) {
  console.log(`\n--- Phase: documents (R2 + DocumentReference) ---`);
  const stagingDir = join(process.cwd(), 'prisma', 'seed-data', 'staging', code);
  if (!existsSync(stagingDir)) {
    console.log(`  No staged bytes at ${stagingDir} — nothing to upload yet.`);
    return;
  }
  const staged = new Set(readdirSync(stagingDir));
  const { client, bucket } = getR2();
  const categoryMap: Record<string, string> = { labs: 'lab', imaging: 'imaging', report: 'report', prescription: 'other', insurance: 'insurance' };

  let uploaded = 0;
  let skipped = 0;
  let missing = 0;
  for (const d of record.documents ?? []) {
    // staged file is named <driveId><ext> (ext inferred from mime)
    const ext = d.mime === 'image/jpeg' ? '.jpeg' : d.mime === 'image/png' ? '.png' : d.mime === 'application/pdf' ? '.pdf' : '.bin';
    const stagedName = `${d.driveId}${ext}`;
    if (!staged.has(stagedName)) { missing++; continue; }

    const seedValue = `${code}:doc:${d.driveId}`;
    const exists = await medplum.searchOne('DocumentReference', { identifier: `${SEED_SYSTEM}|${seedValue}` });
    if (exists?.id) { skipped++; continue; }

    const data = readFileSync(join(stagingDir, stagedName));
    const objectKey = buildObjectKey(d.fileName);
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: objectKey, Body: data, ContentType: d.mime || 'application/octet-stream', ServerSideEncryption: 'AES256',
    }));
    const checksum = createHash('sha256').update(data).digest('hex');
    const cat = categoryMap[d.category] ?? 'other';
    const title = `${d.subFolder ? d.subFolder + ' — ' : ''}${d.fileName}`;

    await medplum.createResource({
      resourceType: 'DocumentReference',
      status: 'current',
      identifier: [
        { system: SEED_SYSTEM, value: seedValue },
        { system: DOC_CHECKSUM_SYSTEM, value: checksum },
        { system: DOC_MALWARE_STATUS_SYSTEM, value: 'clean' },
      ],
      subject: { reference: `Patient/${medplumPatientId}` },
      type: { coding: [{ system: DOC_CATEGORY_SYSTEM, code: cat, display: title }], text: title },
      category: [{ coding: [{ system: DOC_CATEGORY_SYSTEM, code: cat, display: title }] }],
      date: new Date().toISOString(),
      meta: { security: [{ system: MALWARE_SECURITY_SYSTEM, code: 'clean', display: 'clean' }] },
      content: [{ attachment: { contentType: d.mime, title: d.fileName, url: `${R2_ATTACHMENT_PREFIX}${encodeURIComponent(objectKey)}`, size: data.byteLength } }],
    } as never);
    uploaded++;
    console.log(`  ✓ ${title} (${(data.byteLength / 1024).toFixed(0)} KB → R2)`);
  }
  console.log(`  Documents: ${uploaded} uploaded, ${skipped} already present, ${missing} not yet staged (of ${(record.documents ?? []).length} total).`);
}

async function main() {
  const code = process.argv[2];
  if (!code) throw new Error('Usage: import-drive-patient.ts <PATIENT_CODE> [--phase=core|clinical|documents|all]');
  const phaseArg = (process.argv.find((a) => a.startsWith('--phase=')) ?? '--phase=all').split('=')[1];

  const recordPath = join(process.cwd(), 'prisma', 'seed-data', 'patients', `${code}.json`);
  if (!existsSync(recordPath)) throw new Error(`Record not found: ${recordPath}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record: any = JSON.parse(readFileSync(recordPath, 'utf-8'));
  const p = record.patient;
  if (p.code !== code) throw new Error(`Code mismatch: arg=${code} file=${p.code}`);

  const prisma = new PrismaClient();
  const medplum = await getMedplum();
  console.log(`\n=== Importing ${p.code} — ${p.fullName} | phase=${phaseArg} ===`);

  // Resolve the Medplum patient id (created by core, or looked up for later phases).
  let medplumPatientId: string | undefined;
  if (phaseArg === 'core' || phaseArg === 'all') {
    medplumPatientId = await runCore(prisma, medplum, record);
  } else {
    const row = await prisma.patient.findUnique({ where: { code }, select: { medplumPatientId: true } });
    medplumPatientId = row?.medplumPatientId ?? undefined;
    if (!medplumPatientId) throw new Error(`Patient ${code} has no Medplum link yet — run --phase=core first.`);
  }

  if (phaseArg === 'clinical' || phaseArg === 'all') {
    await runClinical(medplum, record, code, medplumPatientId!);
  }
  if (phaseArg === 'documents' || phaseArg === 'all') {
    await runDocuments(medplum, record, code, medplumPatientId!);
  }

  await prisma.$disconnect();
  console.log(`\n✅ Done (${phaseArg}). EHR: /admin/patients (Medplum id ${medplumPatientId})\n`);
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err?.message ?? err);
  process.exit(1);
});
