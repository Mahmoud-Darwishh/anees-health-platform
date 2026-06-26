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
  {
    slug: 'how-to-book-doctor-home-visit',
    category: 'how-to',
    title: 'How to Book a Doctor Home Visit in Egypt (Step by Step)',
    description:
      'A simple step-by-step guide to booking a doctor home visit in Egypt with Anees Health — what to prepare, how fast it is, and what happens during the visit.',
    intro:
      'Booking a doctor to come to your home in Egypt takes only a few minutes. This guide walks you through it step by step, what to have ready, and what to expect when the doctor arrives.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'Booking, step by step',
        body: ['With Anees Health it is five short steps:'],
        bullets: [
          'Choose the service — a doctor home visit (and the specialty if you know it).',
          'Pick a date and time that suit you.',
          'Enter the patient’s address in Greater Cairo and a contact number.',
          'Confirm — pay online via Kashier or pay the doctor on arrival.',
          'An Anees coordinator confirms within minutes and assigns the right doctor.',
        ],
      },
      {
        heading: 'What to have ready',
        body: ['Having these on hand makes the visit faster and safer:'],
        bullets: [
          'The patient’s age and main complaint or symptoms',
          'A list of current medications',
          'Any recent test results or medical reports',
          'The exact address with a nearby landmark',
        ],
      },
      {
        heading: 'How fast can the doctor arrive?',
        body: [
          'Most routine home visits are scheduled the same day, and urgent visits can usually be dispatched within hours, subject to doctor availability in your area. You choose your preferred time at booking.',
        ],
      },
      {
        heading: 'What happens during the visit',
        body: [
          'The doctor confirms the patient’s identity, takes a history, examines the patient, and explains the diagnosis. They can prescribe medication, order home lab tests, and advise on next steps — and everything is recorded in the patient’s medical file.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How quickly can a doctor come to my home in Egypt?',
        answer:
          'Most routine doctor home visits are scheduled the same day, and urgent visits can typically be dispatched within hours, subject to availability in your area. With Anees, a coordinator confirms within minutes of booking.',
      },
      {
        question: 'Can I pay the doctor cash on arrival?',
        answer:
          'Yes. With Anees Health you can pay online while booking via the secure Kashier gateway, or pay on arrival. A receipt is issued either way, and the price is shown before you confirm.',
      },
      {
        question: 'What if I need a specialist at home?',
        answer:
          'You can request a specialty when booking (for example pediatrics, internal medicine, or cardiology). The Anees coordinator assigns a licensed doctor in that specialty where available.',
      },
    ],
  },
  {
    slug: 'night-emergency-home-doctor-cairo',
    category: 'guide',
    title: 'Night & Emergency Doctor Home Visits in Cairo',
    description:
      'Need a doctor at home at night or urgently in Cairo? How after-hours and urgent home visits work with Anees Health — and when to call an ambulance instead.',
    intro:
      'Illness does not keep office hours. When a child spikes a fever at midnight or an elderly parent suddenly worsens, a doctor home visit can spare a stressful late-night trip to a crowded emergency room. Here is how urgent and night-time home visits work in Cairo — and, importantly, when you should call an ambulance instead.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'When a night or urgent home visit makes sense',
        body: ['A home visit is well suited to problems that are urgent but not life-threatening:'],
        bullets: [
          'High fever, flu, and respiratory infections — especially in children and the elderly',
          'Dehydration after vomiting or diarrhea',
          'Minor injuries, wounds, and pain that cannot wait until morning',
          'Flare-ups of a known chronic condition',
        ],
      },
      {
        heading: 'When to call an ambulance instead',
        body: [
          'Some symptoms are emergencies that need an ambulance or the nearest ER — not a home visit. Stroke in particular is time-critical: in a typical stroke the brain loses an estimated 1.9 million nerve cells every minute it goes untreated (the “time is brain” principle in stroke medicine), so minutes matter. Call for emergency help immediately for:',
        ],
        bullets: [
          'Chest pain or pressure',
          'Signs of a stroke — use the FAST check recognised by stroke associations: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services',
          'Severe difficulty breathing',
          'Major bleeding or a serious injury',
          'Loss of consciousness or a seizure',
        ],
      },
      {
        heading: 'How Anees arranges urgent visits',
        body: [
          'When you book an urgent visit, the Anees coordinator triages the situation and dispatches a licensed doctor within hours, subject to availability in your area, with the visit recorded in the patient’s file for any follow-up.',
        ],
      },
      {
        heading: 'A note on winter',
        body: [
          'Demand for night and emergency home visits rises sharply during the winter flu season (November–February), especially for children and the elderly. If you can, book early in the evening rather than late at night.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can I get a doctor at home at night in Cairo?',
        answer:
          'Yes. Anees Health arranges urgent and after-hours doctor home visits across Greater Cairo, subject to clinician availability. The coordinator dispatches a licensed doctor within hours for non-emergency situations.',
      },
      {
        question: 'Is a home visit appropriate for a high fever?',
        answer:
          'For most fevers, flu, and infections — yes, a home visit is appropriate and avoids a crowded ER. But if there is severe breathing difficulty, a seizure, or loss of consciousness, call an ambulance instead.',
      },
    ],
  },
  {
    slug: 'iv-drip-at-home-cairo',
    category: 'guide',
    title: 'IV Drip & Hydration at Home in Cairo',
    description:
      'IV fluids and hydration at home in Cairo with Anees Health — for dehydration, recovery after illness, and Egypt’s summer heat, given safely by a licensed nurse on a doctor’s advice.',
    intro:
      'Dehydration is common in Egypt’s summer heat and after bouts of vomiting, diarrhea, or fever. An IV drip at home — given by a licensed nurse on a doctor’s advice — can rehydrate quickly without a hospital trip. Here is when it helps and how it is done safely.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'When an IV drip at home can help',
        body: ['On a doctor’s advice, home IV fluids are commonly used for:'],
        bullets: [
          'Dehydration from heat or from vomiting and diarrhea',
          'Recovery after a fever or stomach illness',
          'Fatigue and weakness where oral fluids are not enough',
        ],
      },
      {
        heading: 'How it is done safely at home',
        body: [
          'A licensed nurse inserts and manages the cannula, runs the infusion at the correct rate, and monitors the patient throughout — following the prescribing doctor’s order and watching for any reaction.',
        ],
      },
      {
        heading: 'An important safety note',
        body: [
          'IV fluids and vitamins should be medically indicated, not routine. The World Health Organization recommends oral rehydration as the first-line treatment for mild-to-moderate dehydration, with intravenous fluids reserved for cases a clinician judges need them — so a doctor should assess the patient first to confirm an IV is the right choice and to set the prescription. Anees coordinates a doctor review when one is needed before the nurse visit.',
        ],
      },
      {
        heading: 'Summer tip',
        body: [
          'Elderly people and those with chronic illness are most at risk of dehydration in the summer heat. Watch for dizziness, dark urine, confusion, and reduced urination — and seek medical advice early.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can I get an IV drip at home in Cairo?',
        answer:
          'Yes. Anees Health arranges home IV fluids across Greater Cairo, given by a licensed nurse — on a doctor’s advice. A doctor review can be coordinated first to confirm it is appropriate.',
      },
      {
        question: 'Is a home IV drip safe?',
        answer:
          'When given by a licensed nurse following a doctor’s order, with proper monitoring, a home IV is safe. IV fluids should always be medically indicated rather than routine, so a doctor should assess the patient first.',
      },
    ],
  },
  {
    slug: 'diabetes-care-ramadan',
    category: 'guide',
    title: 'Managing Diabetes at Home During Ramadan',
    description:
      'How people with diabetes can fast more safely in Ramadan — glucose monitoring, medication timing, warning signs, and how home nursing supports it in Egypt.',
    intro:
      'Fasting in Ramadan matters deeply to many people with diabetes, but it changes glucose and medication patterns and carries real risks. With the right monitoring and support at home, many can fast more safely. Here is what to watch for and how home care helps — always alongside your own doctor’s guidance.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'Talk to your doctor before fasting',
        body: [
          'Diabetes is especially common in Egypt: the International Diabetes Federation estimates that roughly one in five Egyptian adults — about 13 million people — lives with diabetes, so safe-fasting guidance matters for a great many families. Whether fasting is safe depends on your diabetes type, how well it is controlled, any complications, and your medications. Get individual advice from your doctor before Ramadan — some people are advised not to fast, and that is a medical decision.',
        ],
      },
      {
        heading: 'Glucose monitoring during Ramadan',
        body: ['Check your blood glucose more often than usual:'],
        bullets: [
          'Before suhoor and before iftar',
          'Mid-afternoon, when the risk of a low is highest',
          'Any time you feel unwell',
          'Checking your blood glucose does not break the fast.',
        ],
      },
      {
        heading: 'Medication timing',
        body: [
          'Medication doses and timing often shift to suhoor and iftar during Ramadan — but only adjust them with your doctor. Never skip or change insulin on your own; the right adjustment depends on your specific regimen.',
        ],
      },
      {
        heading: 'When to break the fast',
        body: ['Break the fast and treat immediately if you have:'],
        bullets: [
          'Hypoglycemia — shakiness, sweating, confusion, or a glucose reading that is too low',
          'Very high blood glucose',
          'Signs of dehydration',
        ],
      },
      {
        heading: 'How Anees supports diabetic care in Ramadan',
        body: [
          'Anees coordinates home nursing for glucose checks and injections, doctor follow-up to adjust the plan, and medication management — so the patient and family have support through the month.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does checking blood glucose break the fast?',
        answer:
          'No. A finger-prick blood glucose check does not break the fast, and frequent checking is recommended during Ramadan to catch high or low readings early.',
      },
      {
        question: 'Can a person with diabetes fast during Ramadan?',
        answer:
          'Many can fast safely with the right preparation, but it is an individual medical decision. Speak to your doctor before Ramadan — some people, depending on their control and complications, are advised not to fast.',
      },
      {
        question: 'How can home nursing help during Ramadan?',
        answer:
          'A home nurse can carry out regular glucose checks and injections, support medication timing, and watch for warning signs, while a doctor adjusts the plan — useful support for diabetic and elderly patients who are fasting.',
      },
    ],
  },
  {
    slug: 'best-home-nursing-cairo',
    category: 'guide',
    title: 'Best Home Nursing in Cairo: How to Choose (2026)',
    description:
      'Looking for the best home nursing in Cairo? The criteria that actually matter — licensing, continuity, transparent pricing, and accountability — and how to evaluate a provider before you commit.',
    intro:
      'Searching for the “best” home nursing in Cairo returns a wall of similar-sounding agencies. The real differences are not in the ads — they are in licensing, continuity of care, transparent pricing, and who is accountable when something goes wrong. This guide gives you the criteria that separate genuinely good home nursing from the rest.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'What “best” actually means in home nursing',
        body: [
          'The best home nursing is not the cheapest or the one with the biggest ad budget — it is the provider that sends a licensed nurse suited to the patient, returns consistently, works from a record of what was done before, and is transparent about price and accountability. For an elderly or post-operative patient, continuity of care matters more than almost anything else.',
        ],
      },
      {
        heading: 'The criteria that matter',
        body: ['Judge a home nursing provider in Cairo on these, not on the advertising:'],
        bullets: [
          'Licensing: every nurse is registered with the Egyptian nursing/medical syndicate, verified before they visit.',
          'Continuity: the same small team returns, working from a record — not a different stranger each time.',
          'Transparent pricing: the price is shown in writing before you book.',
          'One accountable coordinator who owns the case and updates the family.',
          'Clear infection-control and safety practices in the home.',
          'Every visit documented, so the care builds over time.',
          'Cancellation and rescheduling terms stated up front.',
        ],
      },
      {
        heading: 'Questions to ask before you commit',
        body: ['A few direct questions quickly separate a safe provider from a body-shop:'],
        bullets: [
          'Is the nurse syndicate-licensed, and do you verify the licence?',
          'Will the same nurse or small team return each visit?',
          'Is the price confirmed in writing before the visit?',
          'Who do I call if there is a problem, day or night?',
          'Is each visit documented in a record I can see?',
        ],
      },
      {
        heading: 'How Anees Health compares',
        body: [
          'Anees was built around exactly these criteria: every nurse is syndicate-licensed and credential-verified before any visit, one coordinator owns the case end to end, every visit is recorded in a real medical record, and the price is shown before you confirm. That continuity — a team that remembers — is what turns a series of visits into managed care.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What should I look for in a home nursing company in Cairo?',
        answer:
          'Look for verified syndicate licensing, continuity (the same team returning and working from a record), transparent pricing shown before booking, one accountable coordinator, and documented visits. These matter more than the lowest headline price.',
      },
      {
        question: 'How much does home nursing cost in Cairo?',
        answer:
          'Home nursing in Cairo is priced per visit, per shift, or as a monthly package, and varies by the nurse’s qualification, the area, and shift length. With Anees Health the exact price is confirmed before you book.',
      },
    ],
  },
  {
    slug: 'best-home-physiotherapy-cairo',
    category: 'guide',
    title: 'Best Home Physiotherapy in Cairo: How to Choose',
    description:
      'How to find the best home physiotherapy in Cairo — what a licensed physiotherapist should provide, the signs of a quality rehab program, and the questions to ask before booking.',
    intro:
      'Home physiotherapy can be the difference between a full recovery and a stalled one — but quality varies widely. This guide explains what good home physiotherapy in Cairo looks like, and how to tell a structured rehabilitation program from a one-off massage.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'What good home physiotherapy includes',
        body: [
          'Quality home physiotherapy starts with a proper assessment, sets measurable goals, follows a written plan, tracks progress visit over visit, and coordinates with the treating doctor. It is delivered by a licensed physiotherapist — not an unqualified masseur — and adapts as the patient improves.',
        ],
      },
      {
        heading: 'Signs of a quality rehabilitation program',
        body: ['Look for these markers of a real program rather than ad-hoc sessions:'],
        bullets: [
          'A proper initial assessment before any treatment',
          'A written, goal-based plan with a clear endpoint',
          'Progress measured objectively (range of motion, balance, strength)',
          'A licensed physiotherapist, credentials you can verify',
          'Coordination with the patient’s doctor where relevant',
          'Each session documented so progress is visible',
        ],
      },
      {
        heading: 'Questions to ask before booking',
        body: ['These questions reveal whether you are getting structured rehab or a generic visit:'],
        bullets: [
          'Are you a licensed physiotherapist, and can I verify it?',
          'Will you assess the patient before starting treatment?',
          'How will you measure progress?',
          'How many sessions do you expect, and why?',
          'What happens if progress stalls?',
        ],
      },
      {
        heading: 'How Anees Health approaches home physiotherapy',
        body: [
          'Anees sends licensed physiotherapists who assess first, work to a structured program (for example a 12-session rehabilitation plan), record measurable progress in one medical record, and coordinate with the doctor and nursing team — so recovery is tracked, not guessed.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I find a good physiotherapist for home visits in Cairo?',
        answer:
          'Choose a licensed physiotherapist who assesses the patient first, works to a written goal-based plan, measures progress objectively, and documents each session. Anees Health provides credential-verified physiotherapists across Greater Cairo.',
      },
      {
        question: 'How many home physiotherapy sessions will I need?',
        answer:
          'It depends on the condition and goals — a proper assessment sets the number. Anees offers structured programs (for example a 12-session rehabilitation plan) and reviews progress along the way.',
      },
    ],
  },
  {
    slug: 'home-visit-vs-clinic',
    category: 'comparison',
    title: 'Doctor Home Visit vs. Clinic Visit in Egypt: Which Is Right?',
    description:
      'When is a doctor home visit better than going to the clinic in Egypt — and when is a clinic or hospital the safer choice? A clear comparison to help families decide.',
    intro:
      'For many situations a doctor can come to you instead of you traveling to a clinic — but not always. This guide compares a home visit and a clinic visit so you can choose the right one for the patient in front of you.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'When a home visit is the better choice',
        body: ['A doctor home visit is usually the better option when:'],
        bullets: [
          'The patient is elderly, post-operative, or has limited mobility',
          'It is a routine check, follow-up, or a minor illness',
          'You want to avoid infection exposure in a crowded waiting room',
          'You need ongoing chronic-disease monitoring',
          'The care can be done at home — IV fluids, wound care, or lab samples',
        ],
      },
      {
        heading: 'When a clinic or hospital is better',
        body: ['Go to a clinic or hospital — or call an ambulance — when:'],
        bullets: [
          'There is an emergency (chest pain, stroke signs, severe breathing difficulty)',
          'A procedure needs equipment only available on-site',
          'Advanced imaging (CT, MRI) is required',
          'Surgery or a specialist procedure is needed',
        ],
      },
      {
        heading: 'A quick comparison',
        body: [
          'A home visit wins on convenience, comfort, and lower infection risk, and suits routine, follow-up, elderly, and chronic care. A clinic or hospital wins on equipment, imaging, and emergencies. The right choice depends on the situation, not a blanket rule — and for routine and ongoing care at home, continuity is the real advantage.',
        ],
      },
      {
        heading: 'How Anees Health fits in',
        body: [
          'Anees handles the home-suitable side — doctor visits, nursing, physiotherapy, and labs — and is clear about when a clinic or emergency room is the safer place to be. The coordinator helps you make that call rather than dispatching a home visit when it is not appropriate.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is a doctor home visit as good as going to a clinic?',
        answer:
          'For routine care, follow-ups, minor illness, and chronic-disease monitoring, a home visit is just as effective and far more convenient — especially for elderly and post-operative patients. For emergencies, advanced imaging, or surgery, a clinic or hospital is the right place.',
      },
      {
        question: 'When should I not use a home visit?',
        answer:
          'Avoid a home visit for emergencies (chest pain, stroke signs, severe breathing difficulty), for advanced imaging like CT or MRI, and for surgery. In an emergency, call an ambulance or go to the nearest hospital.',
      },
    ],
  },
  {
    slug: 'home-nursing-vs-private-nurse',
    category: 'comparison',
    title: 'Home Nursing Company vs. Hiring a Private Nurse in Egypt',
    description:
      'Should you hire a private nurse directly or use a home nursing company in Egypt? The honest trade-offs in licensing, accountability, continuity, and cost.',
    intro:
      'When a family needs ongoing nursing at home, the choice is usually between hiring a private nurse directly and using a home nursing company. They look similar but differ sharply on accountability, licence checks, and what happens when something goes wrong. Here is the honest comparison.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Hiring a private nurse directly',
        body: [
          'Hiring a nurse directly can feel cheaper and more personal, but the family carries the burden: you verify the licence yourself, you cover absences and sick days, you handle any dispute, and there is usually no documented record or medical backup if the patient deteriorates.',
        ],
        bullets: [
          'Possible upside: a potentially lower headline cost and a direct relationship',
          'You verify credentials and licensing yourself',
          'No cover if the nurse is sick or unavailable',
          'No coordinator or escalation path if something goes wrong',
          'No doctor backup or documented record',
        ],
      },
      {
        heading: 'Using a home nursing company',
        body: [
          'A reputable home nursing company sends a vetted, licensed nurse, covers absences, provides an accountable coordinator and doctor backup, and keeps a documented record — usually at a higher but transparent price. You trade a little cost for accountability and continuity.',
        ],
        bullets: [
          'Credentials verified before the nurse visits',
          'Cover arranged if a nurse is unavailable',
          'One accountable coordinator and a clear escalation path',
          'Doctor backup and a documented medical record',
          'Transparent pricing shown before booking',
        ],
      },
      {
        heading: 'Which is right for you',
        body: [
          'For short-term, simple needs, either can work. For a complex, elderly, or post-operative patient — or anyone needing medical oversight and continuity — a company is the safer choice, because the accountability and the record are built in rather than left to the family.',
        ],
      },
      {
        heading: 'How Anees Health works',
        body: [
          'Anees provides syndicate-licensed, credential-verified nurses with one coordinator, doctor backup, a documented medical record, cover for absences, and the price shown before you book — the accountability of a company with the continuity of a dedicated team.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is it cheaper to hire a private nurse directly?',
        answer:
          'The headline cost can be lower, but you take on credentialing, cover for absences, accountability, and the lack of a medical record yourself. A home nursing company folds those into a transparent price.',
      },
      {
        question: 'What are the risks of hiring a private nurse without an agency?',
        answer:
          'The main risks are unverified credentials, no cover if the nurse is unavailable, no accountability or escalation if something goes wrong, no doctor backup, and no documented record of the care provided.',
      },
    ],
  },
  {
    slug: 'prepare-home-after-surgery',
    category: 'how-to',
    title: 'How to Prepare Your Home for Recovery After Surgery (Egypt)',
    description:
      'A practical checklist for preparing the home before a patient is discharged after surgery in Egypt — a safe recovery space, supplies, mobility, and the warning signs to watch.',
    intro:
      'A little preparation before discharge makes recovery at home safer, calmer, and faster. This guide is a practical checklist for getting the home ready before a patient comes back from surgery — and how home nursing fills the gaps.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'Set up a recovery space',
        body: ['Prepare one comfortable, accessible room before discharge:'],
        bullets: [
          'A bed the patient can get in and out of safely, ideally on the ground floor',
          'Essentials within reach — water, medicines, phone, tissues, a bell',
          'Good lighting and a clear, unobstructed path to the bathroom',
          'A chair with arms for sitting down and standing up safely',
        ],
      },
      {
        heading: 'Stock the supplies you will need',
        body: ['Ask the surgical team what the wound and recovery need, then prepare:'],
        bullets: [
          'Prescribed medicines and a simple written dosage schedule',
          'Dressings and wound-care supplies as advised',
          'A thermometer to catch an early fever',
          'Comfortable, loose clothing that does not press on the wound',
        ],
      },
      {
        heading: 'Make the home safe and easy to move around',
        body: ['Reduce the risk of a fall or a wound complication:'],
        bullets: [
          'Remove trip hazards and loose rugs from walkways',
          'Add support where needed — grab bars near the bed and toilet',
          'Keep stairs to a minimum in the first days',
          'Arrange help in advance for lifting and bathing',
        ],
      },
      {
        heading: 'Why a clean recovery setup matters',
        body: [
          'The World Health Organization reports that surgical-site infections are the most frequent healthcare-associated infection in low- and middle-income countries, affecting roughly 11 of every 100 surgical patients — and that most are preventable. A clean recovery space, correct dressing changes, and early detection of infection are what keep recovery on track and avoid a readmission.',
        ],
      },
      {
        heading: 'What home nursing handles',
        body: [
          'A home nurse takes the technical load off the family — wound and dressing care, medication management, watching for infection, and coordinating a doctor review if healing stalls. Anees arranges this across Greater Cairo, with every visit recorded so the whole team follows the recovery.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I prepare my home before someone is discharged after surgery?',
        answer:
          'Set up one accessible recovery room with essentials within reach, stock prescribed medicines and dressings, remove trip hazards, add support near the bed and toilet, and arrange help for lifting and bathing. A home nurse can handle the wound care and monitoring.',
      },
      {
        question: 'When should I call a nurse or doctor after surgery?',
        answer:
          'Call promptly for increasing redness, swelling, or warmth around the wound, pus or a bad smell, increasing pain after the first few days, or fever — these can be early signs of infection. Anees can arrange an urgent review across Greater Cairo.',
      },
    ],
  },
  {
    slug: 'care-for-elderly-parent-at-home',
    category: 'how-to',
    title: 'How to Care for an Elderly Parent at Home in Egypt',
    description:
      'A practical guide for families caring for an elderly parent at home in Egypt — assessing needs, home safety, daily routine and medication, when to bring in professional help, and looking after yourself.',
    intro:
      'Caring for an ageing parent is one of the hardest, most loving things a family does — often while juggling work and children. This guide offers a practical framework for caring for an elderly parent at home in Egypt, and for knowing when to bring in professional support.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'A growing need',
        body: [
          'The World Health Organization projects that by 2030, one in six people worldwide will be aged 60 or over. As parents live longer, more families are managing chronic conditions, mobility, and daily care at home — and doing it well starts with an honest assessment of what your parent actually needs.',
        ],
      },
      {
        heading: 'Assess what your parent needs',
        body: ['Look honestly at where help is needed:'],
        bullets: [
          'Mobility — walking, stairs, getting in and out of bed',
          'Daily activities — washing, dressing, eating, toileting',
          'Medication — remembering doses and managing several medicines',
          'Health monitoring — blood pressure, glucose, weight, wounds',
          'Mood, memory, and social contact',
        ],
      },
      {
        heading: 'Make the home safe',
        body: ['Most accidents at home are preventable with a few changes:'],
        bullets: [
          'Remove trip hazards and secure loose rugs',
          'Add grab bars in the bathroom and near the bed',
          'Ensure good lighting, especially at night',
          'Keep frequently-used items within easy reach',
          'Choose supportive, non-slip footwear',
        ],
      },
      {
        heading: 'Build a daily routine',
        body: [
          'A steady routine keeps medication on time, meals regular, and the day predictable — which matters most for memory and chronic-disease control. Write down the medication schedule and keep all medical information in one place the whole family can find.',
        ],
      },
      {
        heading: 'When to bring in professional help — and how Anees helps',
        body: [
          'Bring in help when care becomes more than the family can safely manage — wound care, injections, post-hospital recovery, or simply needing reliable, trained hands. Anees coordinates home nursing, doctor visits, physiotherapy, and lab monitoring under one coordinator, with a record the family can follow — so the care builds over time instead of starting from scratch each visit.',
        ],
      },
      {
        heading: 'Look after yourself too',
        body: [
          'Carer burnout is real. Share the load, take breaks, and accept help — a rested carer gives better care. Respite support and a dependable care team are what make caring for a parent sustainable.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I start caring for an elderly parent at home?',
        answer:
          'Start with an honest assessment of mobility, daily activities, medication, and health monitoring; make the home safe; build a steady daily routine; and bring in professional help for anything beyond what the family can safely manage. Anees coordinates home nursing, doctor visits, and physiotherapy across Greater Cairo.',
      },
      {
        question: 'When should I get professional help for an elderly parent?',
        answer:
          'When care needs exceed what the family can safely provide — wound care, injections, post-hospital recovery, managing several conditions, or needing reliable trained support. One coordinator and a shared record keep that care consistent over time.',
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
  {
    slug: 'how-to-book-doctor-home-visit',
    category: 'how-to',
    title: 'كيف تحجز زيارة طبيب منزلية في مصر (خطوة بخطوة)',
    description:
      'دليل بسيط خطوة بخطوة لحجز زيارة طبيب منزلية في مصر مع أنيس هيلث — ما الذي تجهّزه، وكم تستغرق، وماذا يحدث أثناء الزيارة.',
    intro:
      'حجز طبيب ليأتي إلى منزلك في مصر لا يستغرق سوى دقائق. يرشدك هذا الدليل خطوة بخطوة، وما الذي تجهّزه، وما تتوقعه عند وصول الطبيب.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'الحجز خطوة بخطوة',
        body: ['مع أنيس هيلث، خمس خطوات قصيرة:'],
        bullets: [
          'اختر الخدمة — زيارة طبيب منزلية (والتخصص إن كنت تعرفه).',
          'حدّد التاريخ والوقت المناسبين لك.',
          'أدخل عنوان المريض في القاهرة الكبرى ورقم تواصل.',
          'أكّد — ادفع إلكترونياً عبر كاشير أو ادفع للطبيب عند الوصول.',
          'يؤكّد منسق أنيس خلال دقائق ويعيّن الطبيب المناسب.',
        ],
      },
      {
        heading: 'ما الذي تجهّزه',
        body: ['وجود هذه الأمور يجعل الزيارة أسرع وأكثر أماناً:'],
        bullets: [
          'عمر المريض والشكوى أو الأعراض الرئيسية',
          'قائمة بالأدوية الحالية',
          'أي نتائج تحاليل أو تقارير طبية حديثة',
          'العنوان بدقّة مع علامة مميزة قريبة',
        ],
      },
      {
        heading: 'في خلال كم يصل الطبيب؟',
        body: [
          'تُجدول معظم الزيارات الاعتيادية في نفس اليوم، ويمكن إرسال الزيارات العاجلة خلال ساعات بحسب توفر الطبيب في منطقتك. أنت تختار الوقت المناسب أثناء الحجز.',
        ],
      },
      {
        heading: 'ماذا يحدث أثناء الزيارة',
        body: [
          'يتأكد الطبيب من هوية المريض، يأخذ التاريخ المرضي، يفحص المريض، ويشرح التشخيص. ويمكنه وصف الأدوية وطلب تحاليل منزلية والنصح بالخطوات التالية — ويُوثَّق كل ذلك في الملف الطبي للمريض.',
        ],
      },
    ],
    faqs: [
      {
        question: 'في خلال كم يأتي الطبيب إلى منزلي في مصر؟',
        answer:
          'تُجدول معظم زيارات الأطباء المنزلية في نفس اليوم، ويمكن إرسال الزيارات العاجلة خلال ساعات بحسب التوفر في منطقتك. مع أنيس، يؤكّد المنسق خلال دقائق من الحجز.',
      },
      {
        question: 'هل يمكنني الدفع نقداً عند الوصول؟',
        answer:
          'نعم. مع أنيس هيلث يمكنك الدفع عبر الإنترنت أثناء الحجز من خلال بوابة كاشير الآمنة، أو الدفع عند الوصول. يُصدر إيصال في الحالتين، ويظهر السعر قبل التأكيد.',
      },
      {
        question: 'ماذا لو احتجت طبيباً متخصصاً في المنزل؟',
        answer:
          'يمكنك تحديد التخصص عند الحجز (مثل الأطفال أو الباطنة أو القلب). ويعيّن منسق أنيس طبيباً مرخّصاً في ذلك التخصص حيثما توفّر.',
      },
    ],
  },
  {
    slug: 'night-emergency-home-doctor-cairo',
    category: 'guide',
    title: 'زيارات الأطباء المنزلية الليلية والعاجلة في القاهرة',
    description:
      'تحتاج طبيباً في المنزل ليلاً أو بشكل عاجل في القاهرة؟ كيف تعمل الزيارات الليلية والعاجلة مع أنيس هيلث — ومتى يجب طلب الإسعاف بدلاً من ذلك.',
    intro:
      'المرض لا يلتزم بمواعيد العمل. فعندما ترتفع حرارة طفل منتصف الليل أو تسوء حالة أحد الوالدين المسنين فجأة، قد توفّر زيارة الطبيب المنزلية عناء رحلة ليلية متعبة إلى طوارئ مزدحمة. إليك كيف تعمل الزيارات الليلية والعاجلة في القاهرة — والأهم، متى يجب طلب الإسعاف بدلاً منها.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'متى تكون الزيارة الليلية أو العاجلة مناسبة',
        body: ['تناسب الزيارة المنزلية المشكلات العاجلة غير المهددة للحياة:'],
        bullets: [
          'الحمى والإنفلونزا والتهابات الجهاز التنفسي — خاصة للأطفال وكبار السن',
          'الجفاف بعد القيء أو الإسهال',
          'الإصابات والجروح والألم البسيط الذي لا يحتمل الانتظار للصباح',
          'نوبات تفاقم لحالة مزمنة معروفة',
        ],
      },
      {
        heading: 'متى تطلب الإسعاف بدلاً من ذلك',
        body: ['بعض الأعراض طوارئ تحتاج إسعافاً أو أقرب مستشفى — لا زيارة منزلية. والسكتة الدماغية تحديداً حساسة للوقت: في السكتة المعتادة يفقد الدماغ نحو 1.9 مليون خلية عصبية كل دقيقة دون علاج (مبدأ «الوقت دماغ» في طب الجلطات)، فالدقائق تُحدث فرقاً. اطلب المساعدة الطارئة فوراً عند:'],
        bullets: [
          'ألم أو ضغط في الصدر',
          'علامات السكتة الدماغية — استخدم فحص FAST المعتمد لدى جمعيات السكتة: تدلّي الوجه، ضعف الذراع، صعوبة الكلام، والوقت لطلب الإسعاف',
          'صعوبة شديدة في التنفس',
          'نزيف غزير أو إصابة خطيرة',
          'فقدان الوعي أو تشنّج',
        ],
      },
      {
        heading: 'كيف ترتّب أنيس الزيارات العاجلة',
        body: [
          'عند حجز زيارة عاجلة، يقيّم منسق أنيس الحالة ويرسل طبيباً مرخّصاً خلال ساعات بحسب التوفر في منطقتك، مع توثيق الزيارة في ملف المريض لأي متابعة.',
        ],
      },
      {
        heading: 'ملاحظة عن الشتاء',
        body: [
          'يرتفع الطلب على الزيارات الليلية والعاجلة بشدة في موسم إنفلونزا الشتاء (نوفمبر–فبراير)، خاصة للأطفال وكبار السن. وإن أمكن، احجز في بداية المساء بدلاً من وقت متأخر من الليل.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكنني الحصول على طبيب في المنزل ليلاً في القاهرة؟',
        answer:
          'نعم. ترتّب أنيس هيلث زيارات أطباء منزلية عاجلة وخارج ساعات العمل في القاهرة الكبرى بحسب توفر الكادر. ويرسل المنسق طبيباً مرخّصاً خلال ساعات للحالات غير الطارئة.',
      },
      {
        question: 'هل الزيارة المنزلية مناسبة للحمى المرتفعة؟',
        answer:
          'لمعظم حالات الحمى والإنفلونزا والالتهابات — نعم، الزيارة المنزلية مناسبة وتتجنّب طوارئ مزدحمة. لكن عند صعوبة التنفس الشديدة أو التشنّج أو فقدان الوعي، اطلب الإسعاف بدلاً من ذلك.',
      },
    ],
  },
  {
    slug: 'iv-drip-at-home-cairo',
    category: 'guide',
    title: 'المحاليل الوريدية والترطيب في المنزل بالقاهرة',
    description:
      'محاليل وريدية وترطيب في المنزل بالقاهرة مع أنيس هيلث — للجفاف والتعافي بعد المرض وحرّ صيف مصر، تُعطى بأمان على يد ممرض مرخّص وبناءً على نصيحة الطبيب.',
    intro:
      'الجفاف شائع في حرّ صيف مصر وبعد نوبات القيء أو الإسهال أو الحمى. والمحلول الوريدي في المنزل — يُعطى على يد ممرض مرخّص وبناءً على نصيحة الطبيب — يمكنه تعويض السوائل بسرعة دون رحلة للمستشفى. إليك متى يفيد وكيف يُعطى بأمان.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'متى يفيد المحلول الوريدي المنزلي',
        body: ['بناءً على نصيحة الطبيب، تُستخدم المحاليل المنزلية عادةً لـ:'],
        bullets: [
          'الجفاف من الحرّ أو من القيء والإسهال',
          'التعافي بعد الحمى أو نزلة معوية',
          'الإرهاق والضعف عندما لا تكفي السوائل عن طريق الفم',
        ],
      },
      {
        heading: 'كيف يُعطى بأمان في المنزل',
        body: [
          'يقوم ممرض مرخّص بتركيب الكانيولا وإدارتها، وضبط معدل التسريب الصحيح، ومراقبة المريض طوال الوقت — متّبعاً أمر الطبيب المعالج ومنتبهاً لأي رد فعل.',
        ],
      },
      {
        heading: 'ملاحظة مهمة عن السلامة',
        body: [
          'يجب أن تكون المحاليل والفيتامينات الوريدية مبرَّرة طبياً، لا روتينية. وتوصي منظمة الصحة العالمية بالترطيب الفموي كخط علاج أول للجفاف الخفيف إلى المتوسط، مع حصر المحاليل الوريدية في الحالات التي يرى الطبيب أنها تستلزمها — لذا ينبغي أن يقيّم الطبيب المريض أولاً للتأكد من أن المحلول هو الخيار الصحيح وتحديد الوصفة. تنسّق أنيس مراجعة طبيب عند الحاجة قبل زيارة الممرض.',
        ],
      },
      {
        heading: 'نصيحة صيفية',
        body: [
          'كبار السن وأصحاب الأمراض المزمنة هم الأكثر عرضة للجفاف في حرّ الصيف. انتبه للدوخة والبول الداكن والتشوّش وقلة التبول — واطلب المشورة الطبية مبكراً.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل يمكنني الحصول على محلول وريدي في المنزل بالقاهرة؟',
        answer:
          'نعم. ترتّب أنيس هيلث المحاليل الوريدية المنزلية في القاهرة الكبرى، يقدّمها ممرض مرخّص — بناءً على نصيحة الطبيب. ويمكن تنسيق مراجعة طبيب أولاً للتأكد من ملاءمتها.',
      },
      {
        question: 'هل المحلول الوريدي المنزلي آمن؟',
        answer:
          'عند إعطائه بواسطة ممرض مرخّص ووفق أمر الطبيب مع المراقبة المناسبة، يكون المحلول المنزلي آمناً. ويجب أن تكون المحاليل الوريدية مبرَّرة طبياً لا روتينية، لذا ينبغي أن يقيّم الطبيب المريض أولاً.',
      },
    ],
  },
  {
    slug: 'diabetes-care-ramadan',
    category: 'guide',
    title: 'إدارة مرض السكري في المنزل خلال رمضان',
    description:
      'كيف يصوم مرضى السكري بأمان أكبر في رمضان — مراقبة الجلوكوز وتوقيت الأدوية والعلامات التحذيرية وكيف يدعم التمريض المنزلي ذلك في مصر.',
    intro:
      'الصيام في رمضان يعني الكثير لمرضى السكري، لكنه يغيّر أنماط الجلوكوز والأدوية ويحمل مخاطر حقيقية. ومع المراقبة والدعم المناسبين في المنزل، يستطيع كثيرون الصيام بأمان أكبر. إليك ما تنتبه له وكيف تساعد الرعاية المنزلية — دائماً إلى جانب إرشادات طبيبك.',
    datePublished: '2026-06-25',
    dateModified: '2026-06-25',
    sections: [
      {
        heading: 'استشر طبيبك قبل الصيام',
        body: [
          'مرض السكري شائع بشكل خاص في مصر: يقدّر الاتحاد الدولي للسكري أن نحو واحد من كل خمسة بالغين مصريين — أي قرابة 13 مليون شخص — مصاب بالسكري، لذا فإن إرشادات الصيام الآمن تهمّ عدداً كبيراً من الأسر. وتعتمد سلامة الصيام على نوع السكري ومدى انضباطه وأي مضاعفات وأدويتك. احصل على نصيحة فردية من طبيبك قبل رمضان — فبعض الأشخاص يُنصحون بعدم الصيام، وهذا قرار طبي.',
        ],
      },
      {
        heading: 'مراقبة الجلوكوز خلال رمضان',
        body: ['افحص سكر الدم أكثر من المعتاد:'],
        bullets: [
          'قبل السحور وقبل الإفطار',
          'منتصف بعد الظهر، حين يكون خطر الهبوط أعلى',
          'في أي وقت تشعر فيه بتوعّك',
          'فحص سكر الدم لا يفطّر الصائم.',
        ],
      },
      {
        heading: 'توقيت الأدوية',
        body: [
          'غالباً ما تتغيّر جرعات الأدوية وتوقيتها إلى السحور والإفطار في رمضان — لكن لا تعدّلها إلا مع طبيبك. ولا تتخطَّ الإنسولين أو تغيّره من تلقاء نفسك؛ فالتعديل الصحيح يعتمد على نظامك الدوائي.',
        ],
      },
      {
        heading: 'متى تفطر',
        body: ['أفطر وعالج فوراً إذا كان لديك:'],
        bullets: [
          'هبوط سكر — رعشة أو تعرّق أو تشوّش أو قراءة منخفضة جداً',
          'ارتفاع شديد في سكر الدم',
          'علامات جفاف',
        ],
      },
      {
        heading: 'كيف تدعم أنيس رعاية السكري في رمضان',
        body: [
          'تنسّق أنيس التمريض المنزلي لفحوصات الجلوكوز والحقن، ومتابعة الطبيب لتعديل الخطة، وإدارة الأدوية — ليحظى المريض والأسرة بالدعم طوال الشهر.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل فحص سكر الدم يفطّر الصائم؟',
        answer:
          'لا. وخز الإصبع لفحص سكر الدم لا يفطّر الصائم، ويُنصح بالفحص المتكرر خلال رمضان لاكتشاف الارتفاع أو الهبوط مبكراً.',
      },
      {
        question: 'هل يستطيع مريض السكري الصيام في رمضان؟',
        answer:
          'يستطيع كثيرون الصيام بأمان مع التحضير الجيد، لكنه قرار طبي فردي. تحدّث إلى طبيبك قبل رمضان — فبعض الأشخاص، حسب انضباطهم ومضاعفاتهم، يُنصحون بعدم الصيام.',
      },
      {
        question: 'كيف يساعد التمريض المنزلي خلال رمضان؟',
        answer:
          'يمكن لممرض منزلي إجراء فحوصات الجلوكوز والحقن المنتظمة، ودعم توقيت الأدوية، ومراقبة العلامات التحذيرية، بينما يعدّل الطبيب الخطة — دعم مفيد لمرضى السكري وكبار السن الصائمين.',
      },
    ],
  },
  {
    slug: 'best-home-nursing-cairo',
    category: 'guide',
    title: 'أفضل تمريض منزلي في القاهرة: كيف تختار (2026)',
    description:
      'تبحث عن أفضل تمريض منزلي في القاهرة؟ المعايير التي تهم فعلاً — الترخيص والاستمرارية والأسعار الشفافة والمساءلة — وكيف تقيّم مقدّم الخدمة قبل أن تلتزم.',
    intro:
      'البحث عن «أفضل» تمريض منزلي في القاهرة يعطيك جداراً من الشركات المتشابهة. الفرق الحقيقي ليس في الإعلانات — بل في الترخيص واستمرارية الرعاية والأسعار الشفافة ومن يتحمّل المسؤولية عند حدوث خطأ. يمنحك هذا الدليل المعايير التي تميّز التمريض المنزلي الجيد فعلاً عن غيره.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'ماذا تعني «الأفضل» في التمريض المنزلي',
        body: [
          'أفضل تمريض منزلي ليس الأرخص ولا صاحب أكبر ميزانية إعلانية — بل من يرسل ممرضاً مرخّصاً مناسباً للحالة، ويعود بانتظام، ويعمل من سجل لما تم سابقاً، ويكون شفافاً في السعر والمساءلة. ولمريض مسن أو بعد عملية، تهم استمرارية الرعاية أكثر من أي شيء آخر تقريباً.',
        ],
      },
      {
        heading: 'المعايير التي تهم',
        body: ['احكم على مقدّم التمريض المنزلي في القاهرة بهذه المعايير، لا بالإعلان:'],
        bullets: [
          'الترخيص: كل ممرض مسجّل في نقابة التمريض/الأطباء المصرية، ويُتحقّق منه قبل الزيارة.',
          'الاستمرارية: يعود الفريق الصغير نفسه، ويعمل من سجل — لا وجه غريب جديد كل مرة.',
          'أسعار شفافة: يظهر السعر مكتوباً قبل الحجز.',
          'منسق واحد مسؤول يدير الحالة ويبقي الأسرة على اطلاع.',
          'ممارسات واضحة لمكافحة العدوى والسلامة في المنزل.',
          'توثيق كل زيارة، لتتراكم الرعاية مع الوقت.',
          'شروط واضحة للإلغاء وإعادة الجدولة معلنة مسبقاً.',
        ],
      },
      {
        heading: 'أسئلة تطرحها قبل أن تلتزم',
        body: ['بضعة أسئلة مباشرة تميّز سريعاً مقدّم الخدمة الآمن عن غيره:'],
        bullets: [
          'هل الممرض مرخّص من النقابة، وهل تتحققون من الترخيص؟',
          'هل يعود الممرض نفسه أو الفريق الصغير نفسه كل زيارة؟',
          'هل يُؤكَّد السعر مكتوباً قبل الزيارة؟',
          'بمن أتصل إذا حدثت مشكلة، ليلاً أو نهاراً؟',
          'هل تُوثَّق كل زيارة في سجل يمكنني الاطلاع عليه؟',
        ],
      },
      {
        heading: 'كيف تختلف أنيس هيلث',
        body: [
          'بُنيت أنيس حول هذه المعايير بالضبط: كل ممرض مرخّص من النقابة ومُتحقَّق من اعتماده قبل أي زيارة، ومنسق واحد يدير الحالة بالكامل، وكل زيارة تُسجَّل في ملف طبي حقيقي، ويظهر السعر قبل التأكيد. تلك الاستمرارية — فريق يتذكّر — هي ما يحوّل سلسلة زيارات إلى رعاية مُدارة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'ما الذي أبحث عنه في شركة تمريض منزلي بالقاهرة؟',
        answer:
          'ابحث عن ترخيص نقابي مُتحقَّق منه، واستمرارية (عودة الفريق نفسه والعمل من سجل)، وأسعار شفافة تظهر قبل الحجز، ومنسق واحد مسؤول، وتوثيق للزيارات. هذه تهم أكثر من أقل سعر معلن.',
      },
      {
        question: 'كم تكلفة التمريض المنزلي في القاهرة؟',
        answer:
          'يُسعَّر التمريض المنزلي في القاهرة بالزيارة أو بالوردية أو بباقة شهرية، ويختلف بحسب مؤهل الممرض والمنطقة ومدة الوردية. ومع أنيس هيلث يُؤكَّد السعر الدقيق قبل الحجز.',
      },
    ],
  },
  {
    slug: 'best-home-physiotherapy-cairo',
    category: 'guide',
    title: 'أفضل علاج طبيعي منزلي في القاهرة: كيف تختار',
    description:
      'كيف تجد أفضل علاج طبيعي منزلي في القاهرة — ما الذي يجب أن يقدّمه أخصائي مرخّص، وعلامات برنامج التأهيل الجيد، والأسئلة التي تطرحها قبل الحجز.',
    intro:
      'قد يكون العلاج الطبيعي المنزلي هو الفارق بين تعافٍ كامل وآخر متعثّر — لكن الجودة تتفاوت كثيراً. يشرح هذا الدليل كيف يبدو العلاج الطبيعي المنزلي الجيد في القاهرة، وكيف تميّز برنامج تأهيل منظّماً عن جلسة تدليك عابرة.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'ما يشمله العلاج الطبيعي المنزلي الجيد',
        body: [
          'يبدأ العلاج الطبيعي الجيد بتقييم سليم، ويضع أهدافاً قابلة للقياس، ويتبع خطة مكتوبة، ويتابع التقدم زيارة بعد زيارة، وينسّق مع الطبيب المعالج. ويقدّمه أخصائي علاج طبيعي مرخّص — لا مدلّك غير مؤهل — ويتكيّف مع تحسّن المريض.',
        ],
      },
      {
        heading: 'علامات برنامج تأهيل جيد',
        body: ['ابحث عن هذه المؤشرات الدالة على برنامج حقيقي بدلاً من جلسات عشوائية:'],
        bullets: [
          'تقييم مبدئي سليم قبل أي علاج',
          'خطة مكتوبة قائمة على أهداف بنقطة نهاية واضحة',
          'قياس التقدم بموضوعية (مدى الحركة، التوازن، القوة)',
          'أخصائي علاج طبيعي مرخّص بأوراق يمكن التحقق منها',
          'التنسيق مع طبيب المريض عند الحاجة',
          'توثيق كل جلسة ليكون التقدم مرئياً',
        ],
      },
      {
        heading: 'أسئلة تطرحها قبل الحجز',
        body: ['تكشف هذه الأسئلة ما إذا كنت تحصل على تأهيل منظّم أم زيارة عامة:'],
        bullets: [
          'هل أنت أخصائي علاج طبيعي مرخّص، وهل يمكنني التحقق؟',
          'هل ستقيّم المريض قبل بدء العلاج؟',
          'كيف ستقيس التقدم؟',
          'كم جلسة تتوقع، ولماذا؟',
          'ماذا يحدث إذا توقّف التقدم؟',
        ],
      },
      {
        heading: 'كيف تتعامل أنيس هيلث مع العلاج الطبيعي المنزلي',
        body: [
          'ترسل أنيس أخصائيي علاج طبيعي مرخّصين يقيّمون أولاً، ويعملون وفق برنامج منظّم (مثل خطة تأهيل من 12 جلسة)، ويسجّلون تقدماً قابلاً للقياس في ملف طبي واحد، وينسّقون مع الطبيب وفريق التمريض — فيكون التعافي متابَعاً لا مُخمَّناً.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كيف أجد أخصائي علاج طبيعي جيداً للزيارات المنزلية في القاهرة؟',
        answer:
          'اختر أخصائياً مرخّصاً يقيّم المريض أولاً، ويعمل وفق خطة مكتوبة قائمة على أهداف، ويقيس التقدم بموضوعية، ويوثّق كل جلسة. توفّر أنيس هيلث أخصائيين مُتحقَّق من اعتمادهم في القاهرة الكبرى.',
      },
      {
        question: 'كم جلسة علاج طبيعي منزلي سأحتاج؟',
        answer:
          'يعتمد على الحالة والأهداف — يحدّد التقييم السليم العدد. وتقدّم أنيس برامج منظّمة (مثل خطة تأهيل من 12 جلسة) وتراجع التقدم خلالها.',
      },
    ],
  },
  {
    slug: 'home-visit-vs-clinic',
    category: 'comparison',
    title: 'زيارة الطبيب المنزلية مقابل زيارة العيادة في مصر: أيهما أنسب؟',
    description:
      'متى تكون زيارة الطبيب المنزلية أفضل من الذهاب إلى العيادة في مصر — ومتى تكون العيادة أو المستشفى الخيار الأكثر أماناً؟ مقارنة واضحة تساعد الأسر على القرار.',
    intro:
      'في كثير من الحالات يمكن أن يأتي الطبيب إليك بدلاً من سفرك إلى العيادة — لكن ليس دائماً. يقارن هذا الدليل بين الزيارة المنزلية وزيارة العيادة لتختار الأنسب للمريض أمامك.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'متى تكون الزيارة المنزلية الخيار الأفضل',
        body: ['تكون زيارة الطبيب المنزلية عادةً الخيار الأفضل عندما:'],
        bullets: [
          'يكون المريض مسناً أو بعد عملية أو محدود الحركة',
          'تكون كشفاً اعتيادياً أو متابعة أو مرضاً بسيطاً',
          'تريد تجنّب التعرض للعدوى في غرفة انتظار مزدحمة',
          'تحتاج متابعة مستمرة لمرض مزمن',
          'يمكن تقديم الرعاية في المنزل — محاليل وريدية أو عناية بالجروح أو سحب عينات',
        ],
      },
      {
        heading: 'متى تكون العيادة أو المستشفى أفضل',
        body: ['اذهب إلى عيادة أو مستشفى — أو اطلب إسعافاً — عندما:'],
        bullets: [
          'تكون هناك حالة طارئة (ألم في الصدر، علامات جلطة، صعوبة شديدة في التنفس)',
          'يحتاج الإجراء أجهزة متوفرة في الموقع فقط',
          'يلزم تصوير متقدّم (أشعة مقطعية أو رنين مغناطيسي)',
          'تلزم جراحة أو إجراء تخصصي',
        ],
      },
      {
        heading: 'مقارنة سريعة',
        body: [
          'تتفوّق الزيارة المنزلية في الراحة والطمأنينة وقلة خطر العدوى، وتناسب الرعاية الاعتيادية والمتابعة وكبار السن والحالات المزمنة. وتتفوّق العيادة أو المستشفى في الأجهزة والتصوير والطوارئ. والخيار الصحيح يعتمد على الموقف لا على قاعدة عامة — وللرعاية الاعتيادية والمستمرة في المنزل، تبقى الاستمرارية هي الميزة الحقيقية.',
        ],
      },
      {
        heading: 'أين تقع أنيس هيلث',
        body: [
          'تتولّى أنيس الجانب المناسب للمنزل — زيارات الأطباء والتمريض والعلاج الطبيعي والتحاليل — وتكون واضحة بشأن متى تكون العيادة أو الطوارئ المكان الأكثر أماناً. ويساعدك المنسق على اتخاذ هذا القرار بدلاً من إرسال زيارة منزلية حين لا تكون مناسبة.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل زيارة الطبيب المنزلية بجودة الذهاب إلى العيادة؟',
        answer:
          'للرعاية الاعتيادية والمتابعة والأمراض البسيطة ومتابعة الأمراض المزمنة، تكون الزيارة المنزلية بنفس الفعالية وأكثر راحة — خاصة لكبار السن ومرضى ما بعد العمليات. أما الطوارئ والتصوير المتقدّم والجراحة فمكانها العيادة أو المستشفى.',
      },
      {
        question: 'متى يجب ألا أستخدم الزيارة المنزلية؟',
        answer:
          'تجنّب الزيارة المنزلية في الطوارئ (ألم الصدر، علامات الجلطة، صعوبة التنفس الشديدة)، وللتصوير المتقدّم مثل الأشعة المقطعية أو الرنين، وللجراحة. وفي الطوارئ اطلب إسعافاً أو اذهب لأقرب مستشفى.',
      },
    ],
  },
  {
    slug: 'home-nursing-vs-private-nurse',
    category: 'comparison',
    title: 'شركة تمريض منزلي مقابل توظيف ممرض خاص في مصر',
    description:
      'هل توظّف ممرضاً خاصاً مباشرةً أم تستعين بشركة تمريض منزلي في مصر؟ المفاضلات الصادقة في الترخيص والمساءلة والاستمرارية والتكلفة.',
    intro:
      'عندما تحتاج الأسرة تمريضاً مستمراً في المنزل، يكون الاختيار عادةً بين توظيف ممرض خاص مباشرةً والاستعانة بشركة تمريض منزلي. يبدوان متشابهين لكنهما يختلفان بوضوح في المساءلة والتحقق من الترخيص وما يحدث عند الخطأ. إليك المقارنة الصادقة.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'توظيف ممرض خاص مباشرةً',
        body: [
          'قد يبدو توظيف ممرض مباشرةً أرخص وأكثر خصوصية، لكن العبء يقع على الأسرة: أنت تتحقق من الترخيص بنفسك، وتغطّي الغياب وأيام المرض، وتتعامل مع أي خلاف، وغالباً لا يوجد سجل موثّق ولا دعم طبي إذا تدهورت حالة المريض.',
        ],
        bullets: [
          'ميزة محتملة: تكلفة معلنة أقل وعلاقة مباشرة',
          'تتحقق من المؤهلات والترخيص بنفسك',
          'لا بديل إذا مرض الممرض أو لم يتوفر',
          'لا منسق ولا مسار تصعيد عند حدوث خطأ',
          'لا دعم طبي ولا سجل موثّق',
        ],
      },
      {
        heading: 'الاستعانة بشركة تمريض منزلي',
        body: [
          'ترسل شركة تمريض منزلي موثوقة ممرضاً مرخّصاً مُدقَّقاً، وتغطّي الغياب، وتوفّر منسقاً مسؤولاً ودعماً طبياً، وتحتفظ بسجل موثّق — عادةً بسعر أعلى لكنه شفاف. أنت تقايض قليلاً من التكلفة بالمساءلة والاستمرارية.',
        ],
        bullets: [
          'التحقق من المؤهلات قبل زيارة الممرض',
          'ترتيب بديل إذا لم يتوفر ممرض',
          'منسق واحد مسؤول ومسار تصعيد واضح',
          'دعم طبي وسجل طبي موثّق',
          'أسعار شفافة تظهر قبل الحجز',
        ],
      },
      {
        heading: 'أيهما الأنسب لك',
        body: [
          'للاحتياجات قصيرة المدى والبسيطة، قد يفي أي منهما. أما للمريض المعقّد أو المسن أو بعد العملية — أو أي حالة تحتاج إشرافاً طبياً واستمرارية — فالشركة هي الخيار الأكثر أماناً، لأن المساءلة والسجل مدمجان فيها لا متروكان للأسرة.',
        ],
      },
      {
        heading: 'كيف تعمل أنيس هيلث',
        body: [
          'توفّر أنيس ممرضين مرخّصين من النقابة ومُتحقَّق من اعتمادهم مع منسق واحد ودعم طبي وسجل طبي موثّق وتغطية للغياب والسعر معروضاً قبل الحجز — مساءلة الشركة مع استمرارية فريق مخصّص.',
        ],
      },
    ],
    faqs: [
      {
        question: 'هل توظيف ممرض خاص مباشرةً أرخص؟',
        answer:
          'قد تكون التكلفة المعلنة أقل، لكنك تتحمّل بنفسك التحقق من المؤهلات وتغطية الغياب والمساءلة وغياب السجل الطبي. أما شركة التمريض المنزلي فتُدمج هذه في سعر شفاف.',
      },
      {
        question: 'ما مخاطر توظيف ممرض خاص دون شركة؟',
        answer:
          'أبرز المخاطر: مؤهلات غير مُتحقَّق منها، ولا بديل إذا لم يتوفر الممرض، ولا مساءلة أو تصعيد عند الخطأ، ولا دعم طبي، ولا سجل موثّق للرعاية المقدّمة.',
      },
    ],
  },
  {
    slug: 'prepare-home-after-surgery',
    category: 'how-to',
    title: 'كيف تجهّز المنزل للتعافي بعد العملية (مصر)',
    description:
      'قائمة عملية لتجهيز المنزل قبل خروج المريض بعد العملية في مصر — مساحة تعافٍ آمنة، والمستلزمات، والحركة، والعلامات التحذيرية التي تنتبه لها.',
    intro:
      'قليل من التجهيز قبل الخروج من المستشفى يجعل التعافي في المنزل أكثر أماناً وهدوءاً وسرعة. هذا الدليل قائمة عملية لتجهيز المنزل قبل عودة المريض من العملية — وكيف يسدّ التمريض المنزلي الفجوات.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'هيّئ مساحة للتعافي',
        body: ['جهّز غرفة واحدة مريحة وسهلة الوصول قبل الخروج:'],
        bullets: [
          'سرير يستطيع المريض النزول منه والصعود إليه بأمان، ويُفضّل في الدور الأرضي',
          'الأساسيات في متناول اليد — ماء، أدوية، هاتف، مناديل، جرس',
          'إضاءة جيدة وممر واضح غير معاق إلى الحمام',
          'كرسي بمساند للجلوس والوقوف بأمان',
        ],
      },
      {
        heading: 'جهّز المستلزمات التي ستحتاجها',
        body: ['اسأل الفريق الجراحي عمّا يحتاجه الجرح والتعافي، ثم جهّز:'],
        bullets: [
          'الأدوية الموصوفة وجدول جرعات مكتوب وبسيط',
          'الضمادات ومستلزمات العناية بالجرح حسب التوصية',
          'ميزان حرارة لاكتشاف الحمى مبكراً',
          'ملابس فضفاضة مريحة لا تضغط على الجرح',
        ],
      },
      {
        heading: 'اجعل المنزل آمناً وسهل الحركة',
        body: ['قلّل خطر السقوط أو مضاعفات الجرح:'],
        bullets: [
          'أزل مخاطر التعثّر والسجاد غير المثبّت من الممرات',
          'أضف الدعم حيث يلزم — مقابض إمساك بجوار السرير والمرحاض',
          'قلّل استخدام السلالم في الأيام الأولى',
          'رتّب مساعدة مسبقاً للرفع والاستحمام',
        ],
      },
      {
        heading: 'لماذا تهم بيئة التعافي النظيفة',
        body: [
          'تفيد منظمة الصحة العالمية بأن عدوى موضع الجراحة هي أكثر أنواع العدوى المرتبطة بالرعاية الصحية شيوعاً في الدول منخفضة ومتوسطة الدخل، وتصيب نحو 11 من كل 100 مريض جراحي — ومعظمها يمكن الوقاية منه. ومساحة تعافٍ نظيفة، وتغيير الضمادات بشكل صحيح، والكشف المبكر عن العدوى هي ما يُبقي التعافي على المسار ويتجنّب إعادة الدخول للمستشفى.',
        ],
      },
      {
        heading: 'ما يتولّاه التمريض المنزلي',
        body: [
          'يأخذ الممرض المنزلي العبء التقني عن الأسرة — العناية بالجرح والضمادات، وإدارة الأدوية، ومراقبة العدوى، وتنسيق مراجعة طبيب إذا تعثّر الالتئام. ترتّب أنيس ذلك في القاهرة الكبرى، مع توثيق كل زيارة ليتابع الفريق كله التعافي.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كيف أجهّز منزلي قبل خروج المريض بعد العملية؟',
        answer:
          'هيّئ غرفة تعافٍ واحدة سهلة الوصول مع الأساسيات في متناول اليد، وجهّز الأدوية الموصوفة والضمادات، وأزل مخاطر التعثّر، وأضف الدعم بجوار السرير والمرحاض، ورتّب مساعدة للرفع والاستحمام. يمكن لممرض منزلي تولّي العناية بالجرح والمتابعة.',
      },
      {
        question: 'متى أتصل بممرض أو طبيب بعد العملية؟',
        answer:
          'اتصل فوراً عند زيادة الاحمرار أو التورم أو الحرارة حول الجرح، أو صديد أو رائحة كريهة، أو ازدياد الألم بعد الأيام الأولى، أو حمى — فقد تكون علامات عدوى مبكرة. تستطيع أنيس ترتيب مراجعة عاجلة في القاهرة الكبرى.',
      },
    ],
  },
  {
    slug: 'care-for-elderly-parent-at-home',
    category: 'how-to',
    title: 'كيف تعتني بأحد الوالدين المسنين في المنزل بمصر',
    description:
      'دليل عملي للأسر التي تعتني بأحد الوالدين المسنين في المنزل بمصر — تقييم الاحتياجات، وأمان المنزل، والروتين اليومي والأدوية، ومتى تستعين بمساعدة متخصصة، ورعاية نفسك أيضاً.',
    intro:
      'رعاية أحد الوالدين المتقدّم في السن من أصعب ما تقوم به الأسرة وأكثره محبة — غالباً مع التوفيق بين العمل والأبناء. يقدّم هذا الدليل إطاراً عملياً لرعاية أحد الوالدين المسنين في المنزل بمصر، ولمعرفة متى تستعين بدعم متخصص.',
    datePublished: '2026-06-26',
    dateModified: '2026-06-26',
    sections: [
      {
        heading: 'حاجة متزايدة',
        body: [
          'تتوقّع منظمة الصحة العالمية أنه بحلول عام 2030 سيكون واحد من كل ستة أشخاص في العالم في عمر 60 عاماً أو أكثر. ومع طول أعمار الآباء، تدير أسر أكثر الأمراض المزمنة والحركة والرعاية اليومية في المنزل — وحُسن القيام بذلك يبدأ بتقييم صادق لما يحتاجه والدك فعلاً.',
        ],
      },
      {
        heading: 'قيّم ما يحتاجه والدك',
        body: ['انظر بصدق إلى مواضع الحاجة للمساعدة:'],
        bullets: [
          'الحركة — المشي والسلالم والنزول من السرير والصعود إليه',
          'الأنشطة اليومية — الاستحمام واللبس والأكل ودخول الحمام',
          'الأدوية — تذكّر الجرعات وإدارة عدة أدوية',
          'متابعة الصحة — ضغط الدم والسكر والوزن والجروح',
          'المزاج والذاكرة والتواصل الاجتماعي',
        ],
      },
      {
        heading: 'اجعل المنزل آمناً',
        body: ['معظم الحوادث المنزلية يمكن الوقاية منها بتغييرات بسيطة:'],
        bullets: [
          'أزل مخاطر التعثّر وثبّت السجاد',
          'أضف مقابض إمساك في الحمام وبجوار السرير',
          'وفّر إضاءة جيدة، خاصة ليلاً',
          'اجعل الأشياء كثيرة الاستخدام في متناول اليد',
          'اختر حذاءً داعماً مانعاً للانزلاق',
        ],
      },
      {
        heading: 'ابنِ روتيناً يومياً',
        body: [
          'الروتين الثابت يُبقي الأدوية في مواعيدها والوجبات منتظمة واليوم متوقّعاً — وهو الأهم للذاكرة والتحكم في الأمراض المزمنة. اكتب جدول الأدوية واحتفظ بكل المعلومات الطبية في مكان واحد تجده الأسرة كلها.',
        ],
      },
      {
        heading: 'متى تستعين بمساعدة متخصصة — وكيف تساعد أنيس',
        body: [
          'استعن بالمساعدة عندما تصبح الرعاية أكبر مما تستطيع الأسرة إدارته بأمان — العناية بالجروح، أو الحقن، أو التعافي بعد المستشفى، أو ببساطة الحاجة إلى أيدٍ مدرّبة موثوقة. تنسّق أنيس التمريض المنزلي وزيارات الطبيب والعلاج الطبيعي ومراقبة التحاليل تحت منسق واحد، مع سجل تتابعه الأسرة — لتتراكم الرعاية مع الوقت بدلاً من البدء من الصفر كل زيارة.',
        ],
      },
      {
        heading: 'اعتنِ بنفسك أيضاً',
        body: [
          'إنهاك مقدّم الرعاية حقيقي. وزّع العبء، وخذ فترات راحة، واقبل المساعدة — فمقدّم الرعاية المرتاح يقدّم رعاية أفضل. ودعم الراحة وفريق رعاية موثوق هما ما يجعل رعاية أحد الوالدين قابلة للاستمرار.',
        ],
      },
    ],
    faqs: [
      {
        question: 'كيف أبدأ رعاية أحد الوالدين المسنين في المنزل؟',
        answer:
          'ابدأ بتقييم صادق للحركة والأنشطة اليومية والأدوية ومتابعة الصحة؛ واجعل المنزل آمناً؛ وابنِ روتيناً يومياً ثابتاً؛ واستعن بمساعدة متخصصة لأي شيء يتجاوز ما تستطيع الأسرة تقديمه بأمان. تنسّق أنيس التمريض المنزلي وزيارات الطبيب والعلاج الطبيعي في القاهرة الكبرى.',
      },
      {
        question: 'متى أحصل على مساعدة متخصصة لأحد الوالدين المسنين؟',
        answer:
          'عندما تتجاوز احتياجات الرعاية ما تستطيع الأسرة تقديمه بأمان — العناية بالجروح، أو الحقن، أو التعافي بعد المستشفى، أو إدارة عدة أمراض، أو الحاجة إلى دعم مدرّب موثوق. ومنسق واحد وسجل مشترك يُبقيان تلك الرعاية متسقة عبر الوقت.',
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
