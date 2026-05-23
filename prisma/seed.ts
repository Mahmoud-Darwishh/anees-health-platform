import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  await prisma.bookingPrice.createMany({
    skipDuplicates: true,
    data: [
      { key: 'telemedicine',                      label: 'Telemedicine Consultation',              priceEgp: 250  },
      { key: 'homeVisit:doctorVisit',              label: 'Home Doctor Visit',                      priceEgp: 1500 },
      { key: 'homeVisit:physiotherapy:single',     label: 'Physiotherapy — Single Session',         priceEgp: 900  },
      { key: 'homeVisit:physiotherapy:twelve',     label: 'Physiotherapy — 12-Session Package',     priceEgp: 9500 },
      { key: 'homeVisit:nursing:nurse',            label: 'Nursing Care (Registered Nurse) per hr', priceEgp: 150  },
      { key: 'homeVisit:nursing:nurseAssistant',   label: 'Nursing Care (Assistant) per hr',        priceEgp: 100  },
      { key: 'package:haraka',                     label: 'Haraka — Joint & Arthritis Care',        priceEgp: 5000 },
      { key: 'package:wai',                        label: 'Wai — Cognitive & Dementia Care',        priceEgp: 8000 },
      { key: 'package:amal',                       label: 'Amal — Stroke Recovery',                priceEgp: 6000 },
    ],
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
