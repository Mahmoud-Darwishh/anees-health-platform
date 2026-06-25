/**
 * Home-healthcare glossary — short, definitional pages that win "what is X"
 * / "ما معنى X" queries and are classic AI-citation bait. Structured bilingual
 * data; renders via /[locale]/glossary/[slug] with DefinedTerm schema.
 */
import type { SupportedLocale } from './site';

export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  whenYouNeed: string;
  /** Optional link to the matching /services/[slug] page. */
  related?: { slug: string; label: string };
}

const EN: GlossaryTerm[] = [
  {
    slug: 'home-healthcare',
    term: 'Home healthcare',
    definition:
      'Home healthcare is the delivery of clinical care — by licensed doctors, nurses, and physiotherapists — in the patient’s own home instead of a clinic or hospital. It ranges from a single doctor visit to ongoing nursing, rehabilitation, and chronic-disease management.',
    whenYouNeed:
      'When a patient finds travel difficult, needs ongoing care, or simply prefers to recover at home — especially elderly, post-operative, and chronic-care patients.',
  },
  {
    slug: 'home-nursing',
    term: 'Home nursing',
    definition:
      'Home nursing is skilled nursing care delivered at the patient’s home by a licensed nurse — including wound care, injections, IV therapy, catheter and feeding-tube care, vitals monitoring, and medication management.',
    whenYouNeed: 'After surgery, for chronic or bedbound patients, or as part of elderly care at home.',
    related: { slug: 'home-nursing', label: 'Home nursing' },
  },
  {
    slug: 'home-physiotherapy',
    term: 'Home physiotherapy',
    definition:
      'Home physiotherapy is physical rehabilitation delivered at home by a licensed physiotherapist to restore movement, strength, and function — commonly used after a stroke, surgery, or fracture, and for mobility and balance problems.',
    whenYouNeed: 'After a stroke or operation, or for orthopedic and mobility rehabilitation.',
    related: { slug: 'physiotherapy-at-home', label: 'Home physiotherapy' },
  },
  {
    slug: 'geriatric-care',
    term: 'Geriatric care',
    definition:
      'Geriatric care is specialized medical and supportive care for older adults, addressing the combination of chronic conditions, mobility, medication, and daily-living needs that come with age.',
    whenYouNeed: 'For an elderly parent who needs ongoing support, chronic-disease follow-up, or help with daily activities.',
    related: { slug: 'elderly-care-at-home', label: 'Elderly care at home' },
  },
  {
    slug: 'palliative-care',
    term: 'Palliative care',
    definition:
      'Palliative care is specialized care focused on relieving the symptoms, pain, and stress of a serious or chronic illness — improving quality of life for the patient and family, alongside or independent of curative treatment.',
    whenYouNeed: 'For patients with advanced chronic, cardiac, respiratory, or oncological illness.',
    related: { slug: 'palliative-chronic-care', label: 'Palliative & chronic-disease care' },
  },
  {
    slug: 'post-operative-care',
    term: 'Post-operative care',
    definition:
      'Post-operative care is the support a patient needs after surgery — wound and drain care, pain and medication management, nursing, and physiotherapy — to recover safely and prevent complications.',
    whenYouNeed: 'In the days and weeks after an operation, especially major or abdominal surgery.',
    related: { slug: 'post-operative-care', label: 'Post-operative care' },
  },
  {
    slug: 'wound-care',
    term: 'Wound care',
    definition:
      'Wound care is the cleaning, dressing, and monitoring of a wound — surgical, pressure (bedsore), or diabetic — to promote healing and prevent infection. A nurse changes dressings using sterile technique and watches for warning signs.',
    whenYouNeed: 'After surgery, for pressure sores, or for diabetic and slow-healing wounds.',
    related: { slug: 'home-nursing', label: 'Home nursing' },
  },
  {
    slug: 'iv-therapy',
    term: 'IV therapy',
    definition:
      'IV (intravenous) therapy is the delivery of fluids, medication, or nutrition directly into a vein. At home, a licensed nurse inserts and manages the cannula and monitors the infusion safely.',
    whenYouNeed: 'For hydration, antibiotics, or other medication that must be given intravenously.',
    related: { slug: 'home-nursing', label: 'Home nursing' },
  },
  {
    slug: 'chronic-disease-management',
    term: 'Chronic disease management',
    definition:
      'Chronic disease management is the ongoing care of long-term conditions — such as diabetes, hypertension, and heart or respiratory disease — through regular monitoring, medication management, and doctor follow-up to keep the condition stable.',
    whenYouNeed: 'For any long-term condition that needs regular monitoring and follow-up.',
    related: { slug: 'palliative-chronic-care', label: 'Palliative & chronic-disease care' },
  },
  {
    slug: 'vital-signs',
    term: 'Vital signs',
    definition:
      'Vital signs are the basic measurements of body function — blood pressure, heart rate, temperature, breathing rate, and oxygen level — used to monitor a patient’s health and catch problems early.',
    whenYouNeed: 'During home nursing visits and for ongoing monitoring of chronic or recovering patients.',
    related: { slug: 'home-nursing', label: 'Home nursing' },
  },
];

