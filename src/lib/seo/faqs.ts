/**
 * Centralised bilingual FAQ catalog.
 *
 * Each page that emits a FAQPage schema reads its entries from here so we
 * keep voice + positioning consistent, and Arabic copy lives in real
 * UTF-8 (not the mojibake we used to inline).
 *
 * Positioning: home-visit-first (nursing, physio, labs at home, doctor
 * home visits). Telemedicine is mentioned only where it actually exists
 * as a channel, never as the headline.
 */

import type { SupportedLocale } from './site';

export interface FaqItem {
  question: string;
  answer: string;
}

type FaqDict = Record<SupportedLocale, FaqItem[]>;

/* ─────────────────────────── Home page FAQs ─────────────────────────── */

export const homeFaqs: FaqDict = {
  en: [
    {
      question: 'What is Anees Health?',
      answer:
        'Anees Health is an Egyptian home healthcare platform. We send licensed doctors, nurses, and physiotherapists to the patient at home, and we coordinate home lab tests, imaging, and chronic-disease follow-up — so patients (especially seniors and post-operative patients) are cared for without leaving their bed.',
    },
    {
      question: 'Which areas does Anees Health cover?',
      answer:
        'Anees currently operates across Greater Cairo and the surrounding governorates. You can confirm coverage for any specific address on our Coverage page before booking.',
    },
    {
      question: 'How do I request a home visit?',
      answer:
        'Pick the service you need (doctor visit, nursing, physiotherapy, lab tests), choose a date and time, share the patient address, and complete the booking. Our coordinator confirms the visit within minutes and assigns the right clinician.',
    },
    {
      question: 'Are all clinicians licensed?',
      answer:
        'Yes. Every doctor, nurse, and physiotherapist on Anees is licensed by the Egyptian Medical Syndicate or the equivalent professional body, and goes through Anees credentialing before they ever visit a patient.',
    },
    {
      question: 'Is the price fixed before the visit?',
      answer:
        'Yes. The price of every home service is shown before you confirm the booking. There are no surprise fees at the door.',
    },
  ],
  ar: [
    {
      question: 'ما هي منصة أنيس هيلث؟',
      answer:
        'أنيس هيلث منصة رعاية صحية منزلية في مصر. نوفر زيارات أطباء وممرضين ومتخصصي علاج طبيعي مرخصين في منزل المريض، بجانب تنسيق التحاليل والأشعة المنزلية ومتابعة الأمراض المزمنة — حتى يتلقى كبار السن ومرضى ما بعد العمليات الرعاية دون مغادرة السرير.',
    },
    {
      question: 'ما هي المناطق التي تخدمها أنيس؟',
      answer:
        'تعمل أنيس حالياً في القاهرة الكبرى والمحافظات المحيطة. يمكنك التأكد من تغطية أي عنوان من صفحة المناطق المغطاة قبل الحجز.',
    },
    {
      question: 'كيف أطلب زيارة منزلية؟',
      answer:
        'اختر الخدمة المطلوبة (زيارة طبيب، تمريض، علاج طبيعي، تحاليل)، حدد التاريخ والوقت، أدخل عنوان المريض، ثم أكد الحجز. يقوم منسق أنيس بتأكيد الموعد خلال دقائق وتعيين الكادر الطبي المناسب.',
    },
    {
      question: 'هل جميع الكوادر الطبية مرخصة؟',
      answer:
        'نعم. كل طبيب وممرض ومتخصص علاج طبيعي على أنيس مرخص من نقابة الأطباء المصرية أو الجهة المهنية المقابلة، ويمر بعملية اعتماد داخلية في أنيس قبل أي زيارة.',
    },
    {
      question: 'هل السعر ثابت قبل الزيارة؟',
      answer:
        'نعم. يظهر سعر كل خدمة منزلية بشكل واضح قبل تأكيد الحجز، ولا توجد أي رسوم مفاجئة عند الزيارة.',
    },
  ],
};

/* ─────────────────────────── Services page FAQs ─────────────────────── */

export const servicesFaqs: FaqDict = {
  en: [
    {
      question: 'Which home healthcare services does Anees provide?',
      answer:
        'Doctor home visits, skilled home nursing, home physiotherapy, lab tests at home, home radiology and scans, post-operative care, palliative care, medication management, and remote monitoring for chronic diseases.',
    },
    {
      question: 'Do you offer one-off visits or ongoing care packages?',
      answer:
        'Both. You can request a single home visit or subscribe to ongoing care packages designed for elderly, post-operative, and chronic-disease patients.',
    },
    {
      question: 'Can a single coordinator manage all of a patient’s services?',
      answer:
        'Yes. Anees acts as the patient’s healthcare hub: one coordinator schedules the doctor, nurse, physiotherapy, labs, and medication delivery — and keeps the family informed.',
    },
    {
      question: 'How quickly can a home visit be scheduled?',
      answer:
        'Most routine home visits are scheduled the same day. Urgent visits can typically be dispatched within hours, subject to clinician availability in your area.',
    },
  ],
  ar: [
    {
      question: 'ما الخدمات الصحية المنزلية التي تقدمها أنيس؟',
      answer:
        'زيارات أطباء منزلية، تمريض منزلي متخصص، علاج طبيعي منزلي، تحاليل في المنزل، أشعة وفحوصات بالمنزل، رعاية ما بعد العمليات، رعاية ملطفة، إدارة الأدوية، ومتابعة الأمراض المزمنة عن بُعد.',
    },
    {
      question: 'هل تقدمون زيارات مفردة أم باقات رعاية مستمرة؟',
      answer:
        'كلاهما. يمكنك طلب زيارة منزلية واحدة أو الاشتراك في باقات رعاية مستمرة مصممة لكبار السن ومرضى ما بعد العمليات والأمراض المزمنة.',
    },
    {
      question: 'هل يمكن لمنسق واحد إدارة كل خدمات المريض؟',
      answer:
        'نعم. تعمل أنيس كمركز رعاية موحد للمريض: منسق واحد ينظم الطبيب والممرض والعلاج الطبيعي والتحاليل وتوصيل الأدوية ويُبقي الأسرة على اطلاع دائم.',
    },
    {
      question: 'في خلال كم تتم جدولة الزيارة المنزلية؟',
      answer:
        'معظم الزيارات الاعتيادية تُجدول في نفس اليوم. الزيارات العاجلة يمكن إرسالها خلال ساعات بحسب توفر الكادر الطبي في منطقتك.',
    },
  ],
};

