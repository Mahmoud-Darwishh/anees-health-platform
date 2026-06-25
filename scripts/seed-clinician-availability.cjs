/**
 * Seed clinicians so they are assignable + available in the portal/dispatch.
 *
 * For EVERY active public Doctor profile it ensures a linked Staff account →
 * Provider → Medplum Practitioner → 24/7 PractitionerRole availability, and links
 * Staff.publicDoctorId back to the marketing profile. It also finishes any
 * existing clinical Staff (e.g. a nurse missing a Medplum practitioner) and gives
 * them the same 24/7 availability.
 *
 * Idempotent + additive: re-running skips existing links and upserts availability.
 * Writes to the SHARED PRODUCTION DB + Medplum. Preview first with --dry-run.
 *
 *   node scripts/seed-clinician-availability.cjs --dry-run
 *   node scripts/seed-clinician-availability.cjs
 */
const fs = require('fs');
const path = require('path');

// ── Minimal .env loader (.env.local wins, .env fills gaps). No $VAR expansion;
//    unescape the dotenv "\$" → "$" convention used for literal dollars. ───────
function loadEnv(file) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let [, key, val] = m;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\\\$/g, '$');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv('.env.local');
loadEnv('.env');

const { PrismaClient } = require('@prisma/client');
const { MedplumClient } = require('@medplum/core');
const bcrypt = require('bcryptjs');

const DRY_RUN = process.argv.includes('--dry-run');

const prisma = new PrismaClient();
const medplum = new MedplumClient({ baseUrl: process.env.MEDPLUM_BASE_URL, fetch: globalThis.fetch });

// ── FHIR constants (mirror src/lib/medplum/constants.ts + fhir-extensions.ts) ──
const STAFF_ID_SYSTEM = 'https://anees.health/fhir/identifier/staff-id';
const STAFF_ROLE_SYSTEM = 'https://anees.health/fhir/staff-role';
const EXT_AREAS = 'https://anees.health/fhir/StructureDefinition/clinician-service-areas';
const EXT_NOTE = 'https://anees.health/fhir/StructureDefinition/clinician-availability-note';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const AREAS = ['Cairo', 'Giza'];
const AVAILABILITY_NOTE = 'Seeded 24/7 availability — edit in your profile.';

const ROLE_TO_PROVIDER_ROLE = {
  doctor: { code: 'RL-01', name: 'Doctor' },
  physiotherapist: { code: 'RL-02', name: 'Physiotherapist' },
  nurse: { code: 'RL-03', name: 'Nurse' },
};

function randomPassword() {
  // Long random hash-source; the account is login-disabled until an admin issues
  // a set-password link. Satisfies "valid bcrypt hash exists".
  return `Seed-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}-Aa1`;
}

function emailForDoctor(doc) {
  return `dr.${doc.slug}@seed.anees.health`.toLowerCase();
}

