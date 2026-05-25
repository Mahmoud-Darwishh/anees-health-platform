import { PrismaClient } from '@prisma/client';
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
      await prisma.doctor.upsert({
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

    await prisma.staffPatientAssignment.upsert({
      where: {
        staffId_patientId: {
          staffId: demoOperator.id,
          patientId: demoPatient1.id,
        },
      },
      update: {
        isActive: true,
        assignedAt: new Date(),
        assignedBy: demoStaff.id,
      },
      create: {
        staffId: demoOperator.id,
        patientId: demoPatient1.id,
        isActive: true,
        assignedBy: demoStaff.id,
      },
    });

    for (const member of [demoDoctor, demoPhysio, demoNurse]) {
      await prisma.staffPatientAssignment.upsert({
        where: {
          staffId_patientId: {
            staffId: member.id,
            patientId: demoPatient1.id,
          },
        },
        update: {
          isActive: true,
          assignedAt: new Date(),
          assignedBy: demoStaff.id,
        },
        create: {
          staffId: member.id,
          patientId: demoPatient1.id,
          isActive: true,
          assignedBy: demoStaff.id,
        },
      });
    }

    await prisma.staffPatientAssignment.upsert({
      where: {
        staffId_patientId: {
          staffId: demoOperator.id,
          patientId: demoPatient2.id,
        },
      },
      update: {
        isActive: false,
        assignedBy: demoStaff.id,
      },
      create: {
        staffId: demoOperator.id,
        patientId: demoPatient2.id,
        isActive: false,
        assignedBy: demoStaff.id,
      },
    });

    const existingAllergy = await prisma.allergy.findFirst({
      where: { patientId: demoPatient1.id, allergen: 'Penicillin', deletedAt: null },
    });
    if (!existingAllergy) {
      await prisma.allergy.create({
        data: {
          patientId: demoPatient1.id,
          allergen: 'Penicillin',
          reaction: 'Skin rash and itching',
          severity: 'moderate',
          notes: 'Avoid beta-lactam antibiotics when possible',
          enteredByStaffId: demoStaff.id,
        },
      });
    }

    const existingMedication = await prisma.medication.findFirst({
      where: { patientId: demoPatient1.id, medicationName: 'Amlodipine', deletedAt: null },
    });
    if (!existingMedication) {
      await prisma.medication.create({
        data: {
          patientId: demoPatient1.id,
          medicationName: 'Amlodipine',
          dose: '5 mg',
          frequency: 'Once daily',
          route: 'oral',
          startDate: new Date('2026-03-01'),
          notes: 'Monitor blood pressure weekly',
          enteredByStaffId: demoStaff.id,
        },
      });
    }

    const existingProgressNote = await prisma.progressNote.findFirst({
      where: { patientId: demoPatient1.id, noteBody: { contains: 'Blood pressure stable' }, deletedAt: null },
    });
    if (!existingProgressNote) {
      await prisma.progressNote.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit2.id,
          noteBody:
            'Blood pressure stable on current regimen. Continue same medication and repeat vitals in 2 weeks.',
          enteredByStaffId: demoStaff.id,
          signedOffByStaffId: demoStaff.id,
          signedOffAt: new Date('2026-05-12T10:00:00.000Z'),
        },
      });
    }

    const existingDocument = await prisma.document.findFirst({
      where: { patientId: demoPatient1.id, title: 'CBC Lab Result - Apr 2026', deletedAt: null },
    });
    if (!existingDocument) {
      await prisma.document.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit1.id,
          title: 'CBC Lab Result - Apr 2026',
          category: 'lab_result',
          storagePath: '/assets/demo/sample-lab-result.txt',
          mimeType: 'text/plain',
          fileSizeBytes: 1450,
          uploadedByStaffId: demoStaff.id,
        },
      });
    }

    const existingDiagnosis = await prisma.diagnosis.findFirst({
      where: { patientId: demoPatient1.id, diagnosisName: 'Essential Hypertension', deletedAt: null },
    });
    if (!existingDiagnosis) {
      await prisma.diagnosis.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit2.id,
          diagnosisName: 'Essential Hypertension',
          icd10Code: 'I10',
          diagnosedOn: new Date('2026-05-12'),
          status: 'active',
          notes: 'Controlled with amlodipine and periodic monitoring.',
          enteredByStaffId: demoDoctor.id,
        },
      });
    }

    const existingVitals = await prisma.vitalSigns.findFirst({
      where: { patientId: demoPatient1.id, measuredAt: new Date('2026-05-12T09:10:00.000Z'), deletedAt: null },
    });
    if (!existingVitals) {
      await prisma.vitalSigns.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit2.id,
          measuredAt: new Date('2026-05-12T09:10:00.000Z'),
          systolicBp: 132,
          diastolicBp: 84,
          heartRate: 78,
          oxygenSaturation: 97,
          temperatureC: 36.8,
          weightKg: 78.4,
          notes: 'Pre-round vitals stable.',
          enteredByStaffId: demoNurse.id,
        },
      });
    }

    const existingPhysioReport = await prisma.physioSessionReport.findFirst({
      where: { patientId: demoPatient1.id, sessionNumber: 3, deletedAt: null },
    });
    if (!existingPhysioReport) {
      await prisma.physioSessionReport.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit2.id,
          sessionDate: new Date('2026-05-13'),
          sessionNumber: 3,
          treatmentPlan: 'Lower-limb strengthening and gait stabilization',
          interventions: 'Active-assisted ROM, resisted knee extension, gait training with support.',
          response: 'Improved standing tolerance and step symmetry.',
          painScoreBefore: 6,
          painScoreAfter: 4,
          mobilityNote: 'Ambulates 20 meters with minimal support.',
          homeExercisePlan: 'Twice daily sit-to-stand x10 and ankle pumps x20.',
          nextSessionDate: new Date('2026-05-16'),
          enteredByStaffId: demoPhysio.id,
        },
      });
    }

    const existingNurseReport = await prisma.nurseDailyReport.findFirst({
      where: { patientId: demoPatient1.id, reportDate: new Date('2026-05-13'), deletedAt: null },
    });
    if (!existingNurseReport) {
      await prisma.nurseDailyReport.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit2.id,
          reportDate: new Date('2026-05-13'),
          shiftType: 'day',
          generalCondition: 'Stable and cooperative',
          intakeOutput: 'Oral intake good, urine output normal.',
          medicationGiven: 'Amlodipine 5mg given at 9:00 AM.',
          woundCare: 'N/A',
          fallsRisk: 'medium',
          escalationFlag: false,
          nursingNotes: 'No acute distress. Continue routine monitoring.',
          followUpInstructions: 'Recheck BP in evening shift.',
          enteredByStaffId: demoNurse.id,
        },
      });
    }

    const existingCareMessage = await prisma.careTeamMessage.findFirst({
      where: { patientId: demoPatient1.id, messageBody: { contains: 'family counseling' } },
    });
    if (!existingCareMessage) {
      await prisma.careTeamMessage.create({
        data: {
          patientId: demoPatient1.id,
          authorStaffId: demoDoctor.id,
          channelType: 'in_app',
          visibilityScope: 'care_team',
          messageBody: 'Please align next follow-up with family counseling on medication adherence.',
          requiresFollowUp: true,
          followUpDueAt: new Date('2026-05-16T11:00:00.000Z'),
          relatedVisitId: demoVisit2.id,
        },
      });
    }

    const existingRoutingTicket = await prisma.careCallRoutingTicket.findFirst({
      where: { patientId: demoPatient1.id, reasonCategory: 'post-visit follow-up' },
    });
    if (!existingRoutingTicket) {
      await prisma.careCallRoutingTicket.create({
        data: {
          patientId: demoPatient1.id,
          sourceChannel: 'phone',
          reasonCategory: 'post-visit follow-up',
          triagePriority: 'routine',
          status: 'open',
          assignedStaffId: demoOperator.id,
          summary: 'Family requested clarification on home exercise schedule.',
          targetCallbackAt: new Date('2026-05-14T15:30:00.000Z'),
        },
      });
    }

    const existingAiTriage = await prisma.aiTriageCase.findFirst({
      where: { patientId: demoPatient1.id, symptomSummary: { contains: 'intermittent dizziness' } },
    });
    if (!existingAiTriage) {
      await prisma.aiTriageCase.create({
        data: {
          patientId: demoPatient1.id,
          submittedByStaffId: demoDoctor.id,
          symptomSummary: 'Patient reports intermittent dizziness with morning standing.',
          riskScore: 42.5,
          urgencyLevel: 'medium',
          recommendedDisposition: 'same-day doctor call review',
          recommendedSpecialty: 'internal-medicine',
          reasoning: 'No red flag neuro deficits reported, but orthostatic check advised.',
          modelVersion: 'triage-v0-scaffold',
          status: 'draft',
        },
      });
    }

    // ── Extended realistic demo data ─────────────────────────────────────────
    // Additional medications
    const extraMedications = [
      {
        medicationName: 'Metformin',
        dose: '500 mg',
        frequency: 'Twice daily',
        route: 'oral',
        startDate: new Date('2026-02-15'),
        notes: 'Take with meals to reduce GI upset.',
      },
      {
        medicationName: 'Atorvastatin',
        dose: '20 mg',
        frequency: 'Once at bedtime',
        route: 'oral',
        startDate: new Date('2026-03-20'),
        notes: 'Monitor LFTs every 6 months.',
      },
    ];
    for (const med of extraMedications) {
      const exists = await prisma.medication.findFirst({
        where: { patientId: demoPatient1.id, medicationName: med.medicationName, deletedAt: null },
      });
      if (!exists) {
        await prisma.medication.create({
          data: { ...med, patientId: demoPatient1.id, enteredByStaffId: demoDoctor.id },
        });
      }
    }

    // Additional allergies
    const extraAllergies = [
      { allergen: 'Sulfa drugs', reaction: 'Hives and pruritus', severity: 'mild', notes: 'Avoid sulfonamide antibiotics.' },
      { allergen: 'Peanuts',     reaction: 'Throat tightness',  severity: 'high',  notes: 'Carry adrenaline auto-injector when travelling.' },
    ];
    for (const al of extraAllergies) {
      const exists = await prisma.allergy.findFirst({
        where: { patientId: demoPatient1.id, allergen: al.allergen, deletedAt: null },
      });
      if (!exists) {
        await prisma.allergy.create({
          data: { ...al, patientId: demoPatient1.id, enteredByStaffId: demoDoctor.id },
        });
      }
    }

    // Additional diagnoses
    const extraDiagnoses = [
      { diagnosisName: 'Type 2 Diabetes Mellitus', icd10Code: 'E11.9', diagnosedOn: new Date('2026-02-15'), status: 'active', notes: 'HbA1c 7.2% on diagnosis. Lifestyle counselling provided.' },
      { diagnosisName: 'Dyslipidaemia',            icd10Code: 'E78.5', diagnosedOn: new Date('2026-03-20'), status: 'active', notes: 'LDL 168 mg/dL — started on statin.' },
    ];
    for (const dx of extraDiagnoses) {
      const exists = await prisma.diagnosis.findFirst({
        where: { patientId: demoPatient1.id, diagnosisName: dx.diagnosisName, deletedAt: null },
      });
      if (!exists) {
        await prisma.diagnosis.create({
          data: { ...dx, patientId: demoPatient1.id, visitId: demoVisit2.id, enteredByStaffId: demoDoctor.id },
        });
      }
    }

    // Additional vital signs (3 historical readings)
    const extraVitals = [
      { measuredAt: new Date('2026-04-15T09:05:00.000Z'), systolicBp: 138, diastolicBp: 86, heartRate: 80, oxygenSaturation: 96, temperatureC: 36.6, weightKg: 78.8 },
      { measuredAt: new Date('2026-03-18T08:55:00.000Z'), systolicBp: 142, diastolicBp: 88, heartRate: 82, oxygenSaturation: 96, temperatureC: 36.9, weightKg: 79.2 },
      { measuredAt: new Date('2026-05-20T18:30:00.000Z'), systolicBp: 128, diastolicBp: 82, heartRate: 76, oxygenSaturation: 98, temperatureC: 36.7, weightKg: 78.1 },
    ];
    for (const v of extraVitals) {
      const exists = await prisma.vitalSigns.findFirst({
        where: { patientId: demoPatient1.id, measuredAt: v.measuredAt, deletedAt: null },
      });
      if (!exists) {
        await prisma.vitalSigns.create({
          data: { ...v, patientId: demoPatient1.id, visitId: demoVisit2.id, enteredByStaffId: demoNurse.id },
        });
      }
    }

    // Additional progress notes
    const extraProgressNote = await prisma.progressNote.findFirst({
      where: { patientId: demoPatient1.id, noteBody: { contains: 'Family education completed' }, deletedAt: null },
    });
    if (!extraProgressNote) {
      await prisma.progressNote.create({
        data: {
          patientId: demoPatient1.id,
          visitId: demoVisit2.id,
          noteBody:
            'Family education completed on home BP monitoring technique. Demonstrated proper cuff placement. Patient and caregiver verbalised understanding.',
          enteredByStaffId: demoNurse.id,
        },
      });
    }

    // Additional documents (lab, scan, insurance, discharge)
    const extraDocuments = [
      {
        title: 'MRI Brain — Apr 2026',
        category: 'imaging_report',
        storagePath: '/assets/demo/sample-mri-report.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 1620,
        visitId: demoVisit2.id,
      },
      {
        title: 'AXA Insurance Membership Card',
        category: 'insurance_document',
        storagePath: '/assets/demo/sample-insurance-card.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 720,
        visitId: null,
      },
      {
        title: 'Discharge Summary — Visit VIS-DEMO-002',
        category: 'discharge_summary',
        storagePath: '/assets/demo/sample-discharge-summary.txt',
        mimeType: 'text/plain',
        fileSizeBytes: 1280,
        visitId: demoVisit2.id,
      },
    ];
    for (const doc of extraDocuments) {
      const exists = await prisma.document.findFirst({
        where: { patientId: demoPatient1.id, title: doc.title, deletedAt: null },
      });
      if (!exists) {
        await prisma.document.create({
          data: { ...doc, patientId: demoPatient1.id, uploadedByStaffId: demoStaff.id },
        });
      }
    }

    // Lab orders
    const labOrders = [
      { testName: 'HbA1c',                  clinicalReason: 'Diabetes monitoring',     priority: 'routine' as const, status: 'active' as const,    orderedAt: new Date('2026-05-12T09:30:00.000Z'), targetDate: new Date('2026-05-19') },
      { testName: 'Fasting Lipid Panel',    clinicalReason: 'Statin therapy review',   priority: 'routine' as const, status: 'completed' as const, orderedAt: new Date('2026-04-02T08:30:00.000Z'), targetDate: new Date('2026-04-04'), resultSummary: 'LDL 124, HDL 48, TG 142 — improved from baseline.' },
    ];
    for (const lo of labOrders) {
      const exists = await prisma.labOrder.findFirst({
        where: { patientId: demoPatient1.id, testName: lo.testName, orderedAt: lo.orderedAt },
      });
      if (!exists) {
        await prisma.labOrder.create({
          data: { ...lo, patientId: demoPatient1.id, visitId: demoVisit2.id, orderedByStaffId: demoDoctor.id },
        });
      }
    }

    // Imaging orders
    const imagingOrders = [
      { studyName: 'MRI Brain (non-contrast)', modality: 'MRI',        bodyPart: 'Brain', clinicalReason: 'Rule out cerebrovascular cause for dizziness', priority: 'high' as const,    status: 'completed' as const, orderedAt: new Date('2026-04-10T10:00:00.000Z'), targetDate: new Date('2026-04-18'), resultSummary: 'Mild small-vessel ischaemic changes; no acute pathology.' },
      { studyName: 'Echocardiogram',           modality: 'Ultrasound', bodyPart: 'Heart', clinicalReason: 'Hypertension follow-up',                       priority: 'routine' as const, status: 'active' as const,    orderedAt: new Date('2026-05-15T11:00:00.000Z'), targetDate: new Date('2026-06-05') },
    ];
    for (const im of imagingOrders) {
      const exists = await prisma.imagingOrder.findFirst({
        where: { patientId: demoPatient1.id, studyName: im.studyName, orderedAt: im.orderedAt },
      });
      if (!exists) {
        await prisma.imagingOrder.create({
          data: { ...im, patientId: demoPatient1.id, visitId: demoVisit2.id, orderedByStaffId: demoDoctor.id },
        });
      }
    }

    // Care tasks
    const careTasks = [
      { title: 'Home BP log review',         taskType: 'nurse_check' as const,         priority: 'routine' as const, status: 'open' as const,         dueAt: new Date('2026-05-30T10:00:00.000Z'), description: 'Caregiver to upload 14-day BP log for clinician review.' },
      { title: 'Physiotherapy session #4',   taskType: 'physio_exercise' as const,     priority: 'routine' as const, status: 'open' as const,         dueAt: new Date('2026-05-27T14:00:00.000Z'), description: 'Continue lower-limb strengthening protocol.' },
      { title: 'Refill Metformin',           taskType: 'medication_reminder' as const, priority: 'high' as const,    status: 'in_progress' as const,  dueAt: new Date('2026-05-26T09:00:00.000Z'), description: 'Pharmacy to dispatch 30-day supply.' },
    ];
    for (const task of careTasks) {
      const exists = await prisma.careTask.findFirst({
        where: { patientId: demoPatient1.id, title: task.title, deletedAt: null },
      });
      if (!exists) {
        await prisma.careTask.create({
          data: {
            ...task,
            patientId: demoPatient1.id,
            visitId: demoVisit1.id,
            assignedToStaffId: demoNurse.id,
            createdByStaffId: demoDoctor.id,
          },
        });
      }
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

    // ─────────────────────────────────────────────────────────────────────
    // Real-world case — Raqia Ragab Mohamed (AN-3211-0725)
    //
    // STRICT MODE: every field below is taken verbatim from the case file
    // supplied by the clinical team. Fabricated dates, ICD codes, biometric
    // data, addresses, and social-history narratives have been removed.
    // Where a clinical event is mentioned without a specific date (e.g.
    // immediate-post-op X-ray on the surgical day), the most narrowly
    // defensible date is used; otherwise the row is omitted.
    // ─────────────────────────────────────────────────────────────────────
    const raqiaArabicAddress =
      'مدينة نصر، الحى الثامن، شارع محمود البدرى متفرع من محمد مقلد، عمارة 15 برج المستشار، الدور العاشر، شقة 19';
    const raqiaMapUrl = 'https://maps.app.goo.gl/mVFXPQiq5REzErQr8';
    const raqiaCaregiverPhone = '+201142444144';

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
        fullName: 'Raqia Ragab Mohamed',
        arabicName: 'رقية رجب محمد',
        phone: raqiaCaregiverPhone,
        gender: 'F',
        addressDetail: raqiaArabicAddress,
        addressMapUrl: raqiaMapUrl,
        primaryCaregiver: 'Eng. Mohamed Abdallah',
        primaryCaregiverPhone: raqiaCaregiverPhone,
        primaryCaregiverWhatsapp: raqiaCaregiverPhone,
        caregiverRelation: 'Son',
        emergencyContactName: 'Eng. Mohamed Abdallah',
        emergencyContactPhone: raqiaCaregiverPhone,
        emergencyContactRelation: 'Son',
        chiefComplaint:
          'Post-ORIF rehabilitation — right trans-trochanteric femoral fracture (RTA).',
        status: 'active',
        notes:
          'Non-weight-bearing right leg for one month post-PFN fixation. Caregiver-driven portal access.',
      },
      create: {
        code: 'AN-3211-0725',
        fullName: 'Raqia Ragab Mohamed',
        arabicName: 'رقية رجب محمد',
        phone: raqiaCaregiverPhone,
        gender: 'F',
        addressDetail: raqiaArabicAddress,
        addressMapUrl: raqiaMapUrl,
        registrationDate: new Date('2025-06-20'),
        primaryCaregiver: 'Eng. Mohamed Abdallah',
        primaryCaregiverPhone: raqiaCaregiverPhone,
        primaryCaregiverWhatsapp: raqiaCaregiverPhone,
        caregiverRelation: 'Son',
        emergencyContactName: 'Eng. Mohamed Abdallah',
        emergencyContactPhone: raqiaCaregiverPhone,
        emergencyContactRelation: 'Son',
        chiefComplaint:
          'Post-ORIF rehabilitation — right trans-trochanteric femoral fracture (RTA).',
        status: 'active',
        notes:
          'Non-weight-bearing right leg for one month post-PFN fixation. Caregiver-driven portal access.',
      },
    });

    const raqia = await prisma.patient.findUnique({ where: { code: 'AN-3211-0725' } });
    if (!raqia) throw new Error('Failed to seed Raqia demo patient.');

    // Caregiver-driven portal login
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

    // Caregiver row (separate from User; the structured relationship record)
    const existingCaregiver = await prisma.patientCaregiver.findFirst({
      where: { patientId: raqia.id, phoneNumber: raqiaCaregiverPhone, deletedAt: null },
    });
    if (!existingCaregiver) {
      await prisma.patientCaregiver.create({
        data: {
          patientId: raqia.id,
          fullName: 'Eng. Mohamed Abdallah',
          relationship: 'Son',
          phoneNumber: raqiaCaregiverPhone,
          whatsappNumber: raqiaCaregiverPhone,
          isPrimary: true,
          isAuthorized: true,
          notes: 'Primary caregiver and decision-maker. Coordinates all home care logistics.',
          enteredByStaffId: demoStaff.id,
        },
      });
    }

    // ── Visits — grouped by clinical role ───────────────────────────────
    // Doctor visits: ADM / OR / DCH go to demoProvider (RL-01 Doctor).
    // Physio visits: PT1 / PT2 go to physioProvider (RL-02 Physiotherapist).
    // No nursing visits in source record.
    const raqiaVisits: Array<{
      code: string; scheduled: string; status: 'completed' | 'scheduled' | 'in_progress';
      visitType: 'in_home' | 'telemedicine'; providerId: string; notes: string;
    }> = [
      { code: 'VIS-RAQ-ADM', scheduled: '2025-06-20', status: 'completed', visitType: 'in_home',
        providerId: demoProvider.id,
        notes: 'Hospital admission for RTA — displaced trans-trochanteric right femoral fracture.' },
      { code: 'VIS-RAQ-OR',  scheduled: '2025-06-21', status: 'completed', visitType: 'in_home',
        providerId: demoProvider.id,
        notes: 'ORIF with proximal femoral nail (PFN).' },
      { code: 'VIS-RAQ-DCH', scheduled: '2025-06-26', status: 'completed', visitType: 'in_home',
        providerId: demoProvider.id,
        notes: 'Discharge after 6-day stay. NWB right leg ordered for one month. Physio referral issued.' },
      { code: 'VIS-RAQ-PT1', scheduled: '2025-07-16', status: 'completed', visitType: 'in_home',
        providerId: physioProvider.id,
        notes: 'Block 1 home physiotherapy (12-session protocol). First session: patient bedridden, fully dependent — release of gastrocnemius and hamstrings; gentle distal release of VMO and IT band; initial activation exercises (VMO, quad set, hamstring set, heel slide). Later sessions in this block (10–12) progressed by increasing resistance and repetition.' },
      { code: 'VIS-RAQ-PT2', scheduled: '2025-08-17', status: 'completed', visitType: 'in_home',
        providerId: physioProvider.id,
        notes: 'Block 2 home physiotherapy (additional 12-session protocol) following follow-up X-ray showing incomplete healing.' },
    ];
    const raqiaVisitMap = new Map<string, string>();
    for (const v of raqiaVisits) {
      const visit = await prisma.visit.upsert({
        where: { code: v.code },
        update: {
          patientId: raqia.id, providerId: v.providerId,
          serviceId: v.providerId === physioProvider.id ? physioServiceLookup.id : demoService.id,
          areaId: demoArea.id, scheduledDate: new Date(v.scheduled), bookedDate: new Date(v.scheduled),
          status: v.status, visitType: v.visitType,
          servicePriceEgp: 0, discountEgp: 0, netPriceEgp: 0, providerPayoutEgp: 0,
          notes: v.notes,
        },
        create: {
          code: v.code, patientId: raqia.id, providerId: v.providerId,
          serviceId: v.providerId === physioProvider.id ? physioServiceLookup.id : demoService.id,
          areaId: demoArea.id, scheduledDate: new Date(v.scheduled), bookedDate: new Date(v.scheduled),
          status: v.status, visitType: v.visitType,
          servicePriceEgp: 0, discountEgp: 0, netPriceEgp: 0, providerPayoutEgp: 0,
          notes: v.notes,
        },
      });
      raqiaVisitMap.set(v.code, visit.id);
    }
    const admissionVisitId = raqiaVisitMap.get('VIS-RAQ-ADM')!;
    const dischargeVisitId = raqiaVisitMap.get('VIS-RAQ-DCH')!;
    const physio1VisitId = raqiaVisitMap.get('VIS-RAQ-PT1')!;
    const physio2VisitId = raqiaVisitMap.get('VIS-RAQ-PT2')!;

    // Strict-mode cleanup — remove rows seeded by earlier (lax) versions.
    await prisma.visit.deleteMany({ where: { code: 'VIS-RAQ-FUP' } });
    await prisma.physioSessionReport.deleteMany({
      where: {
        patientId: raqia.id,
        sessionNumber: { in: [1, 10, 11, 12, 16, 18, 20, 21, 22, 23, 24] },
      },
    });
    await prisma.imagingOrder.deleteMany({
      where: {
        patientId: raqia.id,
        studyName: { in: ['X-ray Right Hip — Post-Surgery', 'X-ray Right Hip — 6-week follow-up'] },
      },
    });
    await prisma.diagnosis.deleteMany({
      where: { patientId: raqia.id, diagnosisName: 'Generalised osteopenia' },
    });
    await prisma.patientSocialHistory.deleteMany({
      where: { patientId: raqia.id },
    });
    await prisma.document.deleteMany({
      where: {
        patientId: raqia.id,
        storagePath: { startsWith: '/assets/' },
      },
    });

    // ── Medical history (chronic + past surgical) ────────────────────────
    // Strict: no onset dates — source report did not give them.
    const raqiaMedicalHistory: Array<{ conditionName: string; status: string; notes: string }> = [
      { conditionName: 'Diabetes mellitus (Type 2)', status: 'active',
        notes: 'Long-standing T2DM. Controlled.' },
      { conditionName: 'Essential hypertension', status: 'active',
        notes: 'Stable on antihypertensive regimen.' },
      { conditionName: 'Total knee replacement — contralateral (left) side', status: 'resolved',
        notes: 'Status post left TKR — well-functioning prosthesis.' },
      { conditionName: 'Grade 3 left knee osteoarthritis', status: 'chronic',
        notes: 'Severe medial compartment osteoarthritis. Symptomatic management.' },
      { conditionName: 'Lumbar spinal surgery (history)', status: 'resolved',
        notes: 'Prior lumbar decompression — no current radicular symptoms.' },
      { conditionName: 'Radiofrequency nerve root decompression (history)', status: 'resolved',
        notes: 'Successful symptom relief at time of procedure.' },
    ];
    for (const mh of raqiaMedicalHistory) {
      const exists = await prisma.medicalHistory.findFirst({
        where: { patientId: raqia.id, conditionName: mh.conditionName, deletedAt: null },
      });
      if (!exists) {
        await prisma.medicalHistory.create({
          data: { ...mh, patientId: raqia.id, enteredByStaffId: demoDoctor.id },
        });
      }
    }

    // ── Diagnoses ────────────────────────────────────────────────────────
    // Strict: no ICD-10 codes — none supplied in source report.
    const raqiaDiagnoses = [
      { diagnosisName: 'Displaced trans-trochanteric fracture, right femur',
        diagnosedOn: new Date('2025-06-20'), visitId: admissionVisitId, status: 'resolved',
        notes: 'Post-ORIF with PFN. Healing in progress on serial imaging.' },
      { diagnosisName: 'Aftercare following ORIF, right femur',
        diagnosedOn: new Date('2025-06-26'), visitId: dischargeVisitId, status: 'active',
        notes: 'Non-weight-bearing for one month. Active rehabilitation.' },
      { diagnosisName: 'Diffuse osteopenia',
        diagnosedOn: new Date('2025-06-20'), visitId: admissionVisitId, status: 'active',
        notes: 'Diffuse osteopenia noted on imaging — bone density review advised.' },
    ];
    for (const dx of raqiaDiagnoses) {
      const exists = await prisma.diagnosis.findFirst({
        where: { patientId: raqia.id, diagnosisName: dx.diagnosisName, deletedAt: null },
      });
      if (!exists) {
        await prisma.diagnosis.create({
          data: { ...dx, patientId: raqia.id, enteredByStaffId: demoDoctor.id },
        });
      }
    }

    // ── Imaging orders (trauma-day workup only — strict) ─────────────────
    // The post-op X-ray and 6-week follow-up X-ray are mentioned in the
    // source narrative but no specific date is given, so they are NOT seeded
    // as ImagingOrder rows. Their findings are captured in the discharge
    // summary document and in the Block-1 / Block-2 physio visit notes.
    const raqiaImaging = [
      { studyName: 'X-ray Pelvis', modality: 'X-ray', bodyPart: 'Pelvis / Right hip',
        clinicalReason: 'Initial trauma assessment after RTA',
        priority: 'urgent' as const, status: 'completed' as const,
        orderedAt: new Date('2025-06-20T00:00:00.000Z'), targetDate: new Date('2025-06-20'),
        resultSummary: 'Displaced trans-trochanteric fracture, right femur. No lytic/sclerotic lesions.' },
      { studyName: 'CT Hip Joints', modality: 'CT', bodyPart: 'Both hips',
        clinicalReason: 'Pre-operative planning for displaced fracture',
        priority: 'urgent' as const, status: 'completed' as const,
        orderedAt: new Date('2025-06-20T00:00:00.000Z'), targetDate: new Date('2025-06-20'),
        resultSummary: 'Displaced trans-trochanteric fracture with displaced lesser trochanter. Peri-articular soft tissue edema. Mild hip joint effusion. Diffuse osteopenia.' },
      { studyName: 'FAST (Focused Abdominal Sonography)', modality: 'Ultrasound', bodyPart: 'Abdomen',
        clinicalReason: 'Rule out abdominal trauma post-RTA',
        priority: 'urgent' as const, status: 'completed' as const,
        orderedAt: new Date('2025-06-20T00:00:00.000Z'), targetDate: new Date('2025-06-20'),
        resultSummary: 'No free intraperitoneal fluid, organ tears, or hematomas.' },
    ];
    for (const im of raqiaImaging) {
      const exists = await prisma.imagingOrder.findFirst({
        where: { patientId: raqia.id, studyName: im.studyName, orderedAt: im.orderedAt },
      });
      if (!exists) {
        await prisma.imagingOrder.create({
          data: { ...im, patientId: raqia.id, visitId: admissionVisitId, orderedByStaffId: demoDoctor.id },
        });
      }
    }

    // ── Document — discharge summary stored privately ────────────────────
    // The file lives OUTSIDE `public/` at $EHR_STORAGE_ROOT and is served only
    // through the authenticated streaming endpoint `/api/portal/documents/[id]/file`.
    const raqiaReportTitle = 'Comprehensive Medical Report — Raqia Ragab Mohamed';
    const existingReport = await prisma.document.findFirst({
      where: { patientId: raqia.id, title: raqiaReportTitle, deletedAt: null },
    });
    if (!existingReport) {
      const reportContent = [
        'COMPREHENSIVE MEDICAL REPORT',
        '============================',
        '',
        'Patient: Raqia Ragab Mohamed (AN-3211-0725)',
        'Gender: Female  |  Age: 73 years',
        'Caregiver: Eng. Mohamed Abdallah (son) — +201142444144',
        '',
        'CHIEF COMPLAINT',
        '---------------',
        'Post-ORIF rehabilitation following a road-traffic accident causing a',
        'displaced right trans-trochanteric femoral fracture.',
        '',
        'ADMISSION & SURGERY',
        '-------------------',
        '20-Jun-2025  Admission for RTA; trauma workup performed.',
        '21-Jun-2025  ORIF with proximal femoral nail (PFN). Uneventful procedure.',
        '26-Jun-2025  Discharge after a 6-day stay. Strict non-weight-bearing of the',
        '             right lower limb ordered for one month. Home-care physiotherapy',
        '             referral issued.',
        '',
        'TRAUMA-DAY IMAGING (20-Jun-2025)',
        '--------------------------------',
        '* X-ray Pelvis / Right Hip: Displaced trans-trochanteric fracture, right',
        '  femur. No lytic or sclerotic lesions.',
        '* CT Hip Joints (both): Displaced trans-trochanteric fracture with displaced',
        '  lesser trochanter. Peri-articular soft tissue edema. Mild hip joint effusion.',
        '  Diffuse osteopenia.',
        '* FAST abdominal ultrasound: No free intraperitoneal fluid, organ tears, or',
        '  hematomas.',
        '',
        'POST-OPERATIVE IMAGING',
        '----------------------',
        'Immediate post-op X-ray of the right hip (date not recorded in source):',
        '  Internal fixation in good position. No loosening or displacement.',
        '  Persistent osteopenia. No signs of infection.',
        '',
        'Six-week follow-up X-ray (date not recorded in source — performed between',
        'Block 1 session 12 and Block 2 session 1):',
        '  Incomplete bone healing. Surgeon recommended an additional 12',
        '  physiotherapy sessions.',
        '',
        'PAST MEDICAL HISTORY',
        '--------------------',
        '* Type 2 diabetes mellitus (long-standing, controlled).',
        '* Essential hypertension (stable on antihypertensive regimen).',
        '* Left total knee replacement — contralateral side (resolved; well-functioning',
        '  prosthesis).',
        '* Grade 3 left knee osteoarthritis (chronic; symptomatic management).',
        '* Lumbar spinal decompression surgery (resolved; no current radicular symptoms).',
        '* Radiofrequency nerve-root decompression (resolved; successful at the time).',
        '',
        'BASELINE FUNCTIONAL STATUS',
        '--------------------------',
        'Mobility: bedridden. Functional independence: full assistance required.',
        '',
        'PHYSIOTHERAPY — BLOCK 1 (12 sessions; in-home)',
        '----------------------------------------------',
        'Approach: Release of gastrocnemius and hamstrings; gentle distal release of',
        'VMO and IT band; progressive activation of VMO, quad set, hamstring set, heel',
        'slide; addition of hip abductor work, core activation, short-arc quads,',
        'bridging, kinesio tape for patellar medialization, iliopsoas release, assisted',
        'SLR, and rectus femoris activation. Final three sessions of the block (10–12)',
        'progressed by increasing resistance and repetition.',
        '',
        'Dated sessions in source record: 16-Jul, 20-Jul, 22-Jul, 24-Jul, 27-Jul,',
        '29-Jul, 31-Jul, 03-Aug (2025).',
        '',
        'Outcome of Block 1: Patient progressed from fully bedridden to independent',
        'sitting on the edge of the bed and active hip flexion control. Pain reduced',
        'from 7/10 pre-treatment to 2/10 post-treatment by end of block.',
        '',
        'PHYSIOTHERAPY — BLOCK 2 (additional 12 sessions; in-home)',
        '----------------------------------------------------------',
        'Triggered by the follow-up X-ray showing incomplete healing. Continued the',
        'Block 1 protocol with added VMO drills, clamshell exercise, iliotibial band',
        'release, pelvic rocking, and sacrum release. Progressive loading and',
        'functional gait training with a walker were added in the later sessions.',
        '',
        'Dated sessions in source record: 17-Aug, 19-Aug, 21-Aug, 26-Aug, 31-Aug',
        '(2025).',
        '',
        'RISK FLAGS',
        '----------',
        '* High fall risk — strict NWB for one month; caregiver supervision required',
        '  for all transfers.',
        '',
        'PRIVACY',
        '-------',
        'This document contains protected health information (PHI). It is stored on',
        'private server storage and is served only through the authenticated',
        'patient/caregiver portal. Do not redistribute.',
        '',
      ].join('\n');

      const crypto = await import('node:crypto');
      const fs = await import('node:fs/promises');
      const pathMod = await import('node:path');

      const storageRoot = process.env.EHR_STORAGE_ROOT
        ? pathMod.resolve(process.env.EHR_STORAGE_ROOT)
        : pathMod.resolve(process.cwd(), 'private-storage', 'ehr');

      const yyyy = '2025';
      const mm = '06';
      const fileKey = `${raqia.id}/${yyyy}/${mm}/${crypto.randomUUID()}-medical-report.txt`;
      const absolute = pathMod.join(storageRoot, fileKey);
      await fs.mkdir(pathMod.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, reportContent, { mode: 0o640 });
      const buffer = Buffer.from(reportContent, 'utf8');
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      await prisma.document.create({
        data: {
          patientId: raqia.id,
          visitId: dischargeVisitId,
          title: raqiaReportTitle,
          category: 'discharge_summary',
          storagePath: fileKey,
          mimeType: 'text/plain; charset=utf-8',
          fileSizeBytes: buffer.byteLength,
          checksum,
          uploadedByStaffId: demoStaff.id,
        },
      });
    }

    // ── Risk flag — fall risk ────────────────────────────────────────────
    const existingFallFlag = await prisma.patientRiskFlag.findFirst({
      where: { patientId: raqia.id, code: 'fall_risk', isActive: true },
    });
    if (!existingFallFlag) {
      await prisma.patientRiskFlag.create({
        data: {
          patientId: raqia.id,
          code: 'fall_risk',
          label: 'High fall risk — non-weight-bearing post-ORIF',
          severity: 'high',
          source: 'Orthopaedic discharge note',
          notes: 'Strict NWB right leg for 1 month. Caregiver supervision required for all transfers.',
          flaggedByStaffId: demoDoctor.id,
        },
      });
    }

    // ── Social history — mobility & support (strict — verbatim only) ────
    const existingSocial = await prisma.patientSocialHistory.findFirst({
      where: { patientId: raqia.id, deletedAt: null },
    });
    if (!existingSocial) {
      await prisma.patientSocialHistory.create({
        data: {
          patientId: raqia.id,
          mobility: 'bedridden',
          functionalIndependence: 'full_assistance',
          enteredByStaffId: demoNurse.id,
        },
      });
    }

    // ── Physiotherapy sessions — only sessions with explicit dates ───────
    // Block 1: source-dated sessions are #2–#9. Session #1 and #10–#12 are
    // documented in the source narrative but without dates — their clinical
    // content is captured in VIS-RAQ-PT1.notes above instead of being seeded
    // with an arbitrary sessionDate.
    // Block 2: source-dated sessions are #1, #2, #3, #5, #7 (numbered
    // 13–19 with gaps inside the full 24-session course).
    const raqiaPhysioSessions: Array<{
      sessionNumber: number; sessionDate: string; visitId: string;
      interventions: string; response?: string;
      painScoreBefore?: number; painScoreAfter?: number;
      mobilityNote?: string; homeExercisePlan?: string;
    }> = [
      // Block 1 — dated
      { sessionNumber: 2, sessionDate: '2025-07-16', visitId: physio1VisitId,
        interventions: 'Same protocol as session 1 + hip abductor exercises and rectus abdominis activation (core).',
        response: 'Mild improvement in quadriceps activation.',
        painScoreBefore: 6, painScoreAfter: 4,
        mobilityNote: 'Still bedridden but starting to assist with rolling.' },
      { sessionNumber: 3, sessionDate: '2025-07-20', visitId: physio1VisitId,
        interventions: 'Mobilization to increase knee extension. Isometric resistance (gentle), short-arc quad exercise, bridging.',
        response: 'Significant: patient can now sit independently.',
        painScoreBefore: 5, painScoreAfter: 3,
        mobilityNote: 'Transitioned to independent short-sit on edge of bed.' },
      { sessionNumber: 4, sessionDate: '2025-07-22', visitId: physio1VisitId,
        interventions: 'Same + hip flexion via forward trunk motion.',
        response: 'Good engagement. Hip flexion arc increasing.',
        painScoreBefore: 5, painScoreAfter: 3 },
      { sessionNumber: 5, sessionDate: '2025-07-24', visitId: physio1VisitId,
        interventions: 'Hip external rotation. Static hip abductor. Isometric quad + hamstring (sitting). Kinesio tape — patellar medialization.',
        response: 'Tolerated tape well; reports reduced anterior knee discomfort.',
        painScoreBefore: 5, painScoreAfter: 3 },
      { sessionNumber: 6, sessionDate: '2025-07-27', visitId: physio1VisitId,
        interventions: 'Iliopsoas release. Bridging. Assisted SLR. Rectus femoris activation. Rolling on sound limb.',
        response: 'Tolerated SLR with assistance — early sign of active hip flexion control.',
        painScoreBefore: 4, painScoreAfter: 3 },
      { sessionNumber: 7, sessionDate: '2025-07-29', visitId: physio1VisitId,
        interventions: 'Same + assisted hip flexion on affected side from sitting.',
        response: 'Consistent improvement.', painScoreBefore: 4, painScoreAfter: 3 },
      { sessionNumber: 8, sessionDate: '2025-07-31', visitId: physio1VisitId,
        interventions: 'Consolidation of full protocol.', response: 'Stable.',
        painScoreBefore: 4, painScoreAfter: 2 },
      { sessionNumber: 9, sessionDate: '2025-08-03', visitId: physio1VisitId,
        interventions: 'Continued protocol.', response: 'Stable.',
        painScoreBefore: 4, painScoreAfter: 2 },
      // Block 2 — dated (numbered 13, 14, 15, 17, 19 within the 24-session course)
      { sessionNumber: 13, sessionDate: '2025-08-17', visitId: physio2VisitId,
        interventions: 'Same protocol + dedicated VMO drills + clamshell exercise.',
        response: 'Re-energized after rest week.', painScoreBefore: 4, painScoreAfter: 3 },
      { sessionNumber: 14, sessionDate: '2025-08-19', visitId: physio2VisitId,
        interventions: 'Progression — increased repetitions.', response: 'Tolerated.',
        painScoreBefore: 4, painScoreAfter: 2 },
      { sessionNumber: 15, sessionDate: '2025-08-21', visitId: physio2VisitId,
        interventions: 'Iliotibial band release added.', response: 'Improved lateral hip flexibility.',
        painScoreBefore: 3, painScoreAfter: 2 },
      { sessionNumber: 17, sessionDate: '2025-08-26', visitId: physio2VisitId,
        interventions: 'Pelvic rocking exercise added.', response: 'Patient enjoys new motion pattern.',
        painScoreBefore: 3, painScoreAfter: 2 },
      { sessionNumber: 19, sessionDate: '2025-08-31', visitId: physio2VisitId,
        interventions: 'Sacrum release added.', response: 'Reduced low-back stiffness.',
        painScoreBefore: 3, painScoreAfter: 1 },
    ];

    for (const s of raqiaPhysioSessions) {
      const sessionDate = new Date(s.sessionDate);
      const exists = await prisma.physioSessionReport.findFirst({
        where: { patientId: raqia.id, sessionNumber: s.sessionNumber, deletedAt: null },
      });
      if (!exists) {
        await prisma.physioSessionReport.create({
          data: {
            patientId: raqia.id,
            visitId: s.visitId,
            sessionDate,
            sessionNumber: s.sessionNumber,
            interventions: s.interventions,
            response: s.response ?? null,
            painScoreBefore: s.painScoreBefore ?? null,
            painScoreAfter: s.painScoreAfter ?? null,
            mobilityNote: s.mobilityNote ?? null,
            homeExercisePlan: s.homeExercisePlan ?? null,
            enteredByStaffId: demoPhysio.id,
          },
        });
      }
    }

    console.log('Demo patient seed ready:');
    console.log('  - Identifier (phone): +201055500001');
    console.log('  - Identifier (case id): PT-DEMO-001');
    console.log('  - Password: Portal@123');
    console.log('Real-world case (Raqia Ragab) seed ready:');
    console.log('  - Identifier (phone): +201142444144 (caregiver login)');
    console.log('  - Identifier (case id): AN-3211-0725');
    console.log('  - Password: Portal@123');
    console.log('Demo staff seed ready:');
    console.log('  - Email: admin@aneeshealth.local');
    console.log('  - Password: Admin@123');
    console.log('  - Email: operator@aneeshealth.local');
    console.log('  - Password: Operator@123');
    console.log('  - Email: doctor@aneeshealth.local');
    console.log('  - Password: Doctor@123');
    console.log('  - Email: physio@aneeshealth.local');
    console.log('  - Password: Physio@123');
    console.log('  - Email: nurse@aneeshealth.local');
    console.log('  - Password: Nurse@123');
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