/* ─────────────────────────── Booking flow FAQs ──────────────────────── */
/* surfaced on /services (booking page itself is noindex) */

export const bookingFaqs: FaqDict = {
  en: [
    {
      question: 'How do I pay for a home visit?',
      answer:
        'You can pay online while booking through our secure Kashier payment gateway, or pay via Instapay. Receipts are issued for every visit.',
    },
    {
      question: 'Can I cancel or reschedule a booking?',
      answer:
        'Yes. You can cancel or reschedule from your booking confirmation or by contacting the Anees coordinator. Cancellation terms are listed in our Terms and Conditions.',
    },
    {
      question: 'Is my medical information kept private?',
      answer:
        'Yes. Anees follows strict patient confidentiality. Clinical information is only shared with the clinicians directly involved in your care.',
    },
  ],
  ar: [
    {
      question: 'كيف أدفع تكلفة الزيارة المنزلية؟',
      answer:
        'يمكنك الدفع عبر الإنترنت أثناء الحجز من خلال بوابة كاشير الآمنة، أو الدفع عن طريق انستاباى المصرية. تُصدر إيصالات لكل زيارة.',
    },
    {
      question: 'هل يمكن إلغاء الحجز أو تعديل الموعد؟',
      answer:
        'نعم. يمكنك الإلغاء أو تعديل الموعد من صفحة تأكيد الحجز أو من خلال التواصل مع منسق أنيس. شروط الإلغاء موضحة في الشروط والأحكام.',
    },
    {
      question: 'هل تظل معلوماتي الطبية خاصة؟',
      answer:
        'نعم. تلتزم أنيس بسرية بيانات المريض الكاملة، ولا تُشارك المعلومات الطبية إلا مع الكادر المعالج للمريض.',
    },
  ],
};

/* ─────────────────────────── Coverage page FAQs ─────────────────────── */

export const coverageFaqs: FaqDict = {
  en: [
    {
      question: 'Which Egyptian areas does Anees cover for home visits?',
      answer:
        'Anees primarily covers Greater Cairo (Cairo, Giza, and surrounding areas). Coverage is continuously expanding — use the address checker on this page to verify your specific location.',
    },
    {
      question: 'What happens if my address is just outside the covered area?',
      answer:
        'Contact our coordinator. We can often arrange a visit in adjacent areas for a small travel surcharge, or place you on a waitlist as we expand.',
    },
  ],
  ar: [
    {
      question: 'ما المناطق المصرية التي تخدمها أنيس للزيارات المنزلية؟',
      answer:
        'تخدم أنيس بشكل أساسي القاهرة الكبرى (القاهرة والجيزة والمناطق المحيطة)، والتغطية في توسع مستمر. استخدم فحص العنوان في هذه الصفحة للتأكد من تغطية موقعك.',
    },
    {
      question: 'ماذا لو كان عنواني خارج منطقة التغطية بقليل؟',
      answer:
        'تواصل مع منسق أنيس — في الغالب يمكننا ترتيب زيارة في المناطق المجاورة مقابل رسم بسيط للانتقال، أو إضافتك إلى قائمة الانتظار مع توسع التغطية.',
    },
  ],
};

/* ─────────────────── Reusable doctor-profile FAQ generator ──────────── */

export function doctorFaqs(
  locale: SupportedLocale,
  doctor: { name: string; speciality: string }
): FaqItem[] {
  if (locale === 'ar') {
    return [
      {
        question: `هل يقدم ${doctor.name} زيارات منزلية عبر أنيس؟`,
        answer: `نعم. تعرض صفحة الطبيب على أنيس خدمات ${doctor.name} وقنوات الحجز المتاحة بما فيها الزيارات المنزلية عند توفرها.`,
      },
      {
        question: `ما تخصص ${doctor.name}؟`,
        answer: `${doctor.name} متخصص في ${doctor.speciality} ويستقبل المرضى عبر أنيس في المنزل أو عن بُعد بحسب طبيعة الحالة.`,
      },
      {
        question: `كيف أحجز ${doctor.name} على أنيس؟`,
        answer:
          'استخدم زر الحجز في صفحة الطبيب، اختر نوع الزيارة (منزلية أو استشارة)، حدد الموعد، ويتولى منسق أنيس تأكيد الحجز.',
      },
    ];
  }
  return [
    {
      question: `Does ${doctor.name} offer home visits on Anees?`,
      answer: `Yes. The doctor page on Anees lists ${doctor.name}'s available booking channels, including home visits when offered.`,
    },
    {
      question: `What specialty does ${doctor.name} practise?`,
      answer: `${doctor.name} specialises in ${doctor.speciality} and sees patients through Anees either at home or via telemedicine, depending on the case.`,
    },
    {
      question: `How do I book ${doctor.name} on Anees?`,
      answer:
        'Use the booking button on the doctor page, choose the visit type (home visit or consultation), pick a slot, and our coordinator confirms the appointment.',
    },
  ];
}
