import { getDoctors } from '@/lib/api/doctors';
import type { Doctor } from '@/lib/models/doctor.types';
import { generateDoctorSlug, generateSeoSlug } from '@/lib/utils/slug';

export type SupportedLocale = 'en' | 'ar';

export interface DoctorSearchCard extends Doctor {
  slug: string;
}

export interface SpecialtyLanding {
  slug: string;
  name: string;
  description: string;
  doctorCount: number;
}

export interface ServiceLandingContent {
  slug: string;
  title: string;
  description: string;
  headline: string;
  keywords: string;
}

const SERVICE_COPY: Record<SupportedLocale, Record<string, ServiceLandingContent>> = {
  en: {
    'doctor-at-home': {
      slug: 'doctor-at-home',
      title: 'Doctor at Home | Anees Home Visits',
      headline: 'Book a doctor at home in Egypt',
      description:
        'Find licensed home-visit doctors on Anees for doctor-at-home care across Egypt. Browse specialties, compare profiles, and request a doctor home visit quickly.',
      keywords:
        'Anees doctor at home, home visit doctor Egypt, doctor home visit Cairo, doctor at home Giza, physician home visit Egypt',
    },
    'physiotherapy-at-home': {
      slug: 'physiotherapy-at-home',
      title: 'Physiotherapy at Home | Anees Rehabilitation',
      headline: 'Home physiotherapy and rehabilitation with Anees',
      description:
        'Browse Anees physiotherapy specialists for home rehabilitation, mobility recovery, post-operative physiotherapy, and chronic pain support in Egypt.',
      keywords:
        'Anees physiotherapy at home, home physiotherapy Egypt, physical therapy at home Cairo, rehabilitation at home, physiotherapist home visit',
    },
    'elderly-care-at-home': {
      slug: 'elderly-care-at-home',
      title: 'Elderly Care at Home | Anees Geriatric Care',
      headline: 'Geriatric and elderly care at home in Egypt',
      description:
        'Discover Anees doctors and care specialists for elderly care at home, geriatric medicine, chronic disease follow-up, and home support for seniors.',
      keywords:
        'Anees elderly care at home, geriatric doctor home visit, senior home care Egypt, elderly doctor at home Cairo, geriatrics Anees',
    },
    'home-nursing': {
      slug: 'home-nursing',
      title: 'Home Nursing in Egypt | Anees Skilled Nurses',
      headline: 'Skilled home nursing in Egypt',
      description:
        'Book licensed home nurses on Anees for wound care, injections, IV therapy, catheter and tube care, vitals monitoring, and post-operative and chronic-care support across Greater Cairo.',
      keywords:
        'Anees home nursing, home nursing Cairo, home nurse Egypt, skilled nursing at home, wound care at home',
    },
    'lab-tests-at-home': {
      slug: 'lab-tests-at-home',
      title: 'Lab Tests at Home in Egypt | Anees Home Sample Collection',
      headline: 'Lab tests at home in Egypt',
      description:
        'Arrange home blood tests and sample collection with Anees across Greater Cairo. A phlebotomist visits the patient at home, samples are processed by accredited laboratories, and results are returned digitally.',
      keywords:
        'Anees lab tests at home, blood test at home Egypt, home sample collection Cairo, home phlebotomy, lab at home',
    },
    'post-operative-care': {
      slug: 'post-operative-care',
      title: 'Post-Operative Care at Home in Egypt | Anees',
      headline: 'Post-operative care at home in Egypt',
      description:
        'Recover at home after surgery with Anees: wound and drain care, pain and medication management, nursing visits, and physiotherapy, coordinated by one care coordinator across Greater Cairo.',
      keywords:
        'Anees post operative care, post-surgery home care Egypt, wound care at home, recovery at home after surgery, home nursing post-op',
    },
    'palliative-chronic-care': {
      slug: 'palliative-chronic-care',
      title: 'Palliative & Chronic-Disease Care at Home in Egypt | Anees',
      headline: 'Palliative and chronic-disease care at home',
      description:
        'Ongoing home care for chronic and palliative patients with Anees — diabetes, hypertension, cardiac and respiratory management, symptom control, nursing, and doctor follow-up across Greater Cairo.',
      keywords:
        'Anees palliative care, chronic disease home care Egypt, home care diabetes, symptom management at home, chronic care Cairo',
    },
  },
  ar: {
    'doctor-at-home': {
      slug: 'doctor-at-home',
      title: 'طبيب في البيت | أنيس للزيارات المنزلية',
      headline: 'احجز طبيب في البيت في مصر',
      description:
        'ابحث عن أطباء زيارات منزلية مرخصين على أنيس لطلب طبيب في البيت في مختلف مناطق مصر. تصفح التخصصات وقارن الملفات الشخصية واطلب الزيارة بسرعة.',
      keywords:
        'أنيس طبيب في البيت، طبيب منزلي مصر، زيارة طبيب منزلية القاهرة، دكتور في البيت الجيزة، طبيب زيارة منزلية',
    },
    'physiotherapy-at-home': {
      slug: 'physiotherapy-at-home',
      title: 'علاج طبيعي منزلي | أنيس للتأهيل',
      headline: 'العلاج الطبيعي المنزلي والتأهيل مع أنيس',
      description:
        'تصفح متخصصي العلاج الطبيعي على أنيس لجلسات التأهيل المنزلي واستعادة الحركة والعلاج بعد العمليات ودعم الألم المزمن في مصر.',
      keywords:
        'أنيس علاج طبيعي منزلي، علاج طبيعي في البيت، جلسات علاج طبيعي منزلية القاهرة، تأهيل منزلي، أخصائي علاج طبيعي منزلي',
    },
    'elderly-care-at-home': {
      slug: 'elderly-care-at-home',
      title: 'رعاية مسنين منزلية | أنيس لطب الشيخوخة',
      headline: 'رعاية المسنين وطب الشيخوخة في المنزل بمصر',
      description:
        'اكتشف أطباء ومتخصصي أنيس لرعاية المسنين في المنزل وطب الشيخوخة ومتابعة الأمراض المزمنة والدعم المنزلي لكبار السن.',
      keywords:
        'أنيس رعاية مسنين منزلية، طبيب شيخوخة منزلي، رعاية كبار السن مصر، دكتور مسنين في البيت، طب الشيخوخة أنيس',
    },
    'home-nursing': {
      slug: 'home-nursing',
      title: 'تمريض منزلي في مصر | ممرضون متخصصون من أنيس',
      headline: 'تمريض منزلي متخصص في مصر',
      description:
        'احجز ممرضين منزليين مرخصين عبر أنيس للعناية بالجروح والحقن والمحاليل الوريدية والقساطر وأنابيب التغذية ومتابعة العلامات الحيوية ورعاية ما بعد العمليات والأمراض المزمنة في القاهرة الكبرى.',
      keywords:
        'أنيس تمريض منزلي، تمريض منزلي القاهرة، ممرضة منزلية مصر، عناية بالجروح في المنزل، تركيب محاليل منزلي',
    },
    'lab-tests-at-home': {
      slug: 'lab-tests-at-home',
      title: 'تحاليل في المنزل بمصر | سحب عينات منزلي من أنيس',
      headline: 'تحاليل وسحب عينات في المنزل بمصر',
      description:
        'رتّب تحاليل الدم وسحب العينات في المنزل مع أنيس في القاهرة الكبرى. يزور فني سحب العينات المريض في منزله، وتُحلَّل العينات في معامل معتمدة وتُرسل النتائج رقمياً.',
      keywords:
        'أنيس تحاليل منزلية، تحاليل دم في المنزل، سحب عينات منزلي القاهرة، تحاليل في البيت، فحوصات منزلية',
    },
    'post-operative-care': {
      slug: 'post-operative-care',
      title: 'الرعاية بعد العمليات في المنزل بمصر | أنيس',
      headline: 'الرعاية بعد العمليات في المنزل بمصر',
      description:
        'تعافَ في المنزل بعد العملية مع أنيس: العناية بالجروح والأنابيب، وإدارة الألم والأدوية، وزيارات التمريض، والعلاج الطبيعي، بتنسيق منسق واحد في القاهرة الكبرى.',
      keywords:
        'أنيس رعاية ما بعد العمليات، رعاية بعد الجراحة في المنزل، العناية بالجروح، تعافي منزلي بعد العملية، تمريض ما بعد الجراحة',
    },
    'palliative-chronic-care': {
      slug: 'palliative-chronic-care',
      title: 'الرعاية التلطيفية ورعاية الأمراض المزمنة في المنزل | أنيس',
      headline: 'الرعاية التلطيفية ورعاية الأمراض المزمنة في المنزل',
      description:
        'رعاية منزلية مستمرة للحالات المزمنة والتلطيفية مع أنيس — متابعة السكري والضغط والقلب والجهاز التنفسي، والتحكم في الأعراض، والتمريض، ومتابعة الطبيب في القاهرة الكبرى.',
      keywords:
        'أنيس رعاية تلطيفية، رعاية الأمراض المزمنة في المنزل، رعاية السكري منزلية، تحكم في الأعراض، رعاية مزمنة القاهرة',
    },
  },
};