// ── Postgres: ensure a Provider link for a clinical Staff member ───────────────
async function ensureProvider(staff) {
  if (staff.providerId) return staff.providerId;
  const mapping = ROLE_TO_PROVIDER_ROLE[staff.role];
  if (!mapping) return null;
  if (DRY_RUN) {
    console.log(`    [dry] would create Provider for ${staff.role} ${staff.name}`);
    return 'dry-provider';
  }
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.staff.findUnique({ where: { id: staff.id }, select: { providerId: true } });
    if (fresh?.providerId) return fresh.providerId;
    const role = await tx.providerRole.upsert({
      where: { code: mapping.code },
      create: { code: mapping.code, name: mapping.name },
      update: {},
      select: { id: true },
    });
    const code = `PRV_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const provider = await tx.provider.create({
      data: {
        code,
        fullName: staff.name,
        roleId: role.id,
        email: staff.email,
        joiningDate: new Date(),
        baseRateEgp: 0,
        tenantId: staff.tenantId,
      },
      select: { id: true },
    });
    await tx.staff.update({ where: { id: staff.id }, data: { providerId: provider.id } });
    await tx.auditLog.create({
      data: {
        tableName: 'providers',
        recordId: provider.id,
        action: 'create',
        changedFields: { source: 'script.seed_clinician_availability', staffId: staff.id, role: staff.role },
        changedBy: 'system:seed',
      },
    });
    return provider.id;
  });
}

// ── Medplum: ensure a Practitioner for a Staff member, store the id ────────────
async function ensurePractitioner(staff) {
  const resource = {
    resourceType: 'Practitioner',
    active: true,
    identifier: [{ system: STAFF_ID_SYSTEM, value: staff.id }],
    name: [{ use: 'official', text: staff.name }],
    telecom: staff.email ? [{ system: 'email', value: staff.email, use: 'work' }] : undefined,
    qualification: [
      {
        code: {
          coding: [{ system: STAFF_ROLE_SYSTEM, code: staff.role, display: staff.role.replace('_', ' ') }],
          text: staff.role.replace('_', ' '),
        },
      },
    ],
  };
  if (DRY_RUN) {
    console.log(`    [dry] would upsert Practitioner for ${staff.name}`);
    return staff.medplumPractitionerId || 'dry-practitioner';
  }
  const existing = await medplum.searchOne('Practitioner', { identifier: `${STAFF_ID_SYSTEM}|${staff.id}` });
  const saved =
    existing && existing.id
      ? await medplum.updateResource({ ...existing, ...resource, id: existing.id })
      : await medplum.createResource(resource);
  if (!saved.id) throw new Error(`Failed to resolve practitioner id for ${staff.name}`);
  if (staff.medplumPractitionerId !== saved.id) {
    await prisma.staff.update({ where: { id: staff.id }, data: { medplumPractitionerId: saved.id } });
  }
  return saved.id;
}

// ── Medplum: upsert a 24/7 PractitionerRole availability ───────────────────────
async function ensureAvailability(practitionerId) {
  if (DRY_RUN || practitionerId === 'dry-practitioner') {
    console.log('    [dry] would upsert 24/7 PractitionerRole availability');
    return;
  }
  const ref = `Practitioner/${practitionerId}`;
  const existing = await medplum.searchOne('PractitionerRole', { practitioner: ref });
  const resource = {
    ...(existing || {}),
    resourceType: 'PractitionerRole',
    active: true,
    practitioner: { reference: ref },
    availableTime: [{ daysOfWeek: DAYS, availableStartTime: '00:00:00', availableEndTime: '23:59:00' }],
    extension: [
      { url: EXT_AREAS, valueString: AREAS.join(', ') },
      { url: EXT_NOTE, valueString: AVAILABILITY_NOTE },
    ],
  };
  if (existing && existing.id) await medplum.updateResource({ ...resource, id: existing.id });
  else await medplum.createResource(resource);
}

// ── Postgres: ensure a Staff account exists for a public Doctor profile ────────
async function ensureStaffForDoctor(doc) {
  const linked = await prisma.staff.findFirst({ where: { publicDoctorId: doc.id } });
  if (linked) return { staff: linked, created: false };

  const email = emailForDoctor(doc);
  const byEmail = await prisma.staff.findUnique({ where: { email } });
  if (byEmail) {
    const staff =
      byEmail.publicDoctorId === doc.id
        ? byEmail
        : await prisma.staff.update({ where: { id: byEmail.id }, data: { publicDoctorId: doc.id } });
    return { staff, created: false };
  }

  if (DRY_RUN) {
    console.log(`  [dry] would create Staff for Doctor #${doc.id} ${doc.nameEn} (${email})`);
    return {
      staff: {
        id: `dry-${doc.id}`,
        name: doc.nameEn,
        email,
        role: 'doctor',
        status: 'active',
        providerId: null,
        medplumPractitionerId: null,
        tenantId: 'platform',
      },
      created: true,
    };
  }

  // NO license is fabricated. These accounts are assignable + available, but
  // CANNOT sign clinical content (canSignClinical fails) until an admin enters a
  // real, verified syndicate licence. Fabricating licences would wrongly confer
  // signing authority on a regulated platform.
  const staff = await prisma.staff.create({
    data: {
      name: doc.nameEn,
      email,
      passwordHash: bcrypt.hashSync(randomPassword(), 10),
      role: 'doctor',
      status: 'active',
      publicDoctorId: doc.id,
      tenantId: 'platform',
    },
  });
  await prisma.auditLog.create({
    data: {
      tableName: 'staff',
      recordId: staff.id,
      action: 'create',
      changedFields: { source: 'script.seed_clinician_availability', doctorId: doc.id, role: 'doctor' },
      changedBy: 'system:seed',
    },
  });
  return { staff, created: true };
}

async function main() {
  console.log(DRY_RUN ? '── DRY RUN (no writes) ──' : '── LIVE RUN (writing to prod + Medplum) ──');
  if (!DRY_RUN) await medplum.startClientLogin(process.env.MEDPLUM_CLIENT_ID, process.env.MEDPLUM_CLIENT_SECRET);

  // Part A — finish existing clinical staff + give them 24/7 availability.
  const existing = await prisma.staff.findMany({
    where: { role: { in: ['doctor', 'nurse', 'physiotherapist'] }, status: 'active', publicDoctorId: null },
  });
  console.log(`\nPart A — ${existing.length} existing clinical staff`);
  for (const s of existing) {
    console.log(`  ${s.role} ${s.name}`);
    await ensureProvider(s);
    const fresh = DRY_RUN ? s : await prisma.staff.findUnique({ where: { id: s.id } });
    const pracId = await ensurePractitioner(fresh);
    await ensureAvailability(pracId);
  }

  // Part B — a Staff account + availability for every active public Doctor.
  const doctors = await prisma.doctor.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
  console.log(`\nPart B — ${doctors.length} public doctor profiles`);
  let created = 0;
  for (const doc of doctors) {
    const { staff, created: wasCreated } = await ensureStaffForDoctor(doc);
    if (wasCreated) created += 1;
    console.log(`  Doctor #${doc.id} ${doc.nameEn}${wasCreated ? ' (new staff)' : ' (existing)'}`);
    await ensureProvider(staff);
    const fresh = DRY_RUN ? staff : await prisma.staff.findUnique({ where: { id: staff.id } });
    const pracId = await ensurePractitioner(fresh);
    await ensureAvailability(pracId);
  }

  console.log(`\nDone. Existing clinicians refreshed: ${existing.length}. Doctor staff created: ${created} (of ${doctors.length}).`);
  if (!DRY_RUN) console.log('All seeded clinicians are now assignable on /admin/ops and show as Available (24/7).');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
