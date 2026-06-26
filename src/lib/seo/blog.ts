/**
 * Blog — the platform's dated awareness / patient-education stream.
 *
 * Deliberately DISTINCT from `/guides` (evergreen decision/how-to/comparison
 * content): the blog carries timely, awareness, and seasonal articles, emits
 * `BlogPosting` (not `Article`) JSON-LD, and is ordered newest-first. A live,
 * dated stream is also a recency signal AI answer engines (e.g. Perplexity)
 * reward. Topics here do NOT overlap the guides/conditions libraries.
 *
 * Add an entry to EN + AR (same slug) and it auto-routes (`/blog/[slug]`),
 * auto-sitemaps, and appears on the hub.
 */
import type { FaqItem } from './faqs';
import type { SupportedLocale } from './site';

export interface BlogSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  intro: string;
  datePublished: string;
  dateModified: string;
  sections: BlogSection[];
  faqs: FaqItem[];
}

const EN: BlogPost[] = [
  {
    slug: 'signs-elderly-parent-needs-home-care',
    title: 'Signs Your Elderly Parent May Need Home Care',
    description:
      'Not sure if it’s time? The practical signs that an elderly parent may need home care in Egypt — and what to do next.',
    intro:
      'It rarely happens overnight. The signs that an ageing parent needs more support usually build slowly — a missed medication here, a small fall there. Knowing what to look for helps you act before a crisis. Here are the practical signs to watch.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Changes in daily living',
        body: ['Often the earliest signs show up in everyday tasks:'],
        bullets: [
          'Difficulty washing, dressing, or preparing meals',
          'Weight loss, skipped meals, or a fridge of expired food',
          'Wearing the same clothes or neglecting personal care',
          'A home that used to be tidy becoming hard to manage',
        ],
      },
      {
        heading: 'Health and safety signs',
        body: ['These point to a need for clinical support:'],
        bullets: [
          'Missed, muddled, or doubled-up medications',
          'New or repeated falls, or unexplained bruises',
          'Forgetting appointments or recent conversations',
          'A chronic condition slipping out of control',
        ],
      },
      {
        heading: 'Emotional and social signs',
        body: ['Wellbeing matters as much as physical health:'],
        bullets: [
          'Withdrawing from friends, family, and activities',
          'Low mood, anxiety, or loss of interest',
          'Confusion about time, place, or familiar people',
          'Reluctance to leave the house',
        ],
      },
      {
        heading: 'What to do next',
        body: [
          'If several of these ring true, start with an honest conversation and a medical review — many issues are treatable. Then decide what level of support helps: occasional visits, regular nursing, or a coordinated care plan. Anees can assess the needs and coordinate home nursing, doctor visits, and physiotherapy under one coordinator across Greater Cairo.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I know if my elderly parent needs help at home?',
        answer:
          'Look for changes in daily living (washing, eating, housekeeping), health and safety signs (missed medication, falls), and emotional signs (withdrawal, confusion). Several of these together usually mean it is time to arrange support.',
      },
      {
        question: 'What kind of home care is available for elderly parents in Egypt?',
        answer:
          'Everything from occasional nurse visits to regular nursing, doctor home visits, physiotherapy, and coordinated ongoing care. Anees coordinates these under one care coordinator across Greater Cairo.',
      },
    ],
  },
  {
    slug: 'what-to-expect-doctor-home-visit',
    title: 'What to Expect During a Doctor’s Home Visit',
    description:
      'Booked a doctor home visit and not sure what happens? A step-by-step of what to expect during the visit itself — and how to make it go smoothly.',
    intro:
      'A home visit should feel calm and unhurried — that is part of the point. If you have never had a doctor come to the house, here is exactly what to expect from the moment they arrive.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Arrival and identity check',
        body: [
          'A licensed doctor arrives at the agreed time. With Anees, the clinician confirms their own identity and the patient’s, so you always know exactly who is treating your family.',
        ],
      },
      {
        heading: 'History and examination',
        body: [
          'The doctor asks about symptoms, medical history, and current medications, then examines the patient unhurried — something a crowded clinic rarely allows. Having any recent test results and a medication list ready makes this faster and safer.',
        ],
      },
      {
        heading: 'Diagnosis, treatment, and next steps',
        body: ['By the end of the visit you should have:'],
        bullets: [
          'A clear explanation of the diagnosis',
          'A prescription if one is needed',
          'Home lab tests or imaging arranged if required',
          'Advice on what to watch for at home',
          'A referral if specialist or hospital care is needed',
        ],
      },
      {
        heading: 'Everything is recorded',
        body: [
          'With Anees, the visit is documented in the patient’s medical record — so the next clinician sees what was done, and care builds visit over visit instead of starting from scratch.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How long does a doctor home visit take?',
        answer:
          'Usually longer and calmer than a clinic appointment — the doctor takes a full history and examines the patient without a waiting-room queue. Plan for unhurried time rather than a rushed slot.',
      },
      {
        question: 'What should I prepare for a doctor home visit?',
        answer:
          'Have the patient’s medication list, any recent test results or reports, and a note of the main symptoms ready. A quiet, well-lit room makes the examination easier.',
      },
    ],
  },
  {
    slug: 'medical-record-changes-home-care',
    title: 'How a Real Medical Record Changes Home Care for Your Family',
    description:
      'Most home care in Egypt forgets you between visits. Here’s why a real, shared medical record is the difference between a series of visits and managed care.',
    intro:
      'Ask most home-care agencies what happened on the last visit and you will get a shrug. The single biggest difference in quality is whether your family’s care is remembered — written down, shared, and built upon. Here is why that matters.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'The problem with one-off visits',
        body: [
          'When every visit starts from zero — a new nurse, no notes, no history — small things slip. A medication change is missed, a wound’s progress is not tracked, and the family repeats the same story to every clinician. Care stalls instead of improving.',
        ],
      },
      {
        heading: 'What a real medical record does',
        body: ['A shared clinical record changes the whole experience:'],
        bullets: [
          'Every visit, vital sign, and medication is recorded and visible to the whole care team',
          'The next clinician sees exactly what happened before',
          'Trends — blood pressure, glucose, wound healing — are tracked over time',
          'The family is no longer the only memory of the care',
        ],
      },
      {
        heading: 'Continuity is the real value',
        body: [
          'For an elderly, post-operative, or chronic patient, continuity matters more than almost anything. A shared record turns a series of disconnected visits into a managed course of care that actually improves over time.',
        ],
      },
      {
        heading: 'How Anees does it',
        body: [
          'Every Anees visit is recorded in a real, hospital-grade electronic medical record. One coordinator owns the case, the clinical team works from the same history, and the family can see the care. It is, simply, the home care that remembers.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Why does a medical record matter for home care?',
        answer:
          'Because it gives continuity: the next clinician sees what was done before, trends are tracked, and care builds over time instead of restarting each visit. It is the difference between disconnected visits and managed care.',
      },
      {
        question: 'Does Anees keep a medical record for home patients?',
        answer:
          'Yes. Every visit is documented in a real hospital-grade electronic medical record, shared across the care team and coordinated by one person, so care stays consistent over time.',
      },
    ],
  },
  {
    slug: 'protecting-elderly-summer-heat-egypt',
    title: 'Protecting Elderly Parents During Egypt’s Summer Heat',
    description:
      'Egypt’s summer heat is a real risk for older adults. Practical steps to keep an elderly parent safe from dehydration and heat illness — and the warning signs.',
    intro:
      'Older bodies handle heat less well — they feel thirst less, lose fluid faster, and many take medicines that affect hydration. In Egypt’s summer, that makes heat a genuine risk for elderly parents. Here is how to keep them safe.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Why heat is riskier for older adults',
        body: [
          'With age, the body’s thirst signal weakens and it regulates temperature less efficiently. Common medications — for blood pressure, the heart, or diuretics — can increase fluid loss, and chronic conditions add to the risk. An older parent can become dehydrated before they ever feel thirsty.',
        ],
      },
      {
        heading: 'Practical steps to stay safe',
        body: ['A few simple habits prevent most summer problems:'],
        bullets: [
          'Encourage small, frequent drinks even without thirst',
          'Keep the home cool and shaded, especially at midday',
          'Dress in light, loose clothing',
          'Avoid outings in peak heat (roughly 11am–4pm)',
          'Store medicines correctly in the heat',
          'Check in daily — in person or by phone',
        ],
      },
      {
        heading: 'Warning signs of heat illness',
        body: [
          'Act quickly for confusion or unusual drowsiness, dizziness, a headache, very little or dark urine, a rapid pulse, or hot dry skin. Move the person somewhere cool, give fluids, and seek medical advice. Collapse, fainting, or a very high temperature is an emergency — call for help.',
        ],
      },
      {
        heading: 'How Anees helps in summer',
        body: [
          'Anees can arrange a nurse to monitor hydration and vital signs, a doctor home visit if a parent becomes unwell, and IV fluids at home when a doctor judges they are needed — so heat-related problems are caught and treated early.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How can I prevent dehydration in an elderly parent in summer?',
        answer:
          'Offer small, frequent drinks even when they do not feel thirsty, keep the home cool, dress them in light clothing, avoid the midday heat, and check in daily. Watch for dark urine and confusion as early warning signs.',
      },
      {
        question: 'When is heat illness an emergency in an older adult?',
        answer:
          'Confusion, fainting, hot dry skin, or a very high temperature needs urgent help — call an ambulance. For milder signs (dizziness, headache, dark urine), move them somewhere cool, give fluids, and get medical advice.',
      },
    ],
  },
];