/**
 * Front-loaded 40–80 word direct-answer block per service — the AEO /
 * featured-snippet + AI-citation lever (audit §15). Self-contained and quotable,
 * leading with "X is…". No prices are baked in (pricing is always confirmed in
 * the booking flow), so these never drift against the package data.
 */
const SERVICE_ANSWER: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'doctor-at-home':
      'A doctor home visit from Anees Health brings a licensed physician to the patient’s home anywhere in Greater Cairo. The doctor takes a history, examines the patient, diagnoses, prescribes, and can order home lab tests — with the price shown before you confirm and no surprise fees at the door. Routine visits are usually same-day, and you choose the time at booking.',
    'physiotherapy-at-home':
      'Home physiotherapy from Anees Health sends a licensed physiotherapist to the patient’s home across Greater Cairo for post-operative rehabilitation, stroke and neurological recovery, orthopedic recovery, and elderly balance and fall-prevention training. Sessions can be booked one at a time or as a structured rehabilitation program, with the price confirmed before booking.',
    'elderly-care-at-home':
      'Elderly care at home from Anees Health combines licensed nursing, doctor follow-ups, physiotherapy, and lab monitoring for an older parent — coordinated by one case coordinator who keeps the family updated. It covers medication management, mobility support, chronic-disease follow-up, and post-hospital recovery across Greater Cairo, available as single visits or an ongoing monthly package.',
    'home-nursing':
      'Home nursing from Anees Health provides licensed nurses at the patient’s home across Greater Cairo for wound and pressure-sore care, injections, IV therapy, catheter and feeding-tube care, vitals monitoring, and post-operative support. Care is available by the visit, by the shift, or as an ongoing monthly package, with the price confirmed before you book.',
    'lab-tests-at-home':
      'Lab tests at home from Anees Health let a trained phlebotomist collect blood and other samples at the patient’s home across Greater Cairo. Samples are processed by accredited laboratories and results returned digitally, with a doctor review available on request — ideal for elderly, bedridden, and post-operative patients. The price is shown before you confirm.',
    'post-operative-care':
      'Post-operative care at home from Anees Health helps patients recover safely after surgery across Greater Cairo — wound and drain care, pain and medication management, nursing visits, and physiotherapy, all coordinated by one care coordinator. It lowers the risk of hospital readmission and infection exposure, and the price is confirmed before booking.',
    'palliative-chronic-care':
      'Palliative and chronic-disease care at home from Anees Health gives ongoing support to patients with diabetes, hypertension, cardiac, respiratory, or advanced illness across Greater Cairo — symptom control, nursing, medication management, and regular doctor follow-up under one coordinator. Care adapts as the patient’s needs change, with the price confirmed before booking.',
  },
  ar: {
    'doctor-at-home':
      'زيارة الطبيب المنزلية من أنيس هيلث تنقل طبيباً مرخصاً إلى منزل المريض في أي مكان بالقاهرة الكبرى. يأخذ الطبيب التاريخ المرضي ويفحص المريض ويشخّص ويصف العلاج ويمكنه طلب تحاليل منزلية، مع ظهور السعر قبل التأكيد وبلا رسوم مفاجئة عند الباب. وتُجدول الزيارات الاعتيادية غالباً في نفس اليوم، وتختار أنت الموعد عند الحجز.',
    'physiotherapy-at-home':
      'العلاج الطبيعي المنزلي من أنيس هيلث يرسل أخصائي علاج طبيعي مرخصاً إلى منزل المريض في القاهرة الكبرى للتأهيل بعد العمليات، وتعافي الجلطات والحالات العصبية، والتعافي بعد إصابات العظام، وتدريب التوازن والوقاية من السقوط لكبار السن. ويمكن حجز الجلسات منفردة أو كبرنامج تأهيل منظم، مع تأكيد السعر قبل الحجز.',
    'elderly-care-at-home':
      'رعاية المسنين المنزلية من أنيس هيلث تجمع التمريض المرخّص ومتابعة الأطباء والعلاج الطبيعي ومراقبة التحاليل لكبار السن — بتنسيق منسق واحد يبقي الأسرة على اطلاع. تشمل إدارة الأدوية ودعم الحركة ومتابعة الأمراض المزمنة والتعافي بعد المستشفى في القاهرة الكبرى، وتتوفر كزيارات مفردة أو باقة شهرية مستمرة.',
    'home-nursing':
      'التمريض المنزلي من أنيس هيلث يوفر ممرضين مرخصين في منزل المريض بالقاهرة الكبرى للعناية بالجروح وقرح الفراش والحقن والمحاليل الوريدية والقساطر وأنابيب التغذية ومتابعة العلامات الحيوية ودعم ما بعد العمليات. وتتوفر الرعاية بالزيارة أو بالوردية أو بباقة شهرية مستمرة، مع تأكيد السعر قبل الحجز.',
    'lab-tests-at-home':
      'التحاليل المنزلية من أنيس هيلث تتيح لفني سحب عينات مدرَّب جمع عينات الدم وغيرها في منزل المريض بالقاهرة الكبرى. وتُحلَّل العينات في معامل معتمدة وتُرسل النتائج رقمياً، مع إمكانية مراجعة طبيب عند الطلب — وهي مثالية لكبار السن وطريحي الفراش ومرضى ما بعد العمليات. ويظهر السعر قبل التأكيد.',
    'post-operative-care':
      'الرعاية بعد العمليات في المنزل من أنيس هيلث تساعد المرضى على التعافي بأمان بعد الجراحة في القاهرة الكبرى — العناية بالجروح والأنابيب، وإدارة الألم والأدوية، وزيارات التمريض، والعلاج الطبيعي، بتنسيق منسق واحد. وتقلّل خطر إعادة الدخول للمستشفى والتعرض للعدوى، ويُؤكَّد السعر قبل الحجز.',
    'palliative-chronic-care':
      'الرعاية التلطيفية ورعاية الأمراض المزمنة في المنزل من أنيس هيلث توفر دعماً مستمراً لمرضى السكري والضغط والقلب والجهاز التنفسي والحالات المتقدمة في القاهرة الكبرى — التحكم في الأعراض، والتمريض، وإدارة الأدوية، ومتابعة طبية منتظمة بإشراف منسق واحد. وتتكيف الرعاية مع تغير احتياجات المريض، مع تأكيد السعر قبل الحجز.',
  },
};