const AR: GlossaryTerm[] = [
  {
    slug: 'home-healthcare',
    term: 'الرعاية الصحية المنزلية',
    definition:
      'الرعاية الصحية المنزلية هي تقديم الرعاية الإكلينيكية — عبر أطباء وممرضين وأخصائيي علاج طبيعي مرخّصين — في منزل المريض بدلاً من العيادة أو المستشفى. وتتراوح من زيارة طبيب واحدة إلى تمريض وتأهيل وإدارة أمراض مزمنة مستمرة.',
    whenYouNeed:
      'عندما يصعب على المريض الانتقال، أو يحتاج رعاية مستمرة، أو يفضّل التعافي في المنزل — خاصة كبار السن ومرضى ما بعد العمليات والحالات المزمنة.',
  },
  {
    slug: 'home-nursing',
    term: 'التمريض المنزلي',
    definition:
      'التمريض المنزلي هو رعاية تمريضية متخصصة تُقدَّم في منزل المريض على يد ممرض مرخّص — تشمل العناية بالجروح والحقن والمحاليل الوريدية والقساطر وأنابيب التغذية ومتابعة العلامات الحيوية وإدارة الأدوية.',
    whenYouNeed: 'بعد العمليات، أو للحالات المزمنة وملازمي الفراش، أو ضمن رعاية المسنين في المنزل.',
    related: { slug: 'home-nursing', label: 'التمريض المنزلي' },
  },
  {
    slug: 'home-physiotherapy',
    term: 'العلاج الطبيعي المنزلي',
    definition:
      'العلاج الطبيعي المنزلي هو تأهيل بدني يُقدَّم في المنزل على يد أخصائي مرخّص لاستعادة الحركة والقوة والوظيفة — يُستخدم عادةً بعد الجلطة أو العملية أو الكسور، ولمشكلات الحركة والتوازن.',
    whenYouNeed: 'بعد الجلطة أو العملية، أو لتأهيل العظام واستعادة الحركة.',
    related: { slug: 'physiotherapy-at-home', label: 'العلاج الطبيعي المنزلي' },
  },
  {
    slug: 'geriatric-care',
    term: 'رعاية المسنين',
    definition:
      'رعاية المسنين هي رعاية طبية وداعمة متخصصة لكبار السن، تتعامل مع تداخل الأمراض المزمنة والحركة والأدوية واحتياجات الحياة اليومية المصاحبة للتقدّم في العمر.',
    whenYouNeed: 'لأحد الوالدين المسنين الذي يحتاج دعماً مستمراً أو متابعة لمرض مزمن أو مساعدة في الأنشطة اليومية.',
    related: { slug: 'elderly-care-at-home', label: 'رعاية المسنين في المنزل' },
  },
  {
    slug: 'palliative-care',
    term: 'الرعاية التلطيفية',
    definition:
      'الرعاية التلطيفية هي رعاية متخصصة تركّز على تخفيف الأعراض والألم والإجهاد المصاحب لمرض خطير أو مزمن — لتحسين جودة حياة المريض والأسرة، إلى جانب العلاج الشافي أو بشكل مستقل عنه.',
    whenYouNeed: 'لمرضى الأمراض المزمنة أو القلبية أو التنفسية أو الأورام المتقدمة.',
    related: { slug: 'palliative-chronic-care', label: 'الرعاية التلطيفية والأمراض المزمنة' },
  },
  {
    slug: 'post-operative-care',
    term: 'الرعاية بعد العمليات',
    definition:
      'الرعاية بعد العمليات هي الدعم الذي يحتاجه المريض بعد الجراحة — العناية بالجروح والأنابيب، وإدارة الألم والأدوية، والتمريض، والعلاج الطبيعي — للتعافي بأمان ومنع المضاعفات.',
    whenYouNeed: 'في الأيام والأسابيع التي تلي العملية، خاصة الجراحات الكبرى أو جراحات البطن.',
    related: { slug: 'post-operative-care', label: 'الرعاية بعد العمليات' },
  },
  {
    slug: 'wound-care',
    term: 'العناية بالجروح',
    definition:
      'العناية بالجروح هي تنظيف الجرح وتضميده ومتابعته — جراحياً كان أو قرحة فراش أو سكري — لتعزيز الالتئام ومنع العدوى. يغيّر الممرض الضمادات بتقنية معقّمة ويراقب العلامات التحذيرية.',
    whenYouNeed: 'بعد الجراحة، أو لقرح الفراش، أو للجروح السكرية وبطيئة الالتئام.',
    related: { slug: 'home-nursing', label: 'التمريض المنزلي' },
  },
  {
    slug: 'iv-therapy',
    term: 'العلاج الوريدي (المحاليل)',
    definition:
      'العلاج الوريدي هو إيصال السوائل أو الأدوية أو التغذية مباشرة إلى الوريد. وفي المنزل، يقوم ممرض مرخّص بتركيب الكانيولا وإدارتها ومراقبة التسريب بأمان.',
    whenYouNeed: 'للترطيب أو المضادات الحيوية أو أي دواء يُعطى عبر الوريد.',
    related: { slug: 'home-nursing', label: 'التمريض المنزلي' },
  },
  {
    slug: 'chronic-disease-management',
    term: 'إدارة الأمراض المزمنة',
    definition:
      'إدارة الأمراض المزمنة هي الرعاية المستمرة للحالات طويلة الأمد — مثل السكري وضغط الدم وأمراض القلب أو الجهاز التنفسي — عبر المتابعة المنتظمة وإدارة الأدوية ومتابعة الطبيب للحفاظ على استقرار الحالة.',
    whenYouNeed: 'لأي حالة طويلة الأمد تحتاج متابعة ومراقبة منتظمة.',
    related: { slug: 'palliative-chronic-care', label: 'الرعاية التلطيفية والأمراض المزمنة' },
  },
  {
    slug: 'vital-signs',
    term: 'العلامات الحيوية',
    definition:
      'العلامات الحيوية هي القياسات الأساسية لوظائف الجسم — ضغط الدم ومعدل النبض ودرجة الحرارة ومعدل التنفس ونسبة الأكسجين — وتُستخدم لمتابعة صحة المريض واكتشاف المشكلات مبكراً.',
    whenYouNeed: 'أثناء زيارات التمريض المنزلي ولمتابعة المرضى المزمنين أو المتعافين.',
    related: { slug: 'home-nursing', label: 'التمريض المنزلي' },
  },
];

const GLOSSARY: Record<SupportedLocale, GlossaryTerm[]> = { en: EN, ar: AR };

export function getAllGlossarySlugs(): string[] {
  return EN.map((t) => t.slug);
}

export function getGlossaryTerm(locale: SupportedLocale, slug: string): GlossaryTerm | null {
  return GLOSSARY[locale].find((t) => t.slug === slug) ?? null;
}

export function getAllGlossaryTerms(locale: SupportedLocale): GlossaryTerm[] {
  return GLOSSARY[locale];
}
