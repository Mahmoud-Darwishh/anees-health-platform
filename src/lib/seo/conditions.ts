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
          'Stroke-rehabilitation research summarised by the US National Institutes of Health finds that most spontaneous recovery occurs in the first three to six months after a stroke, when the brain is most adaptable — so starting rehabilitation early and keeping it consistent matters most. Progress is gradual and varies by stroke severity; a structured plan with measurable goals keeps it on track.',
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
          'A surgical wound is most vulnerable in the first two weeks. The World Health Organization reports that surgical-site infections are the most frequent healthcare-associated infection in low- and middle-income countries, affecting roughly 11 of every 100 surgical patients — yet most are preventable. Clean, correctly-timed dressing changes and early detection of infection are what keep healing on track and avoid complications that could mean re-admission.',
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
          'Diabetes can reduce sensation and blood flow in the feet, so a small cut or blister may go unnoticed and become infected. The International Diabetes Federation and international diabetic-foot research estimate that up to a third of people with diabetes develop a foot ulcer in their lifetime, and that a lower limb is lost to diabetes somewhere in the world roughly every 30 seconds — yet consistent foot care is the single most effective way to prevent these complications and protect mobility.',
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
          'The World Health Organization identifies falls as the second leading cause of unintentional-injury death worldwide, with adults over 60 suffering the greatest number. A single fall can cause a fracture that ends independence, and the fear of falling often leads to less movement — which weakens muscles and raises the risk further. Preventing the first fall is far easier than recovering from one.',
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
  {
    slug: 'dementia-care-at-home',
    name: 'Dementia & Alzheimer’s Care at Home in Egypt',
    description:
      'Caring for a parent with dementia or Alzheimer’s at home in Egypt — daily routine, home safety, managing behaviour, and how home nursing and one coordinator support the family.',
    intro:
      'A dementia diagnosis changes a whole family’s life. With the right routine, a safe home, and trained support, many people with dementia can stay at home — where they are calmest — for far longer. This guide explains what home dementia care involves in Egypt.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Why home is often best for dementia',
        body: [
          'The World Health Organization reports that more than 55 million people live with dementia worldwide — over 60% of them in low- and middle-income countries — and that it is one of the leading causes of dependency among older people. Familiar surroundings reduce confusion and agitation, so keeping a person with dementia at home, with a steady routine, is often the kindest and safest option.',
        ],
      },
      {
        heading: 'What home dementia care includes',
        body: ['Good home dementia care combines routine, safety, and trained support:'],
        bullets: [
          'A predictable daily routine that reduces confusion',
          'Medication management and reminders',
          'Help with washing, dressing, and eating',
          'Calm management of agitation and difficult behaviour',
          'Safety adaptations around the home',
          'Support and respite for the family carer',
        ],
      },
      {
        heading: 'Keeping the home safe',
        body: ['Small changes prevent the most common dementia-related accidents:'],
        bullets: [
          'Remove trip hazards and secure loose rugs',
          'Good lighting, day and night',
          'Lock away medicines, cleaning products, and sharp items',
          'Consider door alarms if wandering is a risk',
          'Keep a familiar layout and label key rooms',
        ],
      },
      {
        heading: 'How Anees supports dementia care at home',
        body: [
          'Anees provides nurses for medication and personal care, a doctor to review and adjust treatment, and one coordinator who supports the family and keeps a record — so care stays consistent as the condition changes over time.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can someone with dementia be cared for at home?',
        answer:
          'Yes. With a steady routine, a safe home, and trained support, many people with dementia can be cared for at home, where familiar surroundings reduce confusion and agitation. Anees coordinates home nursing and doctor follow-up across Greater Cairo.',
      },
      {
        question: 'How do I keep a parent with dementia safe at home?',
        answer:
          'Remove trip hazards, ensure good lighting, lock away medicines and sharp items, consider door alarms if there is a risk of wandering, and keep a steady daily routine. A home nurse can help set this up.',
      },
    ],
    related: [
      { slug: 'elderly-care-at-home', label: 'Elderly care' },
      { slug: 'home-nursing', label: 'Home nursing' },
    ],
  },
  {
    slug: 'pressure-ulcer-care-at-home',
    name: 'Bedsore (Pressure Ulcer) Care at Home in Egypt',
    description:
      'Preventing and treating bedsores (pressure ulcers) at home in Egypt for bedridden and immobile patients — repositioning, skin care, warning signs, and licensed home nursing with Anees.',
    intro:
      'For a bedridden or immobile patient, pressure ulcers — “bedsores” — are one of the most common and most preventable complications. This guide explains how to prevent them at home and how a home nurse treats them early, before they become serious.',
    aspect: 'Prevention',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Why pressure ulcers matter',
        body: [
          'Pressure ulcers form where sustained pressure cuts off blood flow to the skin — most often over the hips, heels, and tailbone of someone who cannot move freely. International pressure-injury guidelines (EPUAP/NPIAP) recommend repositioning an at-risk patient at least every two hours, because tissue damage can begin within hours — and they stress that most pressure ulcers are preventable with consistent care.',
        ],
      },
      {
        heading: 'How to prevent bedsores at home',
        body: ['A simple, consistent routine prevents most pressure ulcers:'],
        bullets: [
          'Reposition the patient at least every two hours',
          'Keep skin clean and dry; change damp bedding promptly',
          'Use a pressure-relieving mattress or cushion',
          'Inspect the skin daily over bony areas',
          'Keep the patient hydrated and well-nourished',
        ],
      },
      {
        heading: 'Warning signs to act on',
        body: ['Contact a nurse early if you notice:'],
        bullets: [
          'A reddened area that does not fade when pressed',
          'Broken skin, a blister, or an open wound',
          'Skin that is warmer, cooler, or firmer than the area around it',
          'Pain over a pressure point',
        ],
      },
      {
        heading: 'How Anees prevents and treats bedsores',
        body: [
          'Anees nurses set up a repositioning and skin-care routine, treat early-stage sores with the correct dressings, and escalate to a doctor for advanced wounds — with every visit recorded so the wound’s progress is tracked.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How often should a bedridden patient be repositioned?',
        answer:
          'At least every two hours. International pressure-injury guidelines recommend this because tissue damage can begin within hours of sustained pressure. Anees nurses set up and follow a repositioning and skin-care routine across Greater Cairo.',
      },
      {
        question: 'Can bedsores be treated at home?',
        answer:
          'Early-stage pressure ulcers can be treated at home by a licensed nurse with repositioning, skin care, and proper dressings. Advanced wounds need a doctor review, which Anees coordinates.',
      },
    ],
    related: [
      { slug: 'home-nursing', label: 'Home nursing' },
      { slug: 'post-operative-care', label: 'Post-operative care' },
    ],
  },
  {
    slug: 'copd-respiratory-care-at-home',
    name: 'COPD & Respiratory Care at Home in Egypt',
    description:
      'Managing COPD and chronic respiratory illness at home in Egypt — breathing support, medication and inhaler technique, oxygen, warning signs, and home nursing plus doctor follow-up with Anees.',
    intro:
      'For someone living with COPD or another chronic lung condition, good day-to-day management at home prevents flare-ups and hospital admissions. This guide explains what home respiratory care involves in Egypt.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Why home management matters in COPD',
        body: [
          'The World Health Organization ranks COPD as the third leading cause of death worldwide, with nearly 90% of COPD deaths in people under 70 occurring in low- and middle-income countries. Steady home management — the right medication, correct inhaler technique, and early action on symptoms — is what keeps a chronic lung condition stable and out of hospital.',
        ],
      },
      {
        heading: 'What home respiratory care includes',
        body: ['A home respiratory plan usually combines:'],
        bullets: [
          'Medication, inhaler, and nebulizer support, with a technique check',
          'Oxygen therapy where it is prescribed',
          'Monitoring of breathing, oxygen saturation, and symptoms',
          'Breathing exercises and chest physiotherapy',
          'A clear action plan for flare-ups',
        ],
      },
      {
        heading: 'Warning signs of a flare-up',
        body: ['Seek help promptly — and urgently for the last two — if you notice:'],
        bullets: [
          'More breathlessness than usual',
          'A change in the colour or amount of phlegm, or fever',
          'Confusion or unusual drowsiness',
          'Lips or fingertips turning blue',
        ],
      },
      {
        heading: 'How Anees supports respiratory care at home',
        body: [
          'Anees provides nurses for monitoring, medication, and nebulizer or oxygen support, a doctor to adjust the treatment plan, and one coordinator keeping a record — so a flare-up is caught and treated early.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can COPD be managed at home?',
        answer:
          'Yes. Most day-to-day COPD care — medication, inhaler and nebulizer use, oxygen, and monitoring — happens at home. Anees provides home nursing and doctor follow-up across Greater Cairo, and escalates flare-ups quickly.',
      },
      {
        question: 'When is breathlessness an emergency?',
        answer:
          'Severe or sudden breathlessness, blue lips or fingertips, confusion, or drowsiness need urgent help — call an ambulance. For non-emergency worsening, Anees can arrange an urgent doctor review.',
      },
    ],
    related: [
      { slug: 'doctor-at-home', label: 'Doctor home visit' },
      { slug: 'home-nursing', label: 'Home nursing' },
    ],
  },
  {
    slug: 'hypertension-care-at-home',
    name: 'High Blood Pressure (Hypertension) Care at Home in Egypt',
    description:
      'Managing high blood pressure at home in Egypt — accurate monitoring, medication, lifestyle, and when to act. Home nursing and doctor follow-up with Anees.',
    intro:
      'High blood pressure is called the “silent killer” because it usually has no symptoms — yet it is one of the most manageable conditions when monitored consistently at home. This guide explains how home care keeps hypertension under control.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Why home monitoring matters',
        body: [
          'The World Health Organization estimates that 1.28 billion adults aged 30–79 worldwide have hypertension — and that nearly half do not know they have it. Because it rarely causes symptoms, regular blood-pressure monitoring at home is the single most important step in catching and controlling it before it damages the heart, kidneys, or brain.',
        ],
      },
      {
        heading: 'What home hypertension care includes',
        body: ['Consistent home management keeps blood pressure in a safe range:'],
        bullets: [
          'Regular, correctly-measured blood-pressure readings',
          'Medication management and adherence support',
          'Tracking readings over time for the doctor',
          'Lifestyle guidance — salt, weight, and activity',
          'Watching for signs of complications',
        ],
      },
      {
        heading: 'How to measure blood pressure correctly at home',
        body: ['An inaccurate reading is misleading — measure it properly:'],
        bullets: [
          'Rest quietly for five minutes first',
          'Sit with your back supported, feet flat, and arm at heart level',
          'Avoid caffeine and smoking for 30 minutes before',
          'Take two readings a minute apart, at the same time each day',
          'Record every reading to show the doctor',
        ],
      },
      {
        heading: 'When to seek urgent help',
        body: [
          'A very high reading together with a severe headache, chest pain, breathlessness, vision changes, or weakness on one side of the body needs urgent medical attention — call for help or go to the nearest hospital.',
        ],
      },
      {
        heading: 'How Anees supports hypertension care at home',
        body: [
          'Anees nurses take accurate readings and support medication, a doctor adjusts the treatment, and every reading is recorded — so trends are visible and the plan is tuned before problems develop.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How often should blood pressure be checked at home?',
        answer:
          'When first getting it under control, often once or twice a day at the same times, then as the doctor advises — and record every reading. Anees nurses can take accurate readings at home and report them to the doctor.',
      },
      {
        question: 'Can high blood pressure be managed at home?',
        answer:
          'Yes. Most hypertension is managed at home with regular monitoring, medication, and lifestyle changes. Anees provides home nursing and doctor follow-up across Greater Cairo.',
      },
    ],
    related: [
      { slug: 'doctor-at-home', label: 'Doctor home visit' },
      { slug: 'home-nursing', label: 'Home nursing' },
    ],
  },
  {
    slug: 'parkinsons-care-at-home',
    name: 'Parkinson’s Disease Care at Home in Egypt',
    description:
      'Supporting a parent with Parkinson’s at home in Egypt — mobility and physiotherapy, medication timing, home safety, and home nursing with Anees.',
    intro:
      'Parkinson’s disease affects movement, balance, and daily life, but the right support at home keeps a person active, safe, and independent for longer. This guide explains what home Parkinson’s care involves in Egypt.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'A growing condition',
        body: [
          'The World Health Organization reports that more than 8.5 million people worldwide live with Parkinson’s disease, and that the number has roughly doubled over the past 25 years. While there is no cure, consistent therapy and support meaningfully improve quality of life and slow the loss of function.',
        ],
      },
      {
        heading: 'Physiotherapy and movement',
        body: [
          'Regular physiotherapy is one of the most effective tools in Parkinson’s care — it maintains mobility, balance, and strength, reduces stiffness, and lowers the risk of falls. A physiotherapist can design and run a tailored program in the home.',
        ],
      },
      {
        heading: 'Why medication timing matters',
        body: [
          'Parkinson’s medication works best on a precise schedule, and doses taken late can cause a sudden loss of mobility. A home nurse helps keep the timing exact and watches for side effects — doses should never be changed without the doctor.',
        ],
      },
      {
        heading: 'Keeping the home safe',
        body: ['Small changes reduce the high fall risk in Parkinson’s:'],
        bullets: [
          'Clear walkways and remove loose rugs',
          'Add grab bars and ensure good lighting',
          'Use a firm chair with arms for sitting and standing',
          'Choose supportive, non-slip footwear',
          'Allow extra time — never rush movement',
        ],
      },
      {
        heading: 'How Anees supports Parkinson’s care at home',
        body: [
          'Anees coordinates home physiotherapy, nursing, and doctor follow-up under one coordinator, with a record that tracks function over time — so therapy and medication stay aligned as the condition changes.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can Parkinson’s disease be cared for at home?',
        answer:
          'Yes. Most Parkinson’s care happens at home — physiotherapy, medication management, and safety support. Anees coordinates home physiotherapy and nursing across Greater Cairo.',
      },
      {
        question: 'Does physiotherapy help Parkinson’s?',
        answer:
          'Yes. Regular physiotherapy maintains mobility, balance, and strength and reduces the risk of falls — and a physiotherapist can run a tailored program at home.',
      },
    ],
    related: [
      { slug: 'physiotherapy-at-home', label: 'Home physiotherapy' },
      { slug: 'home-nursing', label: 'Home nursing' },
    ],
  },
  {
    slug: 'cancer-palliative-care-at-home',
    name: 'Cancer & Palliative Care at Home in Egypt',
    description:
      'Compassionate cancer and palliative care at home in Egypt — pain and symptom control, nursing, and family support, coordinated by Anees.',
    intro:
      'For someone living with advanced cancer or another serious illness, palliative care focuses on comfort, dignity, and quality of life — and much of it can be delivered gently at home, surrounded by family. This guide explains what home palliative care involves in Egypt.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'What palliative care is — and a wide unmet need',
        body: [
          'Palliative care relieves pain and other distressing symptoms and supports both the patient and the family — and it is not only for the end of life. The World Health Organization estimates that 56.8 million people need palliative care each year, yet only about 14% who need it receive it — most of the gap in low- and middle-income countries. Bringing care home helps close that gap.',
        ],
      },
      {
        heading: 'What home palliative care includes',
        body: ['Home palliative care wraps medical and human support around the patient:'],
        bullets: [
          'Pain and symptom management',
          'Nursing care — wounds, feeding, catheter, and hygiene',
          'Medication management',
          'Emotional support for the patient and family',
          'Coordination with the treating oncologist',
        ],
      },
      {
        heading: 'Comfort, dignity, and family',
        body: [
          'Being at home — in familiar surroundings, close to family — is what most patients want at this stage. Home palliative care makes that possible safely, with professional support on hand whenever it is needed.',
        ],
      },
      {
        heading: 'How Anees supports palliative care at home',
        body: [
          'Anees coordinates nursing, doctor follow-up, and symptom management under one coordinator, with a shared record that keeps the family supported and the care consistent. For an acute crisis needing hospital-level intervention, Anees helps arrange the right escalation rather than managing it alone.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can palliative care be given at home?',
        answer:
          'Yes. Pain and symptom control, nursing, medication management, and family support can all be delivered at home, where most patients prefer to be. Anees coordinates home palliative care across Greater Cairo.',
      },
      {
        question: 'Is palliative care only for the end of life?',
        answer:
          'No. Palliative care focuses on comfort and quality of life at any stage of a serious illness, and can be provided alongside other treatment — not only at the end of life.',
      },
    ],
    related: [
      { slug: 'palliative-chronic-care', label: 'Palliative & chronic care' },
      { slug: 'home-nursing', label: 'Home nursing' },
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
          'تشير أبحاث تأهيل السكتة الدماغية التي يلخّصها المعهد الوطني الأمريكي للصحة (NIH) إلى أن معظم التعافي التلقائي يحدث في الأشهر الثلاثة إلى الستة الأولى بعد الجلطة، حين يكون الدماغ أكثر قابلية للتكيّف — لذا فإن بدء التأهيل مبكراً والاستمرار عليه هو الأهم. التقدم تدريجي ويختلف بحسب شدة الجلطة؛ وخطة منظّمة بأهداف قابلة للقياس تُبقيه على المسار.',
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
          'يكون جرح الجراحة أكثر عرضة للخطر في أول أسبوعين. وتفيد منظمة الصحة العالمية بأن عدوى موضع الجراحة هي أكثر أنواع العدوى المرتبطة بالرعاية الصحية شيوعاً في الدول منخفضة ومتوسطة الدخل، وتصيب نحو 11 من كل 100 مريض جراحي — ومعظمها يمكن الوقاية منه. وتغيير الضمادات بشكل نظيف وفي توقيته الصحيح والكشف المبكر عن العدوى هما ما يُبقي الشفاء على المسار ويتجنّب مضاعفات قد تعني إعادة الدخول للمستشفى.',
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
          'قد يقلّل السكري الإحساس وتدفق الدم في القدمين، فقد لا يُلاحَظ جرح أو فقاعة صغيرة فتُصاب بالعدوى. ويقدّر الاتحاد الدولي للسكري والأبحاث العالمية للقدم السكري أن نحو ثلث مرضى السكري قد يُصابون بتقرح في القدم خلال حياتهم، وأن طرفاً سفلياً يُفقد بسبب السكري في مكان ما من العالم كل 30 ثانية تقريباً — ومع ذلك تبقى العناية المنتظمة بالقدم أكثر الطرق فعالية لمنع هذه المضاعفات وحماية الحركة.',
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
          'تصنّف منظمة الصحة العالمية السقوط بوصفه ثاني أكثر أسباب الوفاة الناتجة عن الإصابات غير المقصودة على مستوى العالم، مع تحمّل من تجاوزوا الستين العدد الأكبر منها. قد تسبّب سقطة واحدة كسراً يُنهي الاستقلالية، وغالباً ما يؤدي الخوف من السقوط إلى قلة الحركة — ما يُضعف العضلات ويرفع الخطر أكثر. والوقاية من السقطة الأولى أسهل بكثير من التعافي منها.',
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
  {
    slug: 'dementia-care-at-home',
    name: 'رعاية الخرف والزهايمر في المنزل بمصر',
    description:
      'رعاية أحد الوالدين المصاب بالخرف أو الزهايمر في المنزل بمصر — الروتين اليومي وأمان المنزل وإدارة السلوك، وكيف يدعم التمريض المنزلي ومنسق واحد الأسرة.',
    intro:
      'تشخيص الخرف يغيّر حياة الأسرة كلها. ومع الروتين المناسب والمنزل الآمن والدعم المدرّب، يستطيع كثير من مرضى الخرف البقاء في المنزل — حيث يكونون أكثر هدوءاً — لفترة أطول بكثير. يشرح هذا الدليل ما تشمله رعاية الخرف المنزلية في مصر.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'لماذا يكون المنزل غالباً الأفضل لمرضى الخرف',
        body: [
          'تفيد منظمة الصحة العالمية بأن أكثر من 55 مليون شخص يعيشون مع الخرف حول العالم — أكثر من 60% منهم في الدول منخفضة ومتوسطة الدخل — وأنه من أبرز أسباب الاعتماد على الغير لدى كبار السن. والمحيط المألوف يقلّل التشوّش والهياج، لذا فإن بقاء مريض الخرف في منزله مع روتين ثابت غالباً ما يكون الخيار الأرحم والأكثر أماناً.',
        ],
      },
      {
        heading: 'ما تشمله رعاية الخرف المنزلية',
        body: ['تجمع رعاية الخرف المنزلية الجيدة بين الروتين والأمان والدعم المدرّب:'],
        bullets: [
          'روتين يومي ثابت يقلّل التشوّش',
          'إدارة الأدوية والتذكير بها',
          'المساعدة في الاستحمام واللبس والأكل',
          'التعامل الهادئ مع الهياج والسلوك الصعب',
          'تعديلات أمان في أنحاء المنزل',
          'دعم وراحة لمقدّم الرعاية من الأسرة',
        ],
      },
      {
        heading: 'الحفاظ على أمان المنزل',
        body: ['تغييرات بسيطة تمنع أكثر الحوادث المرتبطة بالخرف شيوعاً:'],
        bullets: [
          'أزل مخاطر التعثّر وثبّت السجاد',
          'إضاءة جيدة ليلاً ونهاراً',
          'احفظ الأدوية ومواد التنظيف والأدوات الحادة بعيداً',
          'فكّر في أجهزة إنذار للأبواب عند خطر التجوال',
          'حافظ على ترتيب مألوف ووضّح الغرف الأساسية',
        ],
      },
      {
        heading: 'كيف تدعم أنيس رعاية الخرف في المنزل',
        body: [
          'توفّر أنيس ممرضين لإدارة الأدوية والعناية الشخصية، وطبيباً لمراجعة العلاج وتعديله، ومنسقاً واحداً يدعم الأسرة ويحتفظ بسجل — لتبقى الرعاية متسقة مع تغيّر الحالة عبر الوقت.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكن رعاية مريض الخرف في المنزل؟',
        answer:
          'نعم. مع روتين ثابت ومنزل آمن ودعم مدرّب، يمكن رعاية كثير من مرضى الخرف في المنزل، حيث يقلّل المحيط المألوف التشوّش والهياج. تنسّق أنيس التمريض المنزلي ومتابعة الطبيب في القاهرة الكبرى.',
      },
      {
        question: 'كيف أحافظ على أمان والدي المصاب بالخرف في المنزل؟',
        answer:
          'أزل مخاطر التعثّر، ووفّر إضاءة جيدة، واحفظ الأدوية والأدوات الحادة بعيداً، وفكّر في أجهزة إنذار للأبواب عند خطر التجوال، وحافظ على روتين يومي ثابت. يمكن لممرض منزلي المساعدة في إعداد ذلك.',
      },
    ],
    related: [
      { slug: 'elderly-care-at-home', label: 'رعاية المسنين' },
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
    ],
  },
  {
    slug: 'pressure-ulcer-care-at-home',
    name: 'العناية بقرح الفراش في المنزل بمصر',
    description:
      'الوقاية من قرح الفراش وعلاجها في المنزل بمصر لمرضى الفراش ومحدودي الحركة — تغيير الوضعية والعناية بالجلد والعلامات التحذيرية، وتمريض منزلي مرخّص مع أنيس.',
    intro:
      'لمريض طريح الفراش أو محدود الحركة، تُعدّ قرح الفراش من أكثر المضاعفات شيوعاً وأكثرها قابلية للوقاية. يشرح هذا الدليل كيف تقي منها في المنزل وكيف يعالجها الممرض المنزلي مبكراً قبل أن تتفاقم.',
    aspect: 'Prevention',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'لماذا تهم قرح الفراش',
        body: [
          'تتكوّن قرح الفراش حيث يقطع الضغط المستمر تدفق الدم عن الجلد — غالباً فوق الورك والكعب وعظم العصعص لدى من لا يستطيع الحركة بحرية. وتوصي الإرشادات الدولية لإصابات الضغط (EPUAP/NPIAP) بتغيير وضعية المريض المعرّض للخطر كل ساعتين على الأقل، لأن تلف الأنسجة قد يبدأ خلال ساعات — وتؤكد أن معظم قرح الفراش يمكن الوقاية منه بالعناية المستمرة.',
        ],
      },
      {
        heading: 'كيف تقي من قرح الفراش في المنزل',
        body: ['روتين بسيط ومستمر يمنع معظم قرح الفراش:'],
        bullets: [
          'غيّر وضعية المريض كل ساعتين على الأقل',
          'حافظ على الجلد نظيفاً جافاً وغيّر الفراش المبلل فوراً',
          'استخدم مرتبة أو وسادة مخففة للضغط',
          'افحص الجلد يومياً فوق المناطق العظمية',
          'حافظ على ترطيب المريض وتغذيته الجيدة',
        ],
      },
      {
        heading: 'علامات تحذيرية تتطلب التحرك',
        body: ['اتصل بالممرض مبكراً إذا لاحظت:'],
        bullets: [
          'منطقة محمرّة لا تختفي عند الضغط عليها',
          'جلد متشقق أو فقاعة أو جرح مفتوح',
          'جلد أدفأ أو أبرد أو أكثر صلابة من محيطه',
          'ألم فوق نقطة ضغط',
        ],
      },
      {
        heading: 'كيف تقي أنيس من قرح الفراش وتعالجها',
        body: [
          'يضع ممرضو أنيس روتيناً لتغيير الوضعية والعناية بالجلد، ويعالجون القرح المبكرة بالضمادات الصحيحة، ويصعّدون للطبيب في الجروح المتقدمة — مع توثيق كل زيارة لمتابعة تقدّم الجرح.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم مرة يجب تغيير وضعية مريض الفراش؟',
        answer:
          'كل ساعتين على الأقل. توصي الإرشادات الدولية لإصابات الضغط بذلك لأن تلف الأنسجة قد يبدأ خلال ساعات من الضغط المستمر. يضع ممرضو أنيس روتيناً لتغيير الوضعية والعناية بالجلد في القاهرة الكبرى.',
      },
      {
        question: 'هل يمكن علاج قرح الفراش في المنزل؟',
        answer:
          'يمكن علاج القرح في مراحلها المبكرة في المنزل عبر ممرض مرخّص بتغيير الوضعية والعناية بالجلد والضمادات المناسبة. أما الجروح المتقدمة فتحتاج مراجعة طبيب، تنسّقها أنيس.',
      },
    ],
    related: [
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
      { slug: 'post-operative-care', label: 'الرعاية بعد العمليات' },
    ],
  },
  {
    slug: 'copd-respiratory-care-at-home',
    name: 'رعاية الانسداد الرئوي المزمن والجهاز التنفسي في المنزل بمصر',
    description:
      'إدارة الانسداد الرئوي المزمن وأمراض الجهاز التنفسي المزمنة في المنزل بمصر — دعم التنفس والأدوية والأكسجين والعلامات التحذيرية، وتمريض منزلي ومتابعة طبيب مع أنيس.',
    intro:
      'لمن يعيش مع الانسداد الرئوي المزمن أو مرض رئوي مزمن آخر، تمنع الإدارة اليومية الجيدة في المنزل النوبات ودخول المستشفى. يشرح هذا الدليل ما تشمله الرعاية التنفسية المنزلية في مصر.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'لماذا تهم الإدارة المنزلية في الانسداد الرئوي',
        body: [
          'تصنّف منظمة الصحة العالمية الانسداد الرئوي المزمن بوصفه ثالث أكثر أسباب الوفاة في العالم، مع حدوث نحو 90% من وفياته بين من هم دون السبعين في الدول منخفضة ومتوسطة الدخل. والإدارة المنزلية الثابتة — الدواء الصحيح، وطريقة استخدام البخاخة الصحيحة، والتحرك المبكر عند ظهور الأعراض — هي ما يُبقي المرض الرئوي المزمن مستقراً وبعيداً عن المستشفى.',
        ],
      },
      {
        heading: 'ما تشمله الرعاية التنفسية المنزلية',
        body: ['تجمع الخطة التنفسية المنزلية عادةً بين:'],
        bullets: [
          'دعم الأدوية والبخاخة والنيبولايزر مع مراجعة الطريقة',
          'العلاج بالأكسجين عند وصفه',
          'متابعة التنفس وتشبّع الأكسجين والأعراض',
          'تمارين التنفس والعلاج الطبيعي للصدر',
          'خطة واضحة للتعامل مع النوبات',
        ],
      },
      {
        heading: 'علامات تحذيرية للنوبة',
        body: ['اطلب المساعدة فوراً — وعاجلاً للأخيرتين — إذا لاحظت:'],
        bullets: [
          'ضيق نفس أكثر من المعتاد',
          'تغيّر لون أو كمية البلغم، أو حمى',
          'تشوّش أو نعاس غير معتاد',
          'ازرقاق الشفتين أو أطراف الأصابع',
        ],
      },
      {
        heading: 'كيف تدعم أنيس الرعاية التنفسية في المنزل',
        body: [
          'توفّر أنيس ممرضين للمتابعة والأدوية ودعم النيبولايزر أو الأكسجين، وطبيباً لتعديل خطة العلاج، ومنسقاً واحداً يحتفظ بسجل — لتُكتشف النوبة وتُعالج مبكراً.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكن إدارة الانسداد الرئوي المزمن في المنزل؟',
        answer:
          'نعم. معظم الرعاية اليومية — الأدوية والبخاخة والنيبولايزر والأكسجين والمتابعة — تتم في المنزل. توفّر أنيس التمريض المنزلي ومتابعة الطبيب في القاهرة الكبرى، وتصعّد النوبات بسرعة.',
      },
      {
        question: 'متى يكون ضيق النفس حالة طارئة؟',
        answer:
          'ضيق النفس الشديد أو المفاجئ، أو ازرقاق الشفتين وأطراف الأصابع، أو التشوّش، أو النعاس يحتاج مساعدة عاجلة — اطلب إسعافاً. أما التدهور غير الطارئ فيمكن لأنيس ترتيب مراجعة طبيب عاجلة.',
      },
    ],
    related: [
      { slug: 'doctor-at-home', label: 'زيارة طبيب منزلية' },
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
    ],
  },
  {
    slug: 'hypertension-care-at-home',
    name: 'رعاية ارتفاع ضغط الدم في المنزل بمصر',
    description:
      'إدارة ارتفاع ضغط الدم في المنزل بمصر — القياس الدقيق والأدوية ونمط الحياة ومتى تتحرك. تمريض منزلي ومتابعة طبيب مع أنيس.',
    intro:
      'يُسمّى ارتفاع ضغط الدم «القاتل الصامت» لأنه غالباً بلا أعراض — ومع ذلك فهو من أكثر الحالات قابلية للتحكم عند متابعته بانتظام في المنزل. يشرح هذا الدليل كيف تُبقي الرعاية المنزلية الضغط تحت السيطرة.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'لماذا تهم المتابعة المنزلية',
        body: [
          'تقدّر منظمة الصحة العالمية أن 1.28 مليار بالغ في عمر 30–79 عاماً حول العالم مصابون بارتفاع ضغط الدم — وأن نحو نصفهم لا يعرفون أنهم مصابون. ولأنه نادراً ما يسبّب أعراضاً، فإن قياس الضغط بانتظام في المنزل هو أهم خطوة لاكتشافه والتحكم فيه قبل أن يضرّ القلب أو الكلى أو الدماغ.',
        ],
      },
      {
        heading: 'ما تشمله الرعاية المنزلية لارتفاع الضغط',
        body: ['الإدارة المنزلية المستمرة تُبقي الضغط في نطاق آمن:'],
        bullets: [
          'قياسات ضغط منتظمة ومأخوذة بشكل صحيح',
          'إدارة الأدوية ودعم الالتزام بها',
          'تتبّع القراءات عبر الوقت للطبيب',
          'إرشادات نمط الحياة — الملح والوزن والنشاط',
          'مراقبة علامات المضاعفات',
        ],
      },
      {
        heading: 'كيف تقيس الضغط بشكل صحيح في المنزل',
        body: ['القراءة غير الدقيقة مضلّلة — قِسها بشكل صحيح:'],
        bullets: [
          'استرح بهدوء خمس دقائق أولاً',
          'اجلس وظهرك مسنود وقدماك على الأرض والذراع بمستوى القلب',
          'تجنّب الكافيين والتدخين 30 دقيقة قبل القياس',
          'خذ قراءتين بفارق دقيقة في الوقت نفسه يومياً',
          'سجّل كل قراءة لعرضها على الطبيب',
        ],
      },
      {
        heading: 'متى تطلب مساعدة عاجلة',
        body: [
          'قراءة مرتفعة جداً مع صداع شديد أو ألم في الصدر أو ضيق نفس أو تغيّر في الرؤية أو ضعف في جانب واحد من الجسم تحتاج عناية طبية عاجلة — اطلب المساعدة أو اذهب لأقرب مستشفى.',
        ],
      },
      {
        heading: 'كيف تدعم أنيس رعاية ارتفاع الضغط في المنزل',
        body: [
          'يأخذ ممرضو أنيس قراءات دقيقة ويدعمون الأدوية، ويعدّل الطبيب العلاج، وتُسجَّل كل قراءة — لتكون الاتجاهات واضحة وتُضبط الخطة قبل ظهور المشكلات.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كم مرة يجب قياس ضغط الدم في المنزل؟',
        answer:
          'عند بدء التحكم فيه، غالباً مرة أو مرتين يومياً في الأوقات نفسها، ثم بحسب نصيحة الطبيب — وسجّل كل قراءة. يمكن لممرضي أنيس أخذ قراءات دقيقة في المنزل وإبلاغ الطبيب بها.',
      },
      {
        question: 'هل يمكن إدارة ارتفاع ضغط الدم في المنزل؟',
        answer:
          'نعم. معظم حالات ارتفاع الضغط تُدار في المنزل بالمتابعة والأدوية وتغيير نمط الحياة. توفّر أنيس التمريض المنزلي ومتابعة الطبيب في القاهرة الكبرى.',
      },
    ],
    related: [
      { slug: 'doctor-at-home', label: 'زيارة طبيب منزلية' },
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
    ],
  },
  {
    slug: 'parkinsons-care-at-home',
    name: 'رعاية مرض باركنسون في المنزل بمصر',
    description:
      'دعم أحد الوالدين المصاب بباركنسون في المنزل بمصر — الحركة والعلاج الطبيعي وتوقيت الأدوية وأمان المنزل، وتمريض منزلي مع أنيس.',
    intro:
      'يؤثّر مرض باركنسون في الحركة والتوازن والحياة اليومية، لكن الدعم المناسب في المنزل يُبقي الشخص نشطاً وآمناً ومستقلاً لفترة أطول. يشرح هذا الدليل ما تشمله رعاية باركنسون المنزلية في مصر.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'حالة متزايدة',
        body: [
          'تفيد منظمة الصحة العالمية بأن أكثر من 8.5 مليون شخص حول العالم يعيشون مع مرض باركنسون، وأن العدد تضاعف تقريباً خلال الـ25 عاماً الماضية. ورغم عدم وجود علاج شافٍ، فإن العلاج والدعم المنتظمين يحسّنان جودة الحياة بشكل ملموس ويبطئان فقدان الوظائف.',
        ],
      },
      {
        heading: 'العلاج الطبيعي والحركة',
        body: [
          'العلاج الطبيعي المنتظم من أكثر الأدوات فعالية في رعاية باركنسون — فهو يحافظ على الحركة والتوازن والقوة، ويقلّل التيبّس، ويخفض خطر السقوط. ويمكن لأخصائي علاج طبيعي تصميم برنامج مخصّص وتنفيذه في المنزل.',
        ],
      },
      {
        heading: 'لماذا يهم توقيت الأدوية',
        body: [
          'يعمل دواء باركنسون بأفضل صورة وفق جدول دقيق، وتأخّر الجرعات قد يسبّب فقداناً مفاجئاً للحركة. يساعد الممرض المنزلي في ضبط التوقيت ومراقبة الآثار الجانبية — ولا يجوز تغيير الجرعات دون الطبيب.',
        ],
      },
      {
        heading: 'الحفاظ على أمان المنزل',
        body: ['تغييرات بسيطة تقلّل خطر السقوط المرتفع في باركنسون:'],
        bullets: [
          'أخلِ الممرات وأزل السجاد غير المثبّت',
          'أضف مقابض إمساك ووفّر إضاءة جيدة',
          'استخدم كرسياً ثابتاً بمساند للجلوس والوقوف',
          'اختر حذاءً داعماً مانعاً للانزلاق',
          'أعطِ وقتاً إضافياً — لا تستعجل الحركة',
        ],
      },
      {
        heading: 'كيف تدعم أنيس رعاية باركنسون في المنزل',
        body: [
          'تنسّق أنيس العلاج الطبيعي المنزلي والتمريض ومتابعة الطبيب تحت منسق واحد، مع سجل يتابع الوظائف عبر الوقت — ليبقى العلاج والدواء متناسقين مع تغيّر الحالة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكن رعاية مريض باركنسون في المنزل؟',
        answer:
          'نعم. معظم رعاية باركنسون تتم في المنزل — العلاج الطبيعي وإدارة الأدوية ودعم السلامة. تنسّق أنيس العلاج الطبيعي والتمريض المنزلي في القاهرة الكبرى.',
      },
      {
        question: 'هل يفيد العلاج الطبيعي في باركنسون؟',
        answer:
          'نعم. العلاج الطبيعي المنتظم يحافظ على الحركة والتوازن والقوة ويقلّل خطر السقوط — ويمكن لأخصائي تنفيذ برنامج مخصّص في المنزل.',
      },
    ],
    related: [
      { slug: 'physiotherapy-at-home', label: 'العلاج الطبيعي المنزلي' },
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
    ],
  },
  {
    slug: 'cancer-palliative-care-at-home',
    name: 'رعاية السرطان والرعاية التلطيفية في المنزل بمصر',
    description:
      'رعاية تلطيفية ورعاية للسرطان في المنزل بمصر برحمة — التحكم في الألم والأعراض، والتمريض، ودعم الأسرة، بتنسيق أنيس.',
    intro:
      'لمن يعيش مع سرطان متقدّم أو مرض خطير آخر، تركّز الرعاية التلطيفية على الراحة والكرامة وجودة الحياة — ويمكن تقديم جزء كبير منها بلطف في المنزل بين أفراد الأسرة. يشرح هذا الدليل ما تشمله الرعاية التلطيفية المنزلية في مصر.',
    aspect: 'Treatment',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'ما الرعاية التلطيفية — وفجوة كبيرة غير ملبّاة',
        body: [
          'تخفّف الرعاية التلطيفية الألم والأعراض المزعجة وتدعم المريض والأسرة — وهي ليست لنهاية الحياة فقط. وتقدّر منظمة الصحة العالمية أن 56.8 مليون شخص يحتاجون رعاية تلطيفية كل عام، ومع ذلك يحصل عليها نحو 14% فقط ممن يحتاجونها — ومعظم الفجوة في الدول منخفضة ومتوسطة الدخل. ونقل الرعاية إلى المنزل يساعد على سدّ هذه الفجوة.',
        ],
      },
      {
        heading: 'ما تشمله الرعاية التلطيفية المنزلية',
        body: ['تلفّ الرعاية التلطيفية المنزلية الدعم الطبي والإنساني حول المريض:'],
        bullets: [
          'إدارة الألم والأعراض',
          'الرعاية التمريضية — الجروح والتغذية والقسطرة والنظافة',
          'إدارة الأدوية',
          'الدعم النفسي للمريض والأسرة',
          'التنسيق مع طبيب الأورام المعالج',
        ],
      },
      {
        heading: 'الراحة والكرامة والأسرة',
        body: [
          'البقاء في المنزل — في محيط مألوف قريباً من الأسرة — هو ما يريده معظم المرضى في هذه المرحلة. وتجعل الرعاية التلطيفية المنزلية ذلك ممكناً بأمان، مع توفّر الدعم المهني عند الحاجة.',
        ],
      },
      {
        heading: 'كيف تدعم أنيس الرعاية التلطيفية في المنزل',
        body: [
          'تنسّق أنيس التمريض ومتابعة الطبيب وإدارة الأعراض تحت منسق واحد، مع سجل مشترك يُبقي الأسرة مدعومة والرعاية متسقة. وفي الأزمات الحادة التي تحتاج تدخلاً بمستوى المستشفى، تساعد أنيس في ترتيب التصعيد المناسب بدلاً من إدارته منفردة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكن تقديم الرعاية التلطيفية في المنزل؟',
        answer:
          'نعم. يمكن تقديم التحكم في الألم والأعراض والتمريض وإدارة الأدوية ودعم الأسرة في المنزل، حيث يفضّل معظم المرضى البقاء. تنسّق أنيس الرعاية التلطيفية المنزلية في القاهرة الكبرى.',
      },
      {
        question: 'هل الرعاية التلطيفية لنهاية الحياة فقط؟',
        answer:
          'لا. تركّز الرعاية التلطيفية على الراحة وجودة الحياة في أي مرحلة من المرض الخطير، ويمكن تقديمها إلى جانب العلاجات الأخرى — وليس فقط في نهاية الحياة.',
      },
    ],
    related: [
      { slug: 'palliative-chronic-care', label: 'الرعاية التلطيفية والمزمنة' },
      { slug: 'home-nursing', label: 'التمريض المنزلي' },
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