export function getServiceAnswer(locale: SupportedLocale, slug: string): string | null {
  return SERVICE_ANSWER[locale][slug] ?? null;
}

function matchServiceDoctors(serviceSlug: string, doctor: Doctor, englishDoctor: Doctor): boolean {
  const haystack = [
    englishDoctor.speciality,
    englishDoctor.professionalTitle,
    englishDoctor.bio,
    ...englishDoctor.certifications,
  ]
    .join(' ')
    .toLowerCase();

  const hasHomeChannel = englishDoctor.channels.some((channel) => /home/i.test(channel));

  switch (serviceSlug) {
    case 'doctor-at-home':
      return hasHomeChannel;
    case 'physiotherapy-at-home':
      return hasHomeChannel && /(physio|physical therapy|rehabilitation)/i.test(haystack);
    case 'elderly-care-at-home':
      return hasHomeChannel && /(geriatric|elderly|aging|senior)/i.test(haystack);
    case 'home-nursing':
      return hasHomeChannel && /(nurs|geriatric|internal|general|family)/i.test(haystack);
    case 'lab-tests-at-home':
      return hasHomeChannel && /(internal|general|family|patholog|lab)/i.test(haystack);
    case 'post-operative-care':
      return hasHomeChannel && /(surg|orthop|general|internal)/i.test(haystack);
    case 'palliative-chronic-care':
      return hasHomeChannel && /(geriatric|internal|oncolog|palliat|chronic|cardio|pulmon|respir)/i.test(haystack);
    default:
      return false;
  }
}

