/**
 * Condition / use-case content — the bottom-of-funnel, GEO-authority pages AI
 * assistants cite when a caregiver asks "can stroke rehab be done at home in
 * Egypt?". Structured bilingual data (no MDX); renders via
 * /[locale]/conditions/[slug] with MedicalWebPage + Article + FAQ schema.
 */
import type { FaqItem } from './faqs';
import type { SupportedLocale } from './site';

export interface ConditionSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface ConditionLink {
  slug: string;
  label: string;
}

export interface Condition {
  slug: string;
  name: string;
  description: string;
  intro: string;
  aspect: 'Treatment' | 'Prevention';
  datePublished: string;
  dateModified: string;
  sections: ConditionSection[];
  faqs: FaqItem[];
  related: ConditionLink[];
}

const EN: Condition[] = [
  {
    slug: 'stroke-rehab-at-home',
    name: 'Stroke Rehabilitation at Home in Egypt',
    description:
      'Can stroke rehabilitation be done at home in Egypt? A guide to home-based stroke recovery — physiotherapy, nursing, the recovery timeline, and how Anees supports it.',
    intro:
      'After a stroke, consistent rehabilitation is the single biggest factor in recovery — and much of it can be delivered safely at home. This guide explains what home stroke rehabilitation involves in Egypt, who provides it, and what families can expect.',
    aspect: 'Treatment',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'What home stroke rehabilitation covers',
        body: [
          'Home stroke rehab combines physiotherapy to rebuild strength, balance, and mobility; support for the activities of daily living; and nursing care for medication, swallowing, and skin integrity. Delivering it at home keeps the patient in a familiar, low-stress environment and lets the family stay closely involved.',
        ],
      },
      {
        heading: 'The recovery timeline',
        body: [
          'Recovery is generally fastest in the first three to six months after a stroke, when the brain is most adaptable, so starting rehabilitation early and keeping it consistent matters most. Progress is gradual and varies by stroke severity; a structured plan with measurable goals keeps it on track.',
        ],
      },
      {
        heading: 'Who delivers it — physiotherapist and nurse',
        body: [
          'A licensed physiotherapist leads the mobility and strength work, while a home nurse manages medication, monitoring, and complication prevention. Coordinating both under one plan avoids the gaps that slow recovery.',
        ],
      },
      {
        heading: 'How Anees supports stroke recovery at home',
        body: [
          'Anees coordinates the physiotherapist, nurse, and doctor follow-ups under one coordinator, with every session recorded in one medical record — so the team tracks progress over time instead of starting from scratch each visit.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can stroke rehabilitation be done at home?',
        answer:
          'Yes. Much of stroke rehabilitation — physiotherapy, mobility training, nursing care, and monitoring — can be delivered safely at home, which keeps the patient in a familiar environment and lets the family stay involved. Anees coordinates home physiotherapy and nursing across Greater Cairo.',
      },
      {
        question: 'How soon should stroke rehabilitation start?',
        answer:
          'As early as it is medically safe. Recovery is fastest in the first three to six months after a stroke, so starting rehabilitation promptly and keeping it consistent gives the best results.',
      },
    ],
    related: [
      { slug: 'physiotherapy-at-home', label: 'Home physiotherapy' },
      { slug: 'home-nursing', label: 'Home nursing' },
    ],
  },
  {
    slug: 'post-surgery-wound-care',
    name: 'Post-Surgery Wound Care at Home in Egypt',
    description:
      'How to care for a surgical wound at home in Egypt — dressing changes, signs of infection, and when to call a nurse or doctor. Licensed home nursing with Anees.',
    intro:
      'Proper wound care after surgery prevents infection and speeds recovery, and much of it can be done at home by a trained nurse, sparing the patient repeated hospital trips. Here is what home post-surgery wound care involves.',
    aspect: 'Treatment',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'Why wound care matters after surgery',
        body: [
          'A surgical wound is most vulnerable in the first two weeks. Clean, correctly-timed dressing changes and early detection of infection are what keep healing on track and avoid complications that could mean re-admission.',
        ],
      },
      {
        heading: 'What home wound care includes',
        body: ['A home nurse provides:'],
        bullets: [
          'Wound assessment at each visit',
          'Dressing changes using sterile technique',
          'Drain management where present',
          'Pain and medication support',
          'Documentation of healing progress',
        ],
      },
      {
        heading: 'Signs of infection to watch for',
        body: ['Contact a nurse or doctor promptly if you notice:'],
        bullets: [
          'Increasing redness, swelling, or warmth around the wound',
          'Pus or unusual discharge',
          'A bad smell',
          'Increasing pain after the first few days',
          'Fever',
        ],
      },
      {
        heading: 'The nurse’s role — and how Anees helps',
        body: [
          'Anees sends licensed nurses for scheduled wound care, coordinates a doctor review if the wound is not healing as expected, and records each visit so the whole team sees the wound’s progress.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can surgical wound care be done at home?',
        answer:
          'Yes. A trained nurse can change dressings, manage drains, and monitor for infection at home, which avoids repeated hospital trips. Anees provides licensed home nursing for post-surgery wound care across Greater Cairo.',
      },
      {
        question: 'How often should a surgical dressing be changed?',
        answer:
          'It depends on the wound and the surgeon’s instructions — some need daily changes, others every few days. A home nurse follows the surgical plan and adjusts based on how the wound is healing.',
      },
    ],
    related: [
      { slug: 'home-nursing', label: 'Home nursing' },
      { slug: 'post-operative-care', label: 'Post-operative care' },
    ],
  },
  {
    slug: 'diabetic-foot-care',
    name: 'Diabetic Foot Care at Home in Egypt',
    description:
      'Diabetic foot care at home in Egypt — why it matters, the daily routine, warning signs, and how home nursing prevents serious complications.',
    intro:
      'For people with diabetes, foot care is not optional — small problems can become serious quickly. Regular checks and care at home prevent the wounds and infections that lead to hospital admissions.',
    aspect: 'Prevention',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'Why diabetic foot care matters',
        body: [
          'Diabetes can reduce sensation and blood flow in the feet, so a small cut or blister may go unnoticed and become infected. Consistent foot care is the most effective way to prevent ulcers and protect mobility.',
        ],
      },
      {
        heading: 'The daily foot-care routine',
        body: ['A safe daily routine includes:'],
        bullets: [
          'Inspect both feet daily for cuts, blisters, redness, or swelling',
          'Wash and dry carefully, especially between the toes',
          'Moisturize dry skin (but not between the toes)',
          'Wear well-fitting shoes and clean socks; never walk barefoot',
          'Trim nails carefully, or have a nurse do it',
        ],
      },
      {
        heading: 'Warning signs to act on',
        body: ['Contact a nurse or doctor early if you see:'],
        bullets: [
          'Any wound that is not healing',
          'Redness, warmth, or swelling',
          'Discharge or a bad smell',
          'Numbness, tingling, or a change in colour',
          'New or increasing pain',
        ],
      },
      {
        heading: 'How Anees supports diabetic foot care at home',
        body: [
          'Anees nurses provide regular foot checks, wound care, and education, and coordinate a doctor review when needed — keeping small problems small.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Why is foot care so important for people with diabetes?',
        answer:
          'Diabetes can reduce sensation and circulation in the feet, so minor injuries go unnoticed and can become serious infections or ulcers. Regular foot care and early detection prevent most of these complications.',
      },
      {
        question: 'Can a nurse do diabetic foot care at home?',
        answer:
          'Yes. A home nurse can inspect the feet, provide wound care, trim nails safely, and educate the patient and family. Anees coordinates this across Greater Cairo, with a doctor review when needed.',
      },
    ],
    related: [
      { slug: 'home-nursing', label: 'Home nursing' },
      { slug: 'doctor-at-home', label: 'Doctor home visit' },
    ],
  },
  {
    slug: 'elderly-fall-prevention',
    name: 'Elderly Fall Prevention at Home in Egypt',
    description:
      'How to prevent falls for an elderly parent at home in Egypt — a home safety checklist, mobility and physiotherapy, and when to get medical help.',
    intro:
      'Falls are one of the biggest threats to an older adult’s independence, and most happen at home. The good news: most are preventable with a few practical changes and the right support.',
    aspect: 'Prevention',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'Why falls are so dangerous for older adults',
        body: [
          'A single fall can cause a fracture that ends independence, and the fear of falling often leads to less movement — which weakens muscles and raises the risk further. Preventing the first fall is far easier than recovering from one.',
        ],
      },
      {
        heading: 'Home safety checklist',
        body: ['Reduce the most common hazards:'],
        bullets: [
          'Remove loose rugs and clutter from walkways',
          'Add grab bars in the bathroom and near the bed',
          'Ensure good lighting, especially on stairs and at night',
          'Keep frequently-used items within easy reach',
          'Use non-slip mats in the bathroom',
          'Choose supportive, non-slip footwear',
        ],
      },
      {
        heading: 'Mobility, strength, and physiotherapy',
        body: [
          'Balance and strength decline with age but can be rebuilt. A physiotherapist can design a simple home program to improve balance, leg strength, and confidence — one of the most effective fall-prevention measures there is.',
        ],
      },
      {
        heading: 'When to involve a doctor — and how Anees helps',
        body: [
          'Sudden changes in balance, dizziness, or new falls warrant a medical review (medications and blood pressure are common culprits). Anees coordinates home physiotherapy, a doctor visit, and ongoing elderly care under one plan.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How can I prevent my elderly parent from falling at home?',
        answer:
          'Most falls are preventable: remove trip hazards, add grab bars and good lighting, ensure safe footwear, and build balance and strength with physiotherapy. Anees provides home physiotherapy and elderly care across Greater Cairo.',
      },
      {
        question: 'Can physiotherapy reduce falls in older adults?',
        answer:
          'Yes. A targeted physiotherapy program to improve balance and leg strength is one of the most effective ways to reduce falls, and a physiotherapist can run it at home.',
      },
    ],
    related: [
      { slug: 'physiotherapy-at-home', label: 'Home physiotherapy' },
      { slug: 'elderly-care-at-home', label: 'Elderly care' },
    ],
  },
];

