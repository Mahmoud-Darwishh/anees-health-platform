/**
 * Editorial "guides" content — comparison, how-to, and pillar articles that
 * build topical authority and feed AI answer engines (the informational /
 * decision queries where the Egyptian SERP is currently thin).
 *
 * Stored as structured bilingual data (no MDX dependency); each guide renders
 * via /[locale]/guides/[slug] with Article + FAQ + Breadcrumb JSON-LD.
 * Add an entry to EN + AR (same slug + category) and it auto-routes + sitemaps.
 */
import type { FaqItem } from './faqs';
import type { SupportedLocale } from './site';

export type GuideCategory = 'how-to' | 'comparison' | 'guide';

export interface GuideSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  category: GuideCategory;
  title: string;
  description: string;
  intro: string;
  datePublished: string;
  dateModified: string;
  sections: GuideSection[];
  faqs: FaqItem[];
}

const EN: Guide[] = [
  {
    slug: 'how-to-choose-home-nursing-egypt',
    category: 'how-to',
    title: 'How to Choose a Home Nursing Company in Egypt (2026)',
    description:
      'A practical 2026 buyer’s guide to choosing a home nursing company in Egypt — what to check, the red flags to avoid, and the questions that protect your family.',
    intro:
      'Choosing home nursing for an elderly parent or a recovering patient is a high-stakes decision, and Egypt’s market is crowded with phone-first agencies that all promise the same thing. This guide gives you a clear checklist to separate a safe, accountable provider from a body-shop that sends a different stranger every visit.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'What good home nursing actually includes',
        body: [
          'Skilled home nursing covers wound and pressure-sore care, injections, IV therapy, catheter and feeding-tube management, vitals monitoring, medication management, and post-operative and chronic-disease support. Providers usually offer three tiers — nursing aide, technician, and university-qualified specialist — billed per visit, per shift, or as a monthly package.',
        ],
      },
      {
        heading: '7 things to check before you hire',
        body: ['Before you commit, verify each of these:'],
        bullets: [
          'Licensing: every nurse is registered with the Egyptian nursing/medical syndicate, with the licence checked for validity before they visit.',
          'Continuity: the same small team returns, working from a record of what was done last time — not a new face each visit.',
          'Transparent pricing: you see the price before you book, in writing, not only “on the phone”.',
          'A single coordinator: one accountable person owns the case and keeps the family updated.',
          'Infection control: clear hygiene and safety practices in the home.',
          'Verifiable reputation: real reviews or references you can check.',
          'Clear cancellation and rescheduling terms, stated up front.',
        ],
      },
      {
        heading: 'Red flags to avoid',
        body: ['Walk away if you see any of these:'],
        bullets: [
          'No proof of licensing or credentialing.',
          'A price that is only quoted by phone and changes at the door.',
          'A different, unknown nurse every visit with no handover.',
          'No written record of what was assessed or done.',
          'Cash-only with no receipt.',
        ],
      },
      {
        heading: 'How Anees Health approaches it',
        body: [
          'Anees was built to remove exactly these risks. Every clinician is syndicate-licensed and credential-verified before any visit, one coordinator owns the case end to end, every visit is recorded in a real medical record, and the price is shown before you confirm. That continuity — a team that remembers — is the difference between booking a visit and managing a course of care.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much does home nursing cost in Egypt?',
        answer:
          'Home nursing in Egypt is typically priced per visit, per shift (8–12 hours), or as a monthly package, and varies by the nurse’s qualification level, the area, and shift length. With Anees Health the exact price is confirmed before you book — no surprise fees at the door.',
      },
      {
        question: 'Are home nurses in Egypt licensed?',
        answer:
          'They should be. Always confirm the nurse is registered with the Egyptian nursing/medical syndicate. Every Anees Health nurse is licensed and credential-verified before they ever reach a patient’s home.',
      },
      {
        question: 'Can I get a 24-hour or live-in home nurse?',
        answer:
          'Yes. Home nursing can be arranged as single visits, hourly cover, 8–12-hour shifts, or a 24-hour live-in arrangement, depending on the patient’s needs. Anees coordinates the right level of cover and keeps the family updated.',
      },
    ],
  },
  {
    slug: 'home-care-vs-nursing-home-egypt',
    category: 'comparison',
    title: 'Home Care vs. Nursing Home in Egypt: Which Is Right for Your Parent?',
    description:
      'Home care or a nursing home in Egypt? A clear comparison of cost, quality, safety, and family involvement to help you choose the right option for an elderly parent.',
    intro:
      'When an elderly parent needs ongoing support, families in Egypt face a hard choice: bring care into the home, or move them into a residential facility. Both can be the right answer — it depends on the level of care needed, the home environment, and what matters most to the family.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'The core difference',
        body: [
          'Home care brings licensed clinicians — nurses, doctors, physiotherapists — to the patient, who stays in their own home. A nursing home moves the patient into a residential facility with on-site staff. Home care preserves familiarity and one-to-one attention; a facility concentrates round-the-clock staffing in one place.',
        ],
      },
      {
        heading: 'When home care is the better fit',
        body: ['Home care usually wins when:'],
        bullets: [
          'The patient is more comfortable and oriented in familiar surroundings (especially with dementia).',
          'They need one-to-one attention rather than shared staffing.',
          'Reducing infection exposure matters (post-operative, immunocompromised, or frail patients).',
          'The family wants to stay closely involved in day-to-day care.',
          'The need is chronic-disease management, post-operative recovery, or rehabilitation that can be delivered at home.',
        ],
      },
      {
        heading: 'When a residential facility may be needed',
        body: ['A nursing home or hospital-at-home service may be the safer option when:'],
        bullets: [
          'The patient needs continuous high-acuity care beyond what a home setup can safely provide.',
          'The home environment is unsafe or unsuitable for care.',
          'There is no family or caregiver capacity to support a home arrangement.',
        ],
      },
      {
        heading: 'Cost, quality, and continuity',
        body: [
          'Cost depends on the intensity of care either way; home care can be more cost-effective for one-to-one support and avoids relocation stress. The deciding factor is usually continuity and accountability — who is actually responsible for your parent’s whole case. With Anees Health home care, one coordinator manages the nurses, doctor visits, physiotherapy, and labs, and every visit is recorded in one medical record, so care builds over time instead of starting from scratch.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is home care cheaper than a nursing home in Egypt?',
        answer:
          'It depends on the level of care. For one-to-one support and routine or chronic-care needs, home care is often more cost-effective and avoids relocation. For continuous high-acuity needs, a residential or hospital-at-home setup may be required. Anees confirms the price before you book.',
      },
      {
        question: 'Is home care safe for an elderly parent?',
        answer:
          'Yes, when delivered by licensed, credential-verified clinicians following infection-control practices. Home care also reduces hospital-infection exposure and keeps the patient in a familiar environment, which is especially valuable for those with dementia.',
      },
    ],
  },
  {
    slug: 'home-healthcare-egypt-guide',
    category: 'guide',
    title: 'Home Healthcare in Egypt: The Complete 2026 Guide',
    description:
      'Everything Egyptian families need to know about home healthcare in 2026 — what it is, the services available, where it operates, what it costs, and how to choose a provider.',
    intro:
      'Home healthcare is one of the fastest-growing parts of Egyptian healthcare, driven by an ageing population and a heavy chronic-disease burden. This guide explains what home healthcare is, what you can arrange at home, where it operates, what it costs, and how to choose a provider you can trust.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'What is home healthcare?',
        body: [
          'Home healthcare is the delivery of clinical care — by licensed doctors, nurses, and physiotherapists — in the patient’s own home instead of a clinic or hospital. It covers everything from a one-off doctor visit to ongoing nursing, rehabilitation, lab tests, and chronic-disease management. It is especially valuable for elderly, post-operative, and mobility-limited patients who find travel difficult.',
        ],
      },
      {
        heading: 'Why demand is growing in Egypt',
        body: [
          'Egypt’s home-healthcare market is estimated at around USD 160 million in 2024 and projected to reach roughly USD 272 million by 2030 (Grand View Research). The drivers are structural: an ageing population, where over 75% of Egyptian seniors live with a chronic condition, and a strong preference for being cared for at home, surrounded by family.',
        ],
      },
      {
        heading: 'Services you can arrange at home',
        body: ['Across Greater Cairo, Anees Health coordinates:'],
        bullets: [
          'Doctor home visits across specialties',
          'Skilled home nursing (wound care, injections, IV, catheter and tube care, vitals)',
          'Home physiotherapy and rehabilitation',
          'Lab tests with home sample collection',
          'Elderly and geriatric care',
          'Post-operative care',
          'Palliative and chronic-disease management',
        ],
      },
      {
        heading: 'Where it operates and what it costs',
        body: [
          'Anees serves Greater Cairo and surrounding governorates — including Maadi, New Cairo, Zamalek, Heliopolis, Nasr City, Mohandessin, and 6th of October. Pricing is transparent: the price of every service is shown before you confirm the booking, with no surprise fees at the door.',
        ],
      },
      {
        heading: 'How to book — and how to choose well',
        body: [
          'Booking a home visit takes a few minutes: choose the service, pick a date and time, enter the patient’s address, and confirm; a coordinator then assigns the right clinician. When choosing a provider, look beyond price to continuity and accountability — licensed, credential-verified clinicians, one coordinator who owns the case, and a real medical record so care builds visit over visit rather than restarting each time.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What is home healthcare?',
        answer:
          'Home healthcare is clinical care — doctor visits, nursing, physiotherapy, and lab tests — delivered by licensed clinicians in the patient’s home instead of a clinic or hospital. It is ideal for elderly, post-operative, and chronic-care patients.',
      },
      {
        question: 'Is home healthcare available across Cairo?',
        answer:
          'Yes. Anees Health serves Greater Cairo and surrounding governorates, including Maadi, New Cairo, Zamalek, Heliopolis, Nasr City, Mohandessin, and 6th of October. You can verify any specific address on the coverage page before booking.',
      },
      {
        question: 'How do I book home healthcare in Egypt?',
        answer:
          'Choose the service you need, pick a date and time, enter the patient’s address in Greater Cairo, and confirm. An Anees coordinator confirms the visit within minutes and assigns a licensed clinician. The price is shown before you confirm.',
      },
    ],
  },
];