export function getServiceLanding(locale: SupportedLocale, slug: string): ServiceLandingContent | null {
  return SERVICE_COPY[locale][slug] || null;
}

export function getAllServiceLandingSlugs(): string[] {
  return Object.keys(SERVICE_COPY.en);
}

async function getLocalizedDoctorCards(locale: SupportedLocale): Promise<Array<{ localizedDoctor: Doctor; englishDoctor: Doctor; slug: string }>> {
  const englishDoctors = await getDoctors('en');
  const localizedDoctors = locale === 'en' ? englishDoctors : await getDoctors(locale);
  const localizedById = new Map(localizedDoctors.map((doctor) => [doctor.id, doctor]));

  return englishDoctors
    .map((englishDoctor) => {
      const localizedDoctor = localizedById.get(englishDoctor.id) || englishDoctor;
      return {
        localizedDoctor,
        englishDoctor,
        slug: generateDoctorSlug(englishDoctor.doctorName),
      };
    })
    .filter((item) => Boolean(item.localizedDoctor));
}

export async function getServiceLandingDoctors(locale: SupportedLocale, slug: string): Promise<DoctorSearchCard[]> {
  const doctors = await getLocalizedDoctorCards(locale);

  return doctors
    .filter(({ localizedDoctor, englishDoctor }) => matchServiceDoctors(slug, localizedDoctor, englishDoctor))
    .map(({ localizedDoctor, slug: doctorSlug }) => ({
      ...localizedDoctor,
      slug: doctorSlug,
    }));
}