const AR: Condition[] = [
  {
    slug: 'stroke-rehab-at-home',
    name: 'إعادة تأهيل السكتة الدماغية في المنزل بمصر',
    description:
      'هل يمكن إجراء تأهيل السكتة الدماغية في المنزل بمصر؟ دليل للتعافي المنزلي بعد الجلطة — العلاج الطبيعي والتمريض ومدة التعافي وكيف تدعمه أنيس.',
    intro:
      'بعد السكتة الدماغية، يُعدّ التأهيل المنتظم أهم عامل في التعافي — ويمكن تقديم جزء كبير منه بأمان في المنزل. يشرح هذا الدليل ما يشمله تأهيل الجلطة المنزلي في مصر، ومن يقدّمه، وما الذي تتوقعه الأسرة.',
    aspect: 'Treatment',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'ما الذي يشمله تأهيل السكتة الدماغية في المنزل',
        body: [
          'يجمع التأهيل المنزلي بين العلاج الطبيعي لاستعادة القوة والتوازن والحركة، ودعم أنشطة الحياة اليومية، والرعاية التمريضية للأدوية والبلع وسلامة الجلد. ويُبقي تقديمه في المنزل المريض في بيئة مألوفة ومنخفضة التوتر ويُتيح للأسرة المشاركة عن قرب.',
        ],
      },
      {
        heading: 'مدة التعافي',
        body: [
          'يكون التعافي أسرع عادةً في الأشهر الثلاثة إلى الستة الأولى بعد الجلطة، حين يكون الدماغ أكثر قابلية للتكيّف، لذا فإن بدء التأهيل مبكراً والاستمرار عليه هو الأهم. التقدم تدريجي ويختلف بحسب شدة الجلطة؛ وخطة منظّمة بأهداف قابلة للقياس تُبقيه على المسار.',
        ],
      },
      {
        heading: 'من يقدّمه — أخصائي العلاج الطبيعي والممرض',
        body: [
          'يقود أخصائي علاج طبيعي مرخّص عمل الحركة والقوة، بينما يدير الممرض المنزلي الأدوية والمتابعة والوقاية من المضاعفات. وتنسيق الاثنين ضمن خطة واحدة يتجنّب الفجوات التي تبطئ التعافي.',
        ],
      },
      {
        heading: 'كيف تدعم أنيس التعافي من الجلطة في المنزل',
        body: [
          'تنسّق أنيس أخصائي العلاج الطبيعي والممرض ومتابعة الطبيب تحت منسق واحد، مع توثيق كل جلسة في سجل طبي واحد — فيتابع الفريق التقدم مع الوقت بدلاً من البدء من الصفر كل زيارة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكن إجراء تأهيل السكتة الدماغية في المنزل؟',
        answer:
          'نعم. يمكن تقديم جزء كبير من تأهيل الجلطة — العلاج الطبيعي وتدريب الحركة والرعاية التمريضية والمتابعة — بأمان في المنزل، مما يُبقي المريض في بيئة مألوفة ويُتيح للأسرة المشاركة. تنسّق أنيس العلاج الطبيعي والتمريض المنزلي في القاهرة الكبرى.',
      },
      {
        question: 'متى يجب أن يبدأ تأهيل الجلطة؟',
        answer:
          'في أقرب وقت آمن طبياً. التعافي أسرع في الأشهر الثلاثة إلى الستة الأولى بعد الجلطة، لذا فإن البدء المبكر والاستمرار يحققان أفضل النتائج.',
      },
    ],
    related: [
      { slug: 'physiotherapy-at-home', label: 'العلاج الطبيعي المنزلي' },
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
    ],
  },
  {
    slug: 'post-surgery-wound-care',
    name: 'العناية بالجروح بعد الجراحة في المنزل بمصر',
    description:
      'كيف تعتني بجرح الجراحة في المنزل بمصر — تغيير الضمادات وعلامات العدوى ومتى تتصل بالممرض أو الطبيب. تمريض منزلي مرخّص مع أنيس.',
    intro:
      'العناية الصحيحة بالجرح بعد الجراحة تمنع العدوى وتسرّع التعافي، ويمكن تنفيذ جزء كبير منها في المنزل عبر ممرض مدرّب، ما يوفّر على المريض تكرار زيارات المستشفى. إليك ما تشمله العناية المنزلية بالجروح بعد الجراحة.',
    aspect: 'Treatment',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'لماذا تهم العناية بالجرح بعد الجراحة',
        body: [
          'يكون جرح الجراحة أكثر عرضة للخطر في أول أسبوعين. وتغيير الضمادات بشكل نظيف وفي توقيته الصحيح والكشف المبكر عن العدوى هما ما يُبقي الشفاء على المسار ويتجنّب مضاعفات قد تعني إعادة الدخول للمستشفى.',
        ],
      },
      {
        heading: 'ما تشمله العناية المنزلية بالجرح',
        body: ['يقدّم الممرض المنزلي:'],
        bullets: [
          'تقييم الجرح في كل زيارة',
          'تغيير الضمادات بتقنية معقّمة',
          'إدارة الأنابيب عند وجودها',
          'دعم الألم والأدوية',
          'توثيق تقدّم الشفاء',
        ],
      },
      {
        heading: 'علامات العدوى التي تنتبه لها',
        body: ['اتصل بالممرض أو الطبيب فوراً إذا لاحظت:'],
        bullets: [
          'زيادة الاحمرار أو التورم أو الحرارة حول الجرح',
          'صديد أو إفرازات غير معتادة',
          'رائحة كريهة',
          'ازدياد الألم بعد الأيام الأولى',
          'ارتفاع في درجة الحرارة',
        ],
      },
      {
        heading: 'دور الممرض — وكيف تساعد أنيس',
        body: [
          'ترسل أنيس ممرضين مرخّصين للعناية المجدولة بالجرح، وتنسّق مراجعة طبيب إذا لم يلتئم الجرح كما هو متوقع، وتوثّق كل زيارة ليرى الفريق كله تقدّم الجرح.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكن العناية بجرح الجراحة في المنزل؟',
        answer:
          'نعم. يمكن لممرض مدرّب تغيير الضمادات وإدارة الأنابيب ومتابعة العدوى في المنزل، ما يتجنّب تكرار زيارات المستشفى. توفّر أنيس تمريضاً منزلياً مرخّصاً للعناية بالجروح بعد الجراحة في القاهرة الكبرى.',
      },
      {
        question: 'كم مرة يجب تغيير ضمادة الجراحة؟',
        answer:
          'يعتمد على الجرح وتعليمات الجراح — بعضها يحتاج تغييراً يومياً وبعضها كل بضعة أيام. يتبع الممرض المنزلي خطة الجراحة ويعدّلها بحسب التئام الجرح.',
      },
    ],
    related: [
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
      { slug: 'post-operative-care', label: 'الرعاية بعد العمليات' },
    ],
  },
  {
    slug: 'diabetic-foot-care',
    name: 'العناية بالقدم السكري في المنزل بمصر',
    description:
      'العناية بالقدم السكري في المنزل بمصر — لماذا تهم، والروتين اليومي، والعلامات التحذيرية، وكيف يمنع التمريض المنزلي المضاعفات الخطيرة.',
    intro:
      'لمرضى السكري، العناية بالقدم ليست اختيارية — فالمشكلات الصغيرة قد تصبح خطيرة بسرعة. الفحوصات والعناية المنتظمة في المنزل تمنع الجروح والعدوى التي تؤدي إلى دخول المستشفى.',
    aspect: 'Prevention',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'لماذا تهم العناية بالقدم السكري',
        body: [
          'قد يقلّل السكري الإحساس وتدفق الدم في القدمين، فقد لا يُلاحَظ جرح أو فقاعة صغيرة فتُصاب بالعدوى. والعناية المنتظمة بالقدم هي أكثر الطرق فعالية لمنع التقرحات وحماية الحركة.',
        ],
      },
      {
        heading: 'روتين العناية اليومي بالقدم',
        body: ['يشمل الروتين الآمن:'],
        bullets: [
          'افحص القدمين يومياً بحثاً عن جروح أو فقاعات أو احمرار أو تورم',
          'اغسلهما وجفّفهما بعناية، خاصة بين الأصابع',
          'رطّب الجلد الجاف (لكن ليس بين الأصابع)',
          'ارتدِ حذاءً مناسباً وجوارب نظيفة؛ ولا تمشِ حافياً',
          'قلّم الأظافر بحذر أو دع ممرضاً يقوم بذلك',
        ],
      },
      {
        heading: 'علامات تحذيرية تتطلب التحرك',
        body: ['اتصل بالممرض أو الطبيب مبكراً إذا رأيت:'],
        bullets: [
          'أي جرح لا يلتئم',
          'احمرار أو حرارة أو تورم',
          'إفرازات أو رائحة كريهة',
          'تنميل أو وخز أو تغيّر في اللون',
          'ألم جديد أو متزايد',
        ],
      },
      {
        heading: 'كيف تدعم أنيس العناية بالقدم السكري في المنزل',
        body: [
          'يقدّم ممرضو أنيس فحوصات منتظمة للقدم وعناية بالجروح وتثقيفاً، وينسّقون مراجعة طبيب عند الحاجة — للحفاظ على المشكلات الصغيرة صغيرة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'لماذا العناية بالقدم مهمة جداً لمرضى السكري؟',
        answer:
          'قد يقلّل السكري الإحساس والدورة الدموية في القدمين، فلا تُلاحَظ الإصابات البسيطة وقد تتحول إلى عدوى أو تقرحات خطيرة. العناية المنتظمة والكشف المبكر يمنعان معظم هذه المضاعفات.',
      },
      {
        question: 'هل يمكن لممرض العناية بالقدم السكري في المنزل؟',
        answer:
          'نعم. يمكن لممرض منزلي فحص القدمين والعناية بالجروح وتقليم الأظافر بأمان وتثقيف المريض والأسرة. تنسّق أنيس ذلك في القاهرة الكبرى، مع مراجعة طبيب عند الحاجة.',
      },
    ],
    related: [
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
      { slug: 'doctor-at-home', label: 'زيارة طبيب منزلية' },
    ],
  },
  {
    slug: 'elderly-fall-prevention',
    name: 'الوقاية من سقوط المسنين في المنزل بمصر',
    description:
      'كيف تقي أحد الوالدين المسنين من السقوط في المنزل بمصر — قائمة أمان منزلية، والحركة والعلاج الطبيعي، ومتى تطلب المساعدة الطبية.',
    intro:
      'السقوط من أكبر التهديدات لاستقلالية كبار السن، ومعظمه يحدث في المنزل. والخبر الجيد: معظمه يمكن الوقاية منه ببعض التغييرات العملية والدعم المناسب.',
    aspect: 'Prevention',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'لماذا يُعدّ السقوط خطيراً على كبار السن',
        body: [
          'قد تسبّب سقطة واحدة كسراً يُنهي الاستقلالية، وغالباً ما يؤدي الخوف من السقوط إلى قلة الحركة — ما يُضعف العضلات ويرفع الخطر أكثر. والوقاية من السقطة الأولى أسهل بكثير من التعافي منها.',
        ],
      },
      {
        heading: 'قائمة أمان المنزل',
        body: ['قلّل أكثر المخاطر شيوعاً:'],
        bullets: [
          'أزل السجاد غير المثبّت والفوضى من الممرات',
          'أضف مقابض إمساك في الحمام وبجوار السرير',
          'وفّر إضاءة جيدة، خاصة على السلالم وليلاً',
          'اجعل الأشياء كثيرة الاستخدام في متناول اليد',
          'استخدم سجاداً مانعاً للانزلاق في الحمام',
          'اختر حذاءً داعماً مانعاً للانزلاق',
        ],
      },
      {
        heading: 'الحركة والقوة والعلاج الطبيعي',
        body: [
          'يتراجع التوازن والقوة مع التقدّم في العمر لكن يمكن إعادة بنائهما. يمكن لأخصائي علاج طبيعي تصميم برنامج منزلي بسيط لتحسين التوازن وقوة الساقين والثقة — وهو من أكثر إجراءات الوقاية من السقوط فعالية.',
        ],
      },
      {
        heading: 'متى تُشرك الطبيب — وكيف تساعد أنيس',
        body: [
          'تستدعي التغيرات المفاجئة في التوازن أو الدوخة أو السقطات الجديدة مراجعة طبية (الأدوية وضغط الدم من الأسباب الشائعة). تنسّق أنيس العلاج الطبيعي المنزلي وزيارة الطبيب ورعاية المسنين المستمرة ضمن خطة واحدة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كيف أقي والدي المسن من السقوط في المنزل؟',
        answer:
          'معظم حالات السقوط يمكن الوقاية منها: أزل مخاطر التعثّر، وأضف مقابض إمساك وإضاءة جيدة، ووفّر حذاءً آمناً، وابنِ التوازن والقوة بالعلاج الطبيعي. توفّر أنيس العلاج الطبيعي المنزلي ورعاية المسنين في القاهرة الكبرى.',
      },
      {
        question: 'هل يقلّل العلاج الطبيعي السقوط لدى كبار السن؟',
        answer:
          'نعم. برنامج علاج طبيعي مخصّص لتحسين التوازن وقوة الساقين من أكثر الطرق فعالية لتقليل السقوط، ويمكن لأخصائي تنفيذه في المنزل.',
      },
    ],
    related: [
      { slug: 'physiotherapy-at-home', label: 'العلاج الطبيعي المنزلي' },
      { slug: 'elderly-care-at-home', label: 'رعاية المسنين' },
    ],
  },
];

const CONDITIONS: Record<SupportedLocale, Condition[]> = { en: EN, ar: AR };

export function getAllConditionSlugs(): string[] {
  return EN.map((c) => c.slug);
}

export function getCondition(locale: SupportedLocale, slug: string): Condition | null {
  return CONDITIONS[locale].find((c) => c.slug === slug) ?? null;
}

export function getAllConditions(locale: SupportedLocale): Condition[] {
  return CONDITIONS[locale];
}
