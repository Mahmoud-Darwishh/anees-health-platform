/**
 * Per-service cost explainers — /pricing/[slug] (e.g. /pricing/home-nursing-cost).
 *
 * These target the distinct "how much does X cost in Egypt" query — a different
 * search intent from the service pages ("X at home") and the /pricing packages
 * overview. Each leads with a COST-first direct answer (snippet/AEO bait),
 * explains what drives the price, and links to the matching service.
 *
 * No price NUMBERS are baked in here. Where a published anchor exists, the page
 * pulls it from `pricing.ts` (the single source) via `packageSlug`, so figures
 * can never drift. Offerings without an anchor read "confirmed before booking".
 */
import type { FaqItem } from './faqs';
import type { SupportedLocale } from './site';

export interface CostExplainerSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface CostExplainer {
  slug: string;
  /** Matching /services/[serviceSlug] page. */
  serviceSlug: string;
  /** Matching pricing.ts package — its tiers drive the price box + Offer (optional). */
  packageSlug?: string;
  title: string;
  description: string;
  /** Front-loaded, cost-first 40–80 word answer (no baked-in figures). */
  answer: string;
  sections: CostExplainerSection[];
  faqs: FaqItem[];
}

const EN: CostExplainer[] = [
  {
    slug: 'doctor-home-visit-cost',
    serviceSlug: 'doctor-at-home',
    packageSlug: 'doctor-home-visit',
    title: 'How Much Does a Doctor Home Visit Cost in Egypt?',
    description:
      'What a doctor home visit costs in Egypt — what affects the price, and how Anees keeps pricing transparent with the figure shown before you book.',
    answer:
      'The cost of a doctor home visit in Egypt with Anees Health depends on the doctor’s specialty, the area, and the time of the visit — and the exact price is always shown before you confirm the booking, with no surprise fees at the door. A general-practitioner visit costs less than a specialist, and night or urgent visits may cost more. You see the figure before you pay.',
    sections: [
      {
        heading: 'What affects the price',
        body: ['Several factors move the price of a home visit:'],
        bullets: [
          'The doctor’s specialty — a GP visit costs less than a specialist',
          'The area and distance from the clinician',
          'The time — daytime versus night or urgent visits',
          'Whether home tests or procedures are added',
          'A one-off visit versus an ongoing care package',
        ],
      },
      {
        heading: 'How Anees keeps pricing transparent',
        body: [
          'With Anees the full price is shown before you confirm — no surprise fees at the door — and you get a receipt for every visit. An address outside the standard service zone may add a small, clearly-disclosed travel surcharge.',
        ],
      },
      {
        heading: 'Paying for your visit',
        body: [
          'You can pay online while booking through the secure Kashier gateway, or pay the doctor on arrival. Either way, the full price is shown before you confirm.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much is a doctor home visit in Cairo?',
        answer:
          'It depends on the doctor’s specialty, the area, and the time of the visit. A GP visit costs less than a specialist. With Anees the exact price is shown before you confirm — no surprise fees.',
      },
      {
        question: 'Are there extra fees for a doctor home visit?',
        answer:
          'No hidden fees. The price is shown before booking; an address outside the standard zone may add a small, disclosed travel surcharge, and you get a receipt for every visit.',
      },
    ],
  },
  {
    slug: 'home-nursing-cost',
    serviceSlug: 'home-nursing',
    packageSlug: 'home-nursing',
    title: 'How Much Does Home Nursing Cost in Egypt?',
    description:
      'What home nursing costs in Egypt — per visit, per shift, or per month — what drives the price, and how Anees confirms it before you book.',
    answer:
      'Home nursing in Egypt with Anees Health is priced per visit, per shift (typically 8 or 12 hours), or as a monthly package, and the cost depends on the nurse’s qualification level, the shift length, the service needed, and the area. The exact price is confirmed before you book — no surprise fees — and ongoing care is usually more economical as a monthly package.',
    sections: [
      {
        heading: 'What affects the price',
        body: ['Home nursing cost varies with:'],
        bullets: [
          'The pricing model — per visit, per shift, or monthly',
          'The nurse’s qualification — aide, technician, or specialist',
          'The shift length — a single visit, an 8–12 hour shift, or a 24-hour resident',
          'The service — wound care, injections, IV therapy, catheter care',
          'The area',
        ],
      },
      {
        heading: 'Per visit, per shift, or monthly',
        body: [
          'A single visit suits a one-off need like an injection or a dressing change. A shift suits a patient who needs hours of supervision. For ongoing care, a monthly package is usually the most economical and gives continuity with the same small team.',
        ],
      },
      {
        heading: 'How Anees keeps it transparent',
        body: [
          'The price is confirmed before you book, you get a receipt for every visit, and one coordinator owns the case — so the family always knows the cost and who is responsible.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much does a home nurse cost in Cairo?',
        answer:
          'It is priced per visit, per shift, or per month, and varies by the nurse’s qualification, the shift length, and the service. Anees confirms the exact price before you book.',
      },
      {
        question: 'Is it cheaper to hire a home nurse monthly?',
        answer:
          'For ongoing care, a monthly package is usually more economical than separate visits and gives continuity with the same team. Anees confirms the package price before you commit.',
      },
    ],
  },
  {
    slug: 'home-physiotherapy-cost',
    serviceSlug: 'physiotherapy-at-home',
    packageSlug: 'home-physiotherapy-program',
    title: 'How Much Does Home Physiotherapy Cost in Egypt?',
    description:
      'What home physiotherapy costs in Egypt — single sessions versus a structured program — what affects the price, and the figure shown before you book.',
    answer:
      'Home physiotherapy in Egypt with Anees Health can be booked as single sessions or as a structured, multi-session program tailored after an initial assessment. The cost depends on the condition, the number of sessions, and the area — and the exact price is always confirmed before you book. A structured program is usually better value than ad-hoc single sessions.',
    sections: [
      {
        heading: 'What affects the price',
        body: ['Home physiotherapy cost depends on:'],
        bullets: [
          'Single sessions versus a structured program',
          'The number of sessions in the plan',
          'The condition — post-operative, stroke, orthopedic, or mobility',
          'Any equipment the program needs',
          'The area',
        ],
      },
      {
        heading: 'Why a program is usually better value',
        body: [
          'Recovery comes from consistent, progressive sessions with measured goals — not one-off visits. A structured program assesses the patient first, sets a target, and tracks progress, which both improves outcomes and is usually more economical per session than booking ad hoc.',
        ],
      },
      {
        heading: 'How Anees keeps it transparent',
        body: [
          'The program is tailored after an initial assessment, the price is confirmed before you book, and progress is recorded so you can see the value over the course of the plan.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much is a home physiotherapy session in Cairo?',
        answer:
          'It depends on whether you book single sessions or a structured program, the number of sessions, and the condition. Anees confirms the exact price before you book, and a structured program is usually better value.',
      },
      {
        question: 'Does Anees offer a home physiotherapy package?',
        answer:
          'Yes — a structured, multi-session home physiotherapy program, tailored after an assessment with the price confirmed before you book. See the price shown on this page.',
      },
    ],
  },
  {
    slug: 'lab-tests-at-home-cost',
    serviceSlug: 'lab-tests-at-home',
    packageSlug: 'lab-tests-at-home',
    title: 'How Much Do Home Lab Tests Cost in Egypt?',
    description:
      'What home lab tests cost in Egypt — what’s included, what affects the price, and how Anees confirms it before you book.',
    answer:
      'The cost of home lab tests in Egypt with Anees Health depends on which tests are ordered, and includes the convenience of home sample collection across Greater Cairo. Samples are processed by accredited laboratories and results returned digitally. The exact price is confirmed before you book — and home collection spares an elderly or post-operative patient a stressful trip to the lab.',
    sections: [
      {
        heading: 'What affects the price',
        body: ['Home lab-test cost depends on:'],
        bullets: [
          'Which tests or panels are ordered',
          'The number of tests',
          'The convenience of home sample collection',
          'The area',
        ],
      },
      {
        heading: 'What’s included',
        body: [
          'A trained phlebotomist visits the patient at home, collects the samples, and the samples are processed by accredited laboratories with results returned digitally. A doctor review can be coordinated if you need help interpreting the results.',
        ],
      },
      {
        heading: 'How Anees keeps it transparent',
        body: [
          'The full price is confirmed before you book, with no surprise fees — and home collection is often worth it for elderly, bedridden, and post-operative patients who find a lab trip difficult.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much does it cost to do blood tests at home?',
        answer:
          'It depends on which tests are ordered. The price includes home sample collection and accredited-laboratory processing, and is confirmed before you book with Anees.',
      },
      {
        question: 'Is home blood collection more expensive than going to a lab?',
        answer:
          'It adds the convenience of collection at home, which spares elderly and bedridden patients a difficult trip. Anees shows the full price before you confirm so you can decide.',
      },
    ],
  },
  {
    slug: 'elderly-care-cost',
    serviceSlug: 'elderly-care-at-home',
    packageSlug: 'sanad-care',
    title: 'How Much Does Elderly Home Care Cost in Egypt?',
    description:
      'What elderly home care costs in Egypt — single visits versus ongoing packages — what drives the price, and the package figures shown before you commit.',
    answer:
      'Elderly home care in Egypt with Anees Health is usually arranged as an ongoing package combining nursing, doctor follow-ups, physiotherapy, and coordination — or as individual visits. The cost depends on how much support the patient needs, the hours of care, and the services included. Anees’s Sanad ongoing-care package has monthly and annual options, with the exact price confirmed before you commit.',
    sections: [
      {
        heading: 'What affects the price',
        body: ['Elderly-care cost depends on:'],
        bullets: [
          'The level of support — occasional visits, daily care, or a live-in companion',
          'The hours of care each day',
          'The services included — nursing, doctor visits, physiotherapy, lab monitoring',
          'Single visits versus an ongoing package',
        ],
      },
      {
        heading: 'Ongoing care packages',
        body: [
          'For a parent who needs steady support, an ongoing package is usually the most economical and — just as important — gives continuity: the same team, one coordinator, and a shared record. Anees’s Sanad package bundles nursing, doctor follow-up, physiotherapy, and coordination, with monthly and annual options (shown on this page).',
        ],
      },
      {
        heading: 'How Anees keeps it transparent',
        body: [
          'The package price is confirmed before you commit, with no surprise fees, and one coordinator keeps the family updated on both the care and the cost.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much does elderly home care cost in Egypt?',
        answer:
          'It depends on the level of support, hours of care, and services included. Ongoing care is arranged as monthly or annual packages, with the exact price confirmed before you commit. Anees’s Sanad package has monthly and annual options.',
      },
      {
        question: 'Is a monthly elderly-care package cheaper than separate visits?',
        answer:
          'For ongoing daily support, a package is usually more economical than separate visits and gives continuity under one coordinator. Anees confirms the package price up front.',
      },
    ],
  },
];

const AR: CostExplainer[] = [
  {
    slug: 'doctor-home-visit-cost',
    serviceSlug: 'doctor-at-home',
    packageSlug: 'doctor-home-visit',
    title: 'كم تكلفة زيارة الطبيب المنزلية في مصر؟',
    description:
      'كم تكلّف زيارة الطبيب المنزلية في مصر — ما الذي يؤثّر في السعر، وكيف تبقي أنيس التسعير شفافاً بظهور الرقم قبل الحجز.',
    answer:
      'تعتمد تكلفة زيارة الطبيب المنزلية في مصر مع أنيس هيلث على تخصص الطبيب والمنطقة وموعد الزيارة — ويظهر السعر النهائي دائماً قبل تأكيد الحجز، بلا رسوم مفاجئة عند الباب. زيارة طبيب عام أقل تكلفة من أخصائي، وقد تكون الزيارات الليلية أو العاجلة أعلى. وأنت ترى الرقم قبل الدفع.',
    sections: [
      {
        heading: 'ما الذي يؤثّر في السعر',
        body: ['عدة عوامل تحرّك سعر الزيارة المنزلية:'],
        bullets: [
          'تخصص الطبيب — زيارة الطبيب العام أقل من الأخصائي',
          'المنطقة والمسافة من الكادر',
          'الموعد — نهاراً مقابل الزيارات الليلية أو العاجلة',
          'إضافة تحاليل أو إجراءات منزلية',
          'زيارة مفردة مقابل باقة رعاية مستمرة',
        ],
      },
      {
        heading: 'كيف تبقي أنيس التسعير شفافاً',
        body: [
          'مع أنيس يظهر السعر الكامل قبل التأكيد — بلا رسوم مفاجئة عند الباب — وتحصل على إيصال لكل زيارة. وقد يضيف العنوان خارج نطاق الخدمة المعتاد رسم انتقال بسيطاً معلناً بوضوح.',
        ],
      },
      {
        heading: 'دفع قيمة الزيارة',
        body: [
          'يمكنك الدفع إلكترونياً أثناء الحجز عبر بوابة كاشير الآمنة، أو الدفع للطبيب عند الوصول. وفي الحالتين يظهر السعر الكامل قبل التأكيد.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم تكلفة زيارة طبيب منزلية في القاهرة؟',
        answer:
          'تعتمد على تخصص الطبيب والمنطقة وموعد الزيارة. زيارة الطبيب العام أقل من الأخصائي. ومع أنيس يظهر السعر النهائي قبل التأكيد — بلا رسوم مفاجئة.',
      },
      {
        question: 'هل توجد رسوم إضافية على الزيارة المنزلية؟',
        answer:
          'لا رسوم خفية. يظهر السعر قبل الحجز؛ وقد يضيف العنوان خارج النطاق المعتاد رسم انتقال بسيطاً معلناً، وتحصل على إيصال لكل زيارة.',
      },
    ],
  },
  {
    slug: 'home-nursing-cost',
    serviceSlug: 'home-nursing',
    packageSlug: 'home-nursing',
    title: 'كم تكلفة التمريض المنزلي في مصر؟',
    description:
      'كم يكلّف التمريض المنزلي في مصر — بالزيارة أو بالوردية أو بالشهر — وما الذي يحرّك السعر، وكيف تؤكده أنيس قبل الحجز.',
    answer:
      'يُسعَّر التمريض المنزلي في مصر مع أنيس هيلث بالزيارة أو بالوردية (8 أو 12 ساعة عادةً) أو بباقة شهرية، وتعتمد التكلفة على مؤهل الممرض ومدة الوردية والخدمة المطلوبة والمنطقة. ويُؤكَّد السعر النهائي قبل الحجز — بلا رسوم مفاجئة — والرعاية المستمرة غالباً أوفر كباقة شهرية.',
    sections: [
      {
        heading: 'ما الذي يؤثّر في السعر',
        body: ['تختلف تكلفة التمريض المنزلي بحسب:'],
        bullets: [
          'نموذج التسعير — بالزيارة أو بالوردية أو بالشهر',
          'مؤهل الممرض — مساعد أو فني أو أخصائي',
          'مدة الوردية — زيارة مفردة، أو وردية 8–12 ساعة، أو مقيم 24 ساعة',
          'الخدمة — عناية بالجروح، حقن، محاليل وريدية، قساطر',
          'المنطقة',
        ],
      },
      {
        heading: 'بالزيارة أو بالوردية أو بالشهر',
        body: [
          'تناسب الزيارة المفردة حاجة لمرة واحدة كحقنة أو تغيير ضمادة. وتناسب الوردية مريضاً يحتاج ساعات من الإشراف. أما الرعاية المستمرة فالباقة الشهرية غالباً الأوفر وتمنح استمرارية مع الفريق الصغير نفسه.',
        ],
      },
      {
        heading: 'كيف تبقيه أنيس شفافاً',
        body: [
          'يُؤكَّد السعر قبل الحجز، وتحصل على إيصال لكل زيارة، ويدير منسق واحد الحالة — فتعرف الأسرة دائماً التكلفة ومن المسؤول.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم تكلفة ممرض منزلي في القاهرة؟',
        answer:
          'يُسعَّر بالزيارة أو بالوردية أو بالشهر، ويختلف بحسب مؤهل الممرض ومدة الوردية والخدمة. وتؤكد أنيس السعر النهائي قبل الحجز.',
      },
      {
        question: 'هل التمريض المنزلي الشهري أوفر؟',
        answer:
          'للرعاية المستمرة، الباقة الشهرية غالباً أوفر من الزيارات المنفردة وتمنح استمرارية مع الفريق نفسه. وتؤكد أنيس سعر الباقة قبل الالتزام.',
      },
    ],
  },
  {
    slug: 'home-physiotherapy-cost',
    serviceSlug: 'physiotherapy-at-home',
    packageSlug: 'home-physiotherapy-program',
    title: 'كم تكلفة العلاج الطبيعي المنزلي في مصر؟',
    description:
      'كم يكلّف العلاج الطبيعي المنزلي في مصر — جلسات مفردة أم برنامج منظّم — وما الذي يؤثّر في السعر، والرقم الذي يظهر قبل الحجز.',
    answer:
      'يمكن حجز العلاج الطبيعي المنزلي في مصر مع أنيس هيلث كجلسات مفردة أو كبرنامج منظّم متعدد الجلسات مصمَّم بعد تقييم مبدئي. وتعتمد التكلفة على الحالة وعدد الجلسات والمنطقة — ويُؤكَّد السعر النهائي دائماً قبل الحجز. والبرنامج المنظّم غالباً أفضل قيمة من الجلسات المفردة العشوائية.',
    sections: [
      {
        heading: 'ما الذي يؤثّر في السعر',
        body: ['تعتمد تكلفة العلاج الطبيعي المنزلي على:'],
        bullets: [
          'جلسات مفردة مقابل برنامج منظّم',
          'عدد الجلسات في الخطة',
          'الحالة — بعد العمليات أو الجلطة أو العظام أو الحركة',
          'أي معدات يحتاجها البرنامج',
          'المنطقة',
        ],
      },
      {
        heading: 'لماذا البرنامج غالباً أفضل قيمة',
        body: [
          'يأتي التعافي من جلسات متتابعة منتظمة بأهداف مقيسة — لا من زيارات مفردة. والبرنامج المنظّم يقيّم المريض أولاً، ويضع هدفاً، ويتابع التقدم، ما يحسّن النتائج ويكون عادةً أوفر للجلسة من الحجز العشوائي.',
        ],
      },
      {
        heading: 'كيف تبقيه أنيس شفافاً',
        body: [
          'يُصمَّم البرنامج بعد تقييم مبدئي، ويُؤكَّد السعر قبل الحجز، ويُسجَّل التقدم لترى القيمة على مدى الخطة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم سعر جلسة العلاج الطبيعي المنزلي في القاهرة؟',
        answer:
          'تعتمد على ما إذا كنت تحجز جلسات مفردة أم برنامجاً منظّماً، وعدد الجلسات والحالة. وتؤكد أنيس السعر النهائي قبل الحجز، والبرنامج المنظّم غالباً أفضل قيمة.',
      },
      {
        question: 'هل تقدّم أنيس باقة علاج طبيعي منزلي؟',
        answer:
          'نعم — برنامج علاج طبيعي منزلي منظّم متعدد الجلسات، مصمَّم بعد تقييم مع تأكيد السعر قبل الحجز. انظر السعر الموضّح في هذه الصفحة.',
      },
    ],
  },
  {
    slug: 'lab-tests-at-home-cost',
    serviceSlug: 'lab-tests-at-home',
    packageSlug: 'lab-tests-at-home',
    title: 'كم تكلفة التحاليل المنزلية في مصر؟',
    description:
      'كم تكلّف التحاليل المنزلية في مصر — ما الذي تشمله، وما الذي يؤثّر في السعر، وكيف تؤكده أنيس قبل الحجز.',
    answer:
      'تعتمد تكلفة التحاليل المنزلية في مصر مع أنيس هيلث على التحاليل المطلوبة، وتشمل راحة سحب العينات في المنزل في القاهرة الكبرى. وتُحلَّل العينات في معامل معتمدة وتُرسل النتائج رقمياً. ويُؤكَّد السعر النهائي قبل الحجز — ويوفّر السحب المنزلي على كبار السن ومرضى ما بعد العمليات رحلة متعبة إلى المعمل.',
    sections: [
      {
        heading: 'ما الذي يؤثّر في السعر',
        body: ['تعتمد تكلفة التحاليل المنزلية على:'],
        bullets: [
          'التحاليل أو الباقات المطلوبة',
          'عدد التحاليل',
          'راحة سحب العينات في المنزل',
          'المنطقة',
        ],
      },
      {
        heading: 'ما الذي تشمله',
        body: [
          'يزور فني سحب عينات مدرَّب المريض في المنزل ويأخذ العينات، وتُحلَّل في معامل معتمدة وتُرسل النتائج رقمياً. ويمكن تنسيق مراجعة طبيب إذا احتجت مساعدة في تفسير النتائج.',
        ],
      },
      {
        heading: 'كيف تبقيه أنيس شفافاً',
        body: [
          'يُؤكَّد السعر الكامل قبل الحجز بلا رسوم مفاجئة — والسحب المنزلي غالباً يستحق ذلك لكبار السن وطريحي الفراش ومرضى ما بعد العمليات ممن يصعب عليهم الذهاب للمعمل.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم تكلفة عمل تحاليل دم في المنزل؟',
        answer:
          'تعتمد على التحاليل المطلوبة. ويشمل السعر سحب العينات في المنزل والتحليل في معمل معتمد، ويُؤكَّد قبل الحجز مع أنيس.',
      },
      {
        question: 'هل السحب المنزلي أغلى من الذهاب للمعمل؟',
        answer:
          'يضيف راحة السحب في المنزل، ما يوفّر على كبار السن وطريحي الفراش رحلة صعبة. وتعرض أنيس السعر الكامل قبل التأكيد لتقرّر.',
      },
    ],
  },
  {
    slug: 'elderly-care-cost',
    serviceSlug: 'elderly-care-at-home',
    packageSlug: 'sanad-care',
    title: 'كم تكلفة رعاية المسنين المنزلية في مصر؟',
    description:
      'كم تكلّف رعاية المسنين المنزلية في مصر — زيارات مفردة أم باقات مستمرة — وما الذي يحرّك السعر، وأرقام الباقة التي تظهر قبل الالتزام.',
    answer:
      'تُرتَّب رعاية المسنين المنزلية في مصر مع أنيس هيلث عادةً كباقة مستمرة تجمع التمريض ومتابعة الأطباء والعلاج الطبيعي والتنسيق — أو كزيارات مفردة. وتعتمد التكلفة على مقدار الدعم الذي يحتاجه المريض وساعات الرعاية والخدمات المشمولة. ولباقة سند للرعاية المستمرة خياران شهري وسنوي، مع تأكيد السعر النهائي قبل الالتزام.',
    sections: [
      {
        heading: 'ما الذي يؤثّر في السعر',
        body: ['تعتمد تكلفة رعاية المسنين على:'],
        bullets: [
          'مستوى الدعم — زيارات متقطّعة أو رعاية يومية أو مرافق مقيم',
          'ساعات الرعاية يومياً',
          'الخدمات المشمولة — تمريض، زيارات طبيب، علاج طبيعي، مراقبة تحاليل',
          'زيارات مفردة مقابل باقة مستمرة',
        ],
      },
      {
        heading: 'باقات الرعاية المستمرة',
        body: [
          'للوالد الذي يحتاج دعماً ثابتاً، تكون الباقة المستمرة عادةً الأوفر — والأهم أنها تمنح الاستمرارية: الفريق نفسه، ومنسق واحد، وسجل مشترك. وتجمع باقة سند من أنيس التمريض ومتابعة الطبيب والعلاج الطبيعي والتنسيق، بخيارين شهري وسنوي (موضّحين في هذه الصفحة).',
        ],
      },
      {
        heading: 'كيف تبقيه أنيس شفافاً',
        body: [
          'يُؤكَّد سعر الباقة قبل الالتزام بلا رسوم مفاجئة، ويبقي منسق واحد الأسرة على اطلاع بالرعاية والتكلفة معاً.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم تكلفة رعاية المسنين المنزلية في مصر؟',
        answer:
          'تعتمد على مستوى الدعم وساعات الرعاية والخدمات المشمولة. وتُرتَّب الرعاية المستمرة كباقات شهرية أو سنوية مع تأكيد السعر قبل الالتزام. ولباقة سند من أنيس خياران شهري وسنوي.',
      },
      {
        question: 'هل الباقة الشهرية لرعاية المسنين أوفر من الزيارات المنفردة؟',
        answer:
          'للدعم اليومي المستمر، تكون الباقة عادةً أوفر من الزيارات المنفردة وتمنح استمرارية تحت منسق واحد. وتؤكد أنيس سعر الباقة مسبقاً.',
      },
    ],
  },
];

const EXPLAINERS: Record<SupportedLocale, CostExplainer[]> = { en: EN, ar: AR };

export function getAllCostExplainerSlugs(): string[] {
  return EN.map((c) => c.slug);
}

export function getCostExplainer(locale: SupportedLocale, slug: string): CostExplainer | null {
  return EXPLAINERS[locale].find((c) => c.slug === slug) ?? null;
}

export function getAllCostExplainers(locale: SupportedLocale): CostExplainer[] {
  return EXPLAINERS[locale];
}

/** The cost-page slug for a given /services/[slug], if one exists. */
export function getCostExplainerSlugForService(serviceSlug: string): string | null {
  return EN.find((c) => c.serviceSlug === serviceSlug)?.slug ?? null;
}