export async function getAllSpecialtyLandings(locale: SupportedLocale): Promise<SpecialtyLanding[]> {
  const englishDoctors = await getDoctors('en');
  const localizedDoctors = locale === 'en' ? englishDoctors : await getDoctors(locale);
  const localizedById = new Map(localizedDoctors.map((doctor) => [doctor.id, doctor]));

  const specialtyMap = new Map<string, SpecialtyLanding>();

  for (const englishDoctor of englishDoctors) {
    const localizedDoctor = localizedById.get(englishDoctor.id) || englishDoctor;
    const slug = generateSeoSlug(englishDoctor.speciality);
    const existing = specialtyMap.get(slug);

    if (existing) {
      existing.doctorCount += 1;
      continue;
    }

    specialtyMap.set(slug, {
      slug,
      name: localizedDoctor.speciality,
      description:
        locale === 'ar'
          ? `تصفح أطباء ${localizedDoctor.speciality} على أنيس للزيارات المنزلية والاستشارات الطبية.`
          : `Browse ${localizedDoctor.speciality} doctors on Anees for home visits and medical consultations.`,
      doctorCount: 1,
    });
  }

  return Array.from(specialtyMap.values()).sort((a, b) => b.doctorCount - a.doctorCount || a.name.localeCompare(b.name));
}

export async function getSpecialtyDoctors(locale: SupportedLocale, specialtySlug: string): Promise<{ specialtyName: string; doctors: DoctorSearchCard[] } | null> {
  const doctors = await getLocalizedDoctorCards(locale);
  const filtered = doctors.filter(({ englishDoctor }) => generateSeoSlug(englishDoctor.speciality) === specialtySlug);

  if (filtered.length === 0) {
    return null;
  }

  return {
    specialtyName: filtered[0].localizedDoctor.speciality,
    doctors: filtered.map(({ localizedDoctor, slug }) => ({
      ...localizedDoctor,
      slug,
    })),
  };
}