const AR: BlogPost[] = [
  {
    slug: 'signs-elderly-parent-needs-home-care',
    title: 'علامات تدل على أن والدك المسن قد يحتاج رعاية منزلية',
    description:
      'غير متأكد إن كان الوقت قد حان؟ العلامات العملية التي تدل على أن أحد الوالدين المسنين قد يحتاج رعاية منزلية في مصر — وما الخطوة التالية.',
    intro:
      'نادراً ما يحدث ذلك فجأة. فعلامات حاجة أحد الوالدين المتقدّمين في السن لمزيد من الدعم تتراكم ببطء عادةً — دواء فائت هنا، سقطة صغيرة هناك. ومعرفة ما تبحث عنه يساعدك على التحرك قبل وقوع أزمة. إليك العلامات العملية التي تنتبه لها.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'تغيّرات في الحياة اليومية',
        body: ['غالباً ما تظهر أولى العلامات في المهام اليومية:'],
        bullets: [
          'صعوبة في الاستحمام أو اللبس أو تحضير الطعام',
          'فقدان وزن أو تخطّي وجبات أو ثلاجة مليئة بطعام منتهي الصلاحية',
          'ارتداء الملابس نفسها أو إهمال النظافة الشخصية',
          'منزل كان مرتباً يصبح صعب الإدارة',
        ],
      },
      {
        heading: 'علامات صحية وعلامات سلامة',
        body: ['هذه تشير إلى الحاجة لدعم طبي:'],
        bullets: [
          'أدوية فائتة أو مختلطة أو مكرّرة',
          'سقطات جديدة أو متكررة، أو كدمات غير مبرّرة',
          'نسيان المواعيد أو المحادثات الأخيرة',
          'مرض مزمن يخرج عن السيطرة',
        ],
      },
      {
        heading: 'علامات نفسية واجتماعية',
        body: ['العافية لا تقل أهمية عن الصحة الجسدية:'],
        bullets: [
          'الانسحاب من الأصدقاء والأسرة والأنشطة',
          'مزاج منخفض أو قلق أو فقدان اهتمام',
          'تشوّش بشأن الوقت أو المكان أو الأشخاص المألوفين',
          'إحجام عن مغادرة المنزل',
        ],
      },
      {
        heading: 'ما الخطوة التالية',
        body: [
          'إذا انطبق عدد من هذه العلامات، ابدأ بحوار صادق ومراجعة طبية — فكثير من المشكلات قابل للعلاج. ثم قرّر مستوى الدعم المناسب: زيارات متقطّعة، أو تمريض منتظم، أو خطة رعاية منسّقة. تستطيع أنيس تقييم الاحتياجات وتنسيق التمريض المنزلي وزيارات الطبيب والعلاج الطبيعي تحت منسق واحد في القاهرة الكبرى.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كيف أعرف أن والدي المسن يحتاج مساعدة في المنزل؟',
        answer:
          'ابحث عن تغيّرات في الحياة اليومية (الاستحمام، الأكل، ترتيب المنزل)، وعلامات صحية وعلامات سلامة (دواء فائت، سقطات)، وعلامات نفسية (انسحاب، تشوّش). ووجود عدد منها معاً يعني غالباً أن الوقت قد حان لترتيب الدعم.',
      },
      {
        question: 'ما أنواع الرعاية المنزلية المتاحة لكبار السن في مصر؟',
        answer:
          'كل شيء من زيارات ممرض متقطّعة إلى تمريض منتظم وزيارات أطباء منزلية وعلاج طبيعي ورعاية مستمرة منسّقة. تنسّق أنيس هذه الخدمات تحت منسق رعاية واحد في القاهرة الكبرى.',
      },
    ],
  },
  {
    slug: 'what-to-expect-doctor-home-visit',
    title: 'ماذا تتوقع خلال زيارة الطبيب المنزلية',
    description:
      'حجزت زيارة طبيب منزلية ولست متأكداً مما سيحدث؟ شرح خطوة بخطوة لما تتوقعه خلال الزيارة نفسها — وكيف تجعلها تمضي بسلاسة.',
    intro:
      'ينبغي أن تكون الزيارة المنزلية هادئة وغير متعجّلة — وهذا جزء من جوهرها. وإن لم يسبق أن جاءك طبيب إلى البيت، إليك بالضبط ما تتوقعه من لحظة وصوله.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'الوصول والتحقق من الهوية',
        body: [
          'يصل طبيب مرخّص في الموعد المتفق عليه. ومع أنيس، يؤكّد الكادر هويته وهوية المريض، فتعرف دائماً من يعالج أسرتك بالضبط.',
        ],
      },
      {
        heading: 'التاريخ المرضي والفحص',
        body: [
          'يسأل الطبيب عن الأعراض والتاريخ المرضي والأدوية الحالية، ثم يفحص المريض دون عجلة — وهو ما لا تتيحه عادةً عيادة مزدحمة. وتجهيز أي نتائج تحاليل حديثة وقائمة بالأدوية يجعل ذلك أسرع وأكثر أماناً.',
        ],
      },
      {
        heading: 'التشخيص والعلاج والخطوات التالية',
        body: ['بنهاية الزيارة ينبغي أن يكون لديك:'],
        bullets: [
          'شرح واضح للتشخيص',
          'وصفة دواء إن لزمت',
          'ترتيب تحاليل أو أشعة منزلية عند الحاجة',
          'نصيحة بما تنتبه له في المنزل',
          'إحالة إذا لزمت رعاية تخصصية أو مستشفى',
        ],
      },
      {
        heading: 'كل شيء يُسجَّل',
        body: [
          'مع أنيس، تُوثَّق الزيارة في الملف الطبي للمريض — فيرى الكادر التالي ما تم، وتتراكم الرعاية زيارة بعد زيارة بدلاً من البدء من الصفر.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم تستغرق زيارة الطبيب المنزلية؟',
        answer:
          'عادةً أطول وأهدأ من موعد العيادة — يأخذ الطبيب تاريخاً كاملاً ويفحص المريض دون طابور انتظار. خطّط لوقت غير متعجّل لا لموعد سريع.',
      },
      {
        question: 'ماذا أجهّز لزيارة الطبيب المنزلية؟',
        answer:
          'جهّز قائمة أدوية المريض وأي نتائج تحاليل أو تقارير حديثة وملاحظة بالأعراض الرئيسية. وغرفة هادئة جيدة الإضاءة تسهّل الفحص.',
      },
    ],
  },
  {
    slug: 'medical-record-changes-home-care',
    title: 'كيف يغيّر الملف الطبي الحقيقي الرعاية المنزلية لأسرتك',
    description:
      'معظم الرعاية المنزلية في مصر تنساك بين الزيارات. إليك لماذا يكون الملف الطبي الحقيقي المشترك هو الفارق بين سلسلة زيارات ورعاية مُدارة.',
    intro:
      'اسأل معظم شركات الرعاية المنزلية عمّا حدث في الزيارة الأخيرة فلن تجد إجابة. والفارق الأكبر في الجودة هو ما إذا كانت رعاية أسرتك مُتذكَّرة — مكتوبة ومشتركة ومبنياً عليها. إليك لماذا يهم ذلك.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'مشكلة الزيارات المنفردة',
        body: [
          'عندما تبدأ كل زيارة من الصفر — ممرض جديد، بلا ملاحظات، بلا تاريخ — تفلت أمور صغيرة. يُفوَّت تغيير دواء، ولا يُتابَع تقدّم جرح، وتكرّر الأسرة القصة نفسها لكل كادر. وتتعثّر الرعاية بدلاً من أن تتحسّن.',
        ],
      },
      {
        heading: 'ماذا يفعل الملف الطبي الحقيقي',
        body: ['السجل الإكلينيكي المشترك يغيّر التجربة كلها:'],
        bullets: [
          'تُسجَّل كل زيارة وعلامة حيوية ودواء وتكون مرئية لفريق الرعاية كله',
          'يرى الكادر التالي ما حدث قبله بالضبط',
          'تُتابَع الاتجاهات — ضغط الدم، السكر، التئام الجروح — عبر الوقت',
          'لم تعد الأسرة هي الذاكرة الوحيدة للرعاية',
        ],
      },
      {
        heading: 'الاستمرارية هي القيمة الحقيقية',
        body: [
          'لمريض مسن أو بعد عملية أو مزمن، تهم الاستمرارية أكثر من أي شيء تقريباً. والسجل المشترك يحوّل سلسلة زيارات منفصلة إلى مسار رعاية مُدار يتحسّن فعلاً مع الوقت.',
        ],
      },
      {
        heading: 'كيف تفعلها أنيس',
        body: [
          'كل زيارة من أنيس تُسجَّل في ملف طبي إلكتروني حقيقي بمستوى المستشفيات. ومنسق واحد يدير الحالة، ويعمل الفريق الإكلينيكي من التاريخ نفسه، وتستطيع الأسرة الاطلاع على الرعاية. إنها ببساطة الرعاية المنزلية التي تتذكّر.',
        ],
      },
    ],
    faqs: [
      {
        question: 'لماذا يهم الملف الطبي في الرعاية المنزلية؟',
        answer:
          'لأنه يمنح الاستمرارية: يرى الكادر التالي ما تم قبله، وتُتابَع الاتجاهات، وتتراكم الرعاية بدلاً من إعادة البدء كل زيارة. إنه الفارق بين زيارات منفصلة ورعاية مُدارة.',
      },
      {
        question: 'هل تحتفظ أنيس بملف طبي لمرضى المنزل؟',
        answer:
          'نعم. تُوثَّق كل زيارة في ملف طبي إلكتروني حقيقي بمستوى المستشفيات، مشترك عبر فريق الرعاية ومنسَّق من شخص واحد، لتبقى الرعاية متسقة عبر الوقت.',
      },
    ],
  },
  {
    slug: 'protecting-elderly-summer-heat-egypt',
    title: 'حماية الوالدين المسنين خلال حرّ الصيف في مصر',
    description:
      'حرّ الصيف في مصر خطر حقيقي على كبار السن. خطوات عملية للحفاظ على أحد الوالدين المسنين من الجفاف وأمراض الحرارة — والعلامات التحذيرية.',
    intro:
      'تتعامل الأجسام الأكبر سناً مع الحرارة بصورة أقل كفاءة — تشعر بالعطش أقل، وتفقد السوائل أسرع، ويتناول كثيرون أدوية تؤثر في الترطيب. وفي صيف مصر، يجعل ذلك الحرارة خطراً حقيقياً على الوالدين المسنين. إليك كيف تحافظ على سلامتهم.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'لماذا تكون الحرارة أخطر على كبار السن',
        body: [
          'مع التقدّم في العمر تضعف إشارة العطش في الجسم وينظّم حرارته بكفاءة أقل. والأدوية الشائعة — للضغط أو القلب أو مدرّات البول — قد تزيد فقدان السوائل، والأمراض المزمنة ترفع الخطر. وقد يُصاب الوالد المسن بالجفاف قبل أن يشعر بالعطش أصلاً.',
        ],
      },
      {
        heading: 'خطوات عملية للسلامة',
        body: ['بضع عادات بسيطة تمنع معظم مشكلات الصيف:'],
        bullets: [
          'شجّع على شرب كميات صغيرة متكررة حتى دون عطش',
          'حافظ على المنزل بارداً ومظلّلاً، خاصة وقت الظهيرة',
          'ألبسه ملابس خفيفة فضفاضة',
          'تجنّب الخروج في ذروة الحر (نحو 11 صباحاً–4 عصراً)',
          'احفظ الأدوية بشكل صحيح في الحر',
          'اطمئن عليه يومياً — شخصياً أو هاتفياً',
        ],
      },
      {
        heading: 'علامات تحذيرية لأمراض الحرارة',
        body: [
          'تحرّك بسرعة عند التشوّش أو النعاس غير المعتاد أو الدوخة أو الصداع أو قلة البول أو لونه الداكن أو تسارع النبض أو جفاف الجلد وسخونته. انقل الشخص إلى مكان بارد، وأعطه سوائل، واطلب المشورة الطبية. أما الإغماء أو السقوط أو الحرارة المرتفعة جداً فهي طوارئ — اطلب المساعدة.',
        ],
      },
      {
        heading: 'كيف تساعد أنيس في الصيف',
        body: [
          'تستطيع أنيس ترتيب ممرض لمتابعة الترطيب والعلامات الحيوية، وزيارة طبيب منزلية إذا تعكّرت حالة أحد الوالدين، ومحاليل وريدية في المنزل عندما يرى الطبيب الحاجة إليها — لتُكتشف مشكلات الحرارة وتُعالَج مبكراً.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كيف أقي والدي المسن من الجفاف في الصيف؟',
        answer:
          'قدّم كميات صغيرة متكررة من السوائل حتى دون شعوره بالعطش، وحافظ على المنزل بارداً، وألبسه ملابس خفيفة، وتجنّب حرّ الظهيرة، واطمئن عليه يومياً. وراقب البول الداكن والتشوّش كعلامات إنذار مبكرة.',
      },
      {
        question: 'متى يكون مرض الحرارة حالة طارئة لدى كبير السن؟',
        answer:
          'التشوّش أو الإغماء أو جفاف الجلد وسخونته أو الحرارة المرتفعة جداً يحتاج مساعدة عاجلة — اطلب إسعافاً. أما العلامات الأخف (دوخة، صداع، بول داكن) فانقله إلى مكان بارد، وأعطه سوائل، واطلب المشورة الطبية.',
      },
    ],
  },
];

const BLOG: Record<SupportedLocale, BlogPost[]> = { en: EN, ar: AR };

export function getAllBlogSlugs(): string[] {
  return EN.map((p) => p.slug);
}

export function getBlogPost(locale: SupportedLocale, slug: string): BlogPost | null {
  return BLOG[locale].find((p) => p.slug === slug) ?? null;
}

/** All posts for a locale, newest first (stable: by datePublished desc). */
export function getAllBlogPosts(locale: SupportedLocale): BlogPost[] {
  return [...BLOG[locale]].sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));
}