const AR: Guide[] = [
  {
    slug: 'how-to-choose-home-nursing-egypt',
    category: 'how-to',
    title: 'كيف تختار شركة تمريض منزلي في مصر (2026)',
    description:
      'دليل عملي لعام 2026 لاختيار شركة تمريض منزلي في مصر — ما الذي تتحقق منه، والعلامات التحذيرية التي تتجنبها، والأسئلة التي تحمي أسرتك.',
    intro:
      'اختيار التمريض المنزلي لأحد الوالدين المسنين أو لمريض في فترة تعافٍ قرار بالغ الأهمية، والسوق في مصر مزدحم بمكاتب تعتمد على الهاتف وتعِد جميعها بالشيء نفسه. يمنحك هذا الدليل قائمة واضحة للتفريق بين مزوّد آمن ومسؤول وبين مكتب يرسل وجهاً جديداً في كل زيارة.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'ما الذي يشمله التمريض المنزلي الجيد فعلاً',
        body: [
          'يشمل التمريض المنزلي المتخصص العناية بالجروح وقرح الفراش، والحقن، والمحاليل الوريدية، وإدارة القساطر وأنابيب التغذية، ومتابعة العلامات الحيوية، وإدارة الأدوية، ودعم ما بعد العمليات والأمراض المزمنة. عادةً ما تتوفر ثلاث فئات — مساعد تمريض، فني، وأخصائي جامعي — بأسعار بالزيارة أو بالوردية أو بباقة شهرية.',
        ],
      },
      {
        heading: '7 أشياء تتحقق منها قبل التعاقد',
        body: ['قبل أن تلتزم، تأكد من كل ما يلي:'],
        bullets: [
          'الترخيص: كل ممرض مقيّد في نقابة التمريض/الأطباء المصرية، مع التحقق من صلاحية الترخيص قبل الزيارة.',
          'الاستمرارية: نفس الفريق الصغير يعود، ويعمل من سجل لما تم في الزيارة السابقة — لا وجه جديد كل مرة.',
          'أسعار شفافة: ترى السعر قبل الحجز، مكتوباً، وليس «على الهاتف» فقط.',
          'منسق واحد: شخص مسؤول واحد يدير الحالة ويُبقي الأسرة على اطلاع.',
          'مكافحة العدوى: ممارسات نظافة وسلامة واضحة داخل المنزل.',
          'سمعة يمكن التحقق منها: تقييمات حقيقية أو مراجع يمكنك مراجعتها.',
          'شروط إلغاء وتعديل واضحة ومذكورة مسبقاً.',
        ],
      },
      {
        heading: 'علامات تحذيرية تتجنبها',
        body: ['ابتعد إذا رأيت أياً من هذه:'],
        bullets: [
          'عدم وجود إثبات للترخيص أو الاعتماد.',
          'سعر يُذكر بالهاتف فقط ثم يتغير عند الباب.',
          'ممرض مختلف ومجهول في كل زيارة دون تسليم.',
          'لا يوجد سجل مكتوب لما تم تقييمه أو عمله.',
          'الدفع نقداً فقط دون إيصال.',
        ],
      },
      {
        heading: 'كيف تتعامل أنيس هيلث مع ذلك',
        body: [
          'بُنيت أنيس لإزالة هذه المخاطر بالتحديد. كل كادر طبي مرخّص من النقابة ومُتحقَّق من اعتماده قبل أي زيارة، ومنسق واحد يدير الحالة من البداية للنهاية، وكل زيارة تُوثَّق في سجل طبي حقيقي، ويظهر السعر قبل التأكيد. هذه الاستمرارية — فريق «يتذكّر» — هي الفرق بين حجز زيارة وإدارة رحلة رعاية كاملة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم تكلفة التمريض المنزلي في مصر؟',
        answer:
          'يُسعَّر التمريض المنزلي عادةً بالزيارة أو بالوردية (8–12 ساعة) أو بباقة شهرية، ويختلف حسب مستوى تأهيل الممرض والمنطقة ومدة الوردية. مع أنيس هيلث يُؤكَّد السعر قبل الحجز دون رسوم مفاجئة.',
      },
      {
        question: 'هل ممرضو التمريض المنزلي في مصر مرخّصون؟',
        answer:
          'يجب أن يكونوا كذلك. تأكد دائماً من قيد الممرض في نقابة التمريض/الأطباء. كل ممرض في أنيس هيلث مرخّص ومُتحقَّق من اعتماده قبل وصوله إلى منزل المريض.',
      },
      {
        question: 'هل يمكنني الحصول على ممرض مقيم 24 ساعة؟',
        answer:
          'نعم. يمكن ترتيب التمريض المنزلي كزيارات مفردة أو تغطية بالساعة أو ورديات 8–12 ساعة أو ترتيب إقامة 24 ساعة، حسب احتياج المريض. تنسّق أنيس مستوى التغطية المناسب وتُبقي الأسرة على اطلاع.',
      },
    ],
  },
  {
    slug: 'home-care-vs-nursing-home-egypt',
    category: 'comparison',
    title: 'الرعاية المنزلية أم دار المسنين في مصر: أيهما الأنسب لوالديك؟',
    description:
      'رعاية منزلية أم دار مسنين في مصر؟ مقارنة واضحة للتكلفة والجودة والأمان ومشاركة الأسرة لمساعدتك على اختيار الأنسب لأحد الوالدين المسنين.',
    intro:
      'عندما يحتاج أحد الوالدين المسنين إلى دعم مستمر، تواجه الأسر في مصر اختياراً صعباً: إدخال الرعاية إلى المنزل، أو الانتقال إلى دار إقامة. وكلاهما قد يكون الصواب — يعتمد الأمر على مستوى الرعاية المطلوبة وبيئة المنزل وما يهم الأسرة أكثر.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'الفرق الجوهري',
        body: [
          'تنقل الرعاية المنزلية الكادر الطبي المرخّص — ممرضين وأطباء وأخصائيي علاج طبيعي — إلى المريض الذي يبقى في منزله. أما دار المسنين فتنقل المريض إلى منشأة إقامة بكادر داخلي. تحافظ الرعاية المنزلية على الألفة والاهتمام الفردي؛ بينما تركّز المنشأة الكادر على مدار الساعة في مكان واحد.',
        ],
      },
      {
        heading: 'متى تكون الرعاية المنزلية الأنسب',
        body: ['غالباً ما تتفوق الرعاية المنزلية عندما:'],
        bullets: [
          'يكون المريض أكثر راحة وتوازناً في بيئته المألوفة (خاصة مع الخرف).',
          'يحتاج اهتماماً فردياً بدلاً من كادر مشترك.',
          'يكون تقليل التعرض للعدوى مهماً (ما بعد العمليات أو ضعف المناعة أو الوهن).',
          'ترغب الأسرة في البقاء قريبة ومشاركة في الرعاية اليومية.',
          'تكون الحاجة لإدارة مرض مزمن أو تعافٍ بعد عملية أو تأهيل يمكن تقديمه في المنزل.',
        ],
      },
      {
        heading: 'متى قد تكون المنشأة ضرورية',
        body: ['قد تكون دار المسنين أو خدمة المستشفى المنزلي الخيار الأكثر أماناً عندما:'],
        bullets: [
          'يحتاج المريض رعاية عالية الحدّة باستمرار تفوق ما يوفّره المنزل بأمان.',
          'تكون بيئة المنزل غير آمنة أو غير مناسبة للرعاية.',
          'لا تتوفر قدرة أسرية أو مقدّم رعاية لدعم الترتيب المنزلي.',
        ],
      },
      {
        heading: 'التكلفة والجودة والاستمرارية',
        body: [
          'تعتمد التكلفة على كثافة الرعاية في كلتا الحالتين؛ وقد تكون الرعاية المنزلية أوفر للدعم الفردي وتتجنّب عناء الانتقال. لكن العامل الحاسم عادةً هو الاستمرارية والمساءلة — من المسؤول فعلاً عن حالة والدك بالكامل. مع الرعاية المنزلية من أنيس هيلث، ينظّم منسق واحد الممرضين وزيارات الطبيب والعلاج الطبيعي والتحاليل، وتُوثَّق كل زيارة في سجل طبي واحد، فتبنى الرعاية مع الوقت بدلاً من البدء من الصفر.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل الرعاية المنزلية أرخص من دار المسنين في مصر؟',
        answer:
          'يعتمد على مستوى الرعاية. للدعم الفردي والاحتياجات الاعتيادية أو المزمنة، تكون الرعاية المنزلية غالباً أوفر وتتجنّب الانتقال. أما الاحتياجات عالية الحدّة المستمرة فقد تتطلب إقامة أو مستشفى منزلي. تؤكد أنيس السعر قبل الحجز.',
      },
      {
        question: 'هل الرعاية المنزلية آمنة لأحد الوالدين المسنين؟',
        answer:
          'نعم، عند تقديمها بكادر مرخّص ومُتحقَّق من اعتماده يتبع ممارسات مكافحة العدوى. كما تقلل الرعاية المنزلية التعرض لعدوى المستشفيات وتُبقي المريض في بيئة مألوفة، وهو أمر بالغ القيمة لمرضى الخرف.',
      },
    ],
  },
  {
    slug: 'home-healthcare-egypt-guide',
    category: 'guide',
    title: 'الرعاية الصحية المنزلية في مصر: الدليل الشامل 2026',
    description:
      'كل ما تحتاج الأسر المصرية معرفته عن الرعاية الصحية المنزلية في 2026 — ما هي، والخدمات المتاحة، وأين تعمل، وكم تكلّف، وكيف تختار مزوّداً موثوقاً.',
    intro:
      'الرعاية الصحية المنزلية من أسرع قطاعات الرعاية الصحية نمواً في مصر، مدفوعة بشيخوخة السكان وارتفاع عبء الأمراض المزمنة. يشرح هذا الدليل ما هي الرعاية المنزلية، وما يمكنك ترتيبه في المنزل، وأين تعمل، وكم تكلّف، وكيف تختار مزوّداً تثق به.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'ما هي الرعاية الصحية المنزلية؟',
        body: [
          'الرعاية الصحية المنزلية هي تقديم الرعاية الإكلينيكية — عبر أطباء وممرضين وأخصائيي علاج طبيعي مرخّصين — في منزل المريض بدلاً من العيادة أو المستشفى. تشمل كل شيء من زيارة طبيب واحدة إلى تمريض مستمر وتأهيل وتحاليل وإدارة أمراض مزمنة. وهي بالغة القيمة لكبار السن ومرضى ما بعد العمليات ومحدودي الحركة الذين يصعب عليهم الانتقال.',
        ],
      },
      {
        heading: 'لماذا يتزايد الطلب في مصر',
        body: [
          'يُقدَّر سوق الرعاية الصحية المنزلية في مصر بنحو 160 مليون دولار في 2024 ويُتوقع أن يصل إلى نحو 272 مليون دولار بحلول 2030 (Grand View Research). والدوافع هيكلية: شيخوخة السكان، حيث يعيش أكثر من 75% من كبار السن في مصر مع حالة مزمنة، وتفضيل قوي لتلقّي الرعاية في المنزل وسط الأسرة.',
        ],
      },
      {
        heading: 'الخدمات التي يمكنك ترتيبها في المنزل',
        body: ['في جميع أنحاء القاهرة الكبرى، تنسّق أنيس هيلث:'],
        bullets: [
          'زيارات أطباء منزلية في مختلف التخصصات',
          'تمريض منزلي متخصص (عناية بالجروح، حقن، محاليل، قساطر وأنابيب، علامات حيوية)',
          'علاج طبيعي وتأهيل منزلي',
          'تحاليل مع سحب عينات في المنزل',
          'رعاية كبار السن وطب الشيخوخة',
          'الرعاية بعد العمليات',
          'الرعاية التلطيفية وإدارة الأمراض المزمنة',
        ],
      },
      {
        heading: 'أين تعمل وكم تكلّف',
        body: [
          'تخدم أنيس القاهرة الكبرى والمحافظات المحيطة — وتشمل المعادي والتجمع الخامس والزمالك ومصر الجديدة ومدينة نصر والمهندسين و6 أكتوبر. والأسعار شفافة: يظهر سعر كل خدمة قبل تأكيد الحجز، بلا رسوم مفاجئة عند الزيارة.',
        ],
      },
      {
        heading: 'كيف تحجز — وكيف تختار جيداً',
        body: [
          'يستغرق حجز الزيارة المنزلية دقائق: اختر الخدمة، حدد التاريخ والوقت، أدخل عنوان المريض، ثم أكّد؛ ويتولى منسق تعيين الكادر المناسب. وعند اختيار المزوّد، انظر إلى ما هو أبعد من السعر — الاستمرارية والمساءلة: كادر مرخّص ومُتحقَّق من اعتماده، ومنسق واحد يدير الحالة، وسجل طبي حقيقي تبنى عليه الرعاية زيارة بعد زيارة بدلاً من البدء من جديد كل مرة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'ما هي الرعاية الصحية المنزلية؟',
        answer:
          'الرعاية الصحية المنزلية هي رعاية إكلينيكية — زيارات أطباء وتمريض وعلاج طبيعي وتحاليل — يقدّمها كادر مرخّص في منزل المريض بدلاً من العيادة أو المستشفى. وهي مثالية لكبار السن ومرضى ما بعد العمليات والحالات المزمنة.',
      },
      {
        question: 'هل الرعاية الصحية المنزلية متاحة في جميع أنحاء القاهرة؟',
        answer:
          'نعم. تخدم أنيس هيلث القاهرة الكبرى والمحافظات المحيطة، بما فيها المعادي والتجمع الخامس والزمالك ومصر الجديدة ومدينة نصر والمهندسين و6 أكتوبر. يمكنك التحقق من أي عنوان في صفحة التغطية قبل الحجز.',
      },
      {
        question: 'كيف أحجز رعاية صحية منزلية في مصر؟',
        answer:
          'اختر الخدمة المطلوبة، حدد التاريخ والوقت، أدخل عنوان المريض في القاهرة الكبرى، ثم أكّد. يؤكد منسق أنيس الزيارة خلال دقائق ويعيّن كادراً مرخّصاً. يظهر السعر قبل التأكيد.',
      },
    ],
  },
];

const GUIDES: Record<SupportedLocale, Guide[]> = { en: EN, ar: AR };

export function getAllGuideSlugs(): string[] {
  return EN.map((g) => g.slug);
}

export function getGuide(locale: SupportedLocale, slug: string): Guide | null {
  return GUIDES[locale].find((g) => g.slug === slug) ?? null;
}

export function getAllGuides(locale: SupportedLocale): Guide[] {
  return GUIDES[locale];
}
