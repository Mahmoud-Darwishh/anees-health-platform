# Anees Health — SEO / AEO / GEO / AI-Search Visibility Audit & Strategy

> **Prepared:** 25 Jun 2026 · **Domain:** aneeshealth.com · **Scope:** bilingual EN/AR public marketing surface (`src/app/[locale]/`) · **Stack:** Next.js 16 App Router.
> **Method:** grounded in the actual repo (SEO layer, robots, sitemaps, schema, config, home components) + live web research. 9 competitors individually verified. Current 2026 AEO/GEO standards confirmed. Off-site footprint reviewed.
> **Status of this doc:** strategy + implementation plan. No code has been changed yet.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Current visibility scorecard](#2-current-visibility-scorecard)
3. [Repository audit findings](#3-repository-audit-findings)
4. [SEO findings & fixes](#4-seo-findings--fixes)
5. [AEO findings & fixes](#5-aeo-findings--fixes)
6. [GEO findings & fixes](#6-geo-findings--fixes)
7. [LLM visibility & the `llms.txt` files](#7-llm-visibility--the-llmstxt-files)
8. [Competitor research (9 verified)](#8-competitor-research-9-verified)
9. [Care Hub — deep dive (new)](#9-care-hub--deep-dive-new)
10. [Market & SERP landscape](#10-market--serp-landscape)
11. [Off-site authority & E-E-A-T](#11-off-site-authority--e-e-a-t)
12. [Differentiation & positioning](#12-differentiation--positioning)
13. [Content roadmap (11 clusters)](#13-content-roadmap-11-clusters)
14. [Ready-to-paste files](#14-ready-to-paste-files)
15. [Answer-ready content (EN + AR)](#15-answer-ready-content-en--ar)
16. [Doctor & clinician search discoverability](#16-doctor--clinician-search-discoverability)
17. [Sprints & phases](#17-sprints--phases)
18. [30 / 60 / 90-day plan](#18-30--60--90-day-plan)
19. [Master priority checklist](#19-master-priority-checklist)
20. [Sources](#20-sources)
21. [Implementation log](#21-implementation-log)

---

## 1. Executive summary

Anees Health has a **senior-grade SEO foundation bolted to a near-empty content surface.** The plumbing — bilingual metadata, correct hreflang (`en-US`/`ar-EG`/`x-default`), ~13 JSON-LD schema builders, a robots file welcoming ~22 AI crawlers, security headers, AVIF/WebP — is better than most funded startups. But only **7 public page types exist**, and the single biggest commercial opportunity (service + specialty + neighbourhood pages) is **fully built in code and never switched on.** The homepage's own "Services" button is a dead 404.

**The three things that matter most:**

1. **Turn on what you already built.** `/services` and `/specialties` have finished content, schema, and metadata sitting as dead code. Routing them is the largest organic gain in this audit for the least effort.
2. **Win the map, not the robot.** Research overturned a key assumption: **Google switched OFF AI Overviews for local health queries** (100% → 0% by Dec 2025). Transactional "near me" queries are won by **Google Business Profile + reviews + neighbourhood pages** — and Anees has *no* Google Business Profile.
3. **Own a category nobody claims.** Every competitor sells a *transaction*. None can answer "who's holding my parent's whole case?" Anees's real FHIR record + credential-verified clinicians + one coordinator + transparent pricing lets it own **"Managed Home Care — the home care that remembers."**

**Reality checks (so budget isn't wasted):**
- `llms.txt` is worth shipping but won't move the needle today (Google declined it; ~10% adoption). Cheap insurance, not a channel.
- **FAQ and HowTo "rich result" stars are dead** (Google removed FAQ rich results June 2026). Keep the schema for AI comprehension; don't chase stars.
- Never add `aggregateRating` to your own org (the hardcoded "4.8★/1,000+" trust strip must stay un-marked-up) — self-serving ratings violate Google policy. Earn real Google reviews instead.

---

## 2. Current visibility scorecard

| Dimension | Score | Verdict |
|---|---|---|
| Technical SEO foundation | 8.5/10 | Excellent metadata/hreflang/headers; a few crawl bugs. |
| Structured data (schema) | 7/10 | Rich vocabulary; ~5 builders never emitted; `/about-us` entity bug. |
| Indexable content depth | 2.5/10 | Only 7 page types; entire mid-funnel unrouted; no blog/location/pricing/comparison. |
| On-page / internal linking | 4/10 | Good per-page semantics; sitewide links to 404s; doctor pages dead-end. |
| AEO (answer-engine readiness) | 3/10 | Great FAQ copy, but no `/faq` hub, no pricing answers, no extractable service pages. |
| GEO (generative citation) | 3/10 | Crawler-friendly robots, nothing citable yet. |
| LLM discoverability files | 1/10 | No `llms.txt` / `llms-full.txt`. |
| Off-site authority / E-E-A-T | 2.5/10 | Clean social handles; no GBP, no directory citations, no Wikidata/Crunchbase, name collision. |
| Local SEO (the money lever) | 1.5/10 | No GBP, no reviews, no neighbourhood pages. |

**Overall ≈ 3.8/10 realized on a 9/10 foundation.** Most of the gap closes by *building pages and a Google Business Profile*, not re-architecting.

> ⚠️ **Deploy drift:** the *indexed* homepage still shows "...Home Healthcare **& Telemedicine** Egypt | Anees Health" while the current repo positions telemedicine out of the headline. **The live site is an older build than the code** — a redeploy ships several improvements already written. Also check the duplicated "| Anees Health | Anees Health" template doubling post-deploy.

---

## 3. Repository audit findings

### 🔴 Critical

| ID | Finding | Why it matters | Fix |
|---|---|---|---|
| **C1** | `/services` + `/specialties` mid-funnel built but unrouted (`search-discovery.ts` content + `buildServicesMetadata`/`buildSpecialtiesMetadata` + `servicesItemListSchema`/`medicalProcedureSchema`/`medicalSpecialtySchema` all exist; no route renders them) | Highest commercial-intent queries can't rank; AI has nothing to cite beyond home | Build the 4 routes using existing builders; re-add to sitemap |
| **C2** | ✅ **RESOLVED** — Sitewide links to 404s (`homeBanner.tsx:46` hero CTA + Footer → `/services` & `/specialties`) | Primary hero CTA dead-ends; crawl signal leaks into 404s | Fixed when C1 shipped — the routes now exist and resolve 200. Doctor-profile `RelatedLinks` also re-linked to `/services` + `/specialties` (2026-06-26). |
| **C3** | `/sitemap-doctors.xml` 404s — `src/app/sitemap-doctors.ts` is **not** a valid Next route (only `sitemap.ts` is special-cased), and it's redundant (`sitemap.ts` already lists doctors) | Google is told to fetch a URL that 404s | Delete `sitemap-doctors.ts` + the robots `/sitemap-doctors.xml` line |
| **C4** | `config.api.baseUrl` falls back to `http://localhost:3000` if env unset (`config/index.ts:8`) | A missing prod env var silently makes every canonical/hreflang/sitemap/`@id` `localhost` → de-index. Live landmine during the Hostinger→OVH migration | Fail the prod build if `NEXT_PUBLIC_SITE_URL` is missing/not https |

### 🟠 High

| ID | Finding | Fix |
|---|---|---|
| **H1** | No `llms.txt` / `llms-full.txt` | Ship both (content in §14) — see realistic-expectations note |
| **H2** | ✅ **RESOLVED** — 5 rich schema builders never emitted | All 5 now emitted: `medicalProcedureSchema`/`servicesItemListSchema`/`medicalSpecialtySchema`/`howToBookingSchema` via the service+specialty routes; `aggregateOfferSchema` refactored to take `number[]` and wired into `/pricing` (replacing the inline duplicate) (2026-06-26). |
| **H3** | `/about-us` uses a non-canonical `Organization` `@id` and sets `sameAs` to *founder* URLs (wrong) | Use `orgId()`/canonical schema; set `sameAs` to `site.socialProfiles` |
| **H4** | Hardcoded "4.8★/1,000+" with a code comment about `AggregateRating` | Keep as plain visual copy, never mark up; build a real Google review corpus |
| **H5** | Two FAQ sources can drift (visible `home.faqs` translations vs schema `faqs.ts`) | Render the visible FAQ from `faqs.ts` too (single source) |
| **H6** | No Google Business Profile / off-site authority | See §11 — the biggest transactional lever |

### 🟡 Medium

- **M1** — Sitemap `lastModified: new Date()` = fake "changed now" signal. Derive from doctor `updatedAt` + a fixed constant for static pages.
- **M2** — Generic OG image (`about-img1.png`). Build a purpose-built 1200×630 EN/AR share card.
- **M3** — Render-blocking third parties site-wide (Chatling, Bootstrap CDN, Slick, Clarity, FB pixel). Self-host Bootstrap CSS, reserve the Chatling launcher's space, defer Clarity/Pixel past LCP.
- **M4** — Robots disallow not locale-aware (`/booking/` never matches `/en/booking`). Use `/*/booking/`, `/*/payment/`, `/*/portal/`. (PHI is auth-gated regardless.)
- **M5** — ✅ **RESOLVED** — `/faq` hub shipped; every new SEO hub + `[slug]` page now renders a visible `<Breadcrumb>` **and** emits `breadcrumbSchema` (verified across services/specialties/areas/pricing/faq/guides/conditions/glossary).

### 🟢 Low
- Single prominent doctor in sitemap priority; expand as the roster grows.
- No sitemap-index yet (needed once sitemaps split by type).
- `WebSite` `SearchAction` points only at `/doctors?q=`; revisit once `/services` + `/areas` exist.

---

## 4. SEO findings & fixes

**Strengths to preserve:** centralized bilingual metadata (`metadata.ts`), correct canonical + hreflang, OG/Twitter, robots AI-crawler allowlist, security headers, image optimization, ISR + `generateStaticParams`.

**Fixes (in priority order):** C1–C4 above → H3 (entity graph) → M1 (lastmod) → M2 (OG card) → M5 (breadcrumbs everywhere) → add **Services** and **Specialties** to header nav (labels already in `site.ts`). Each new page must emit `breadcrumbSchema` + `webPageSchema`. Lock **one slug per service** before publishing (a change after indexing forces 301s): keep `doctor-at-home`, `physiotherapy-at-home`, `elderly-care-at-home`; add `home-nursing`, `lab-tests-at-home`, `post-operative-care`, `palliative-chronic-care`.

---

## 5. AEO findings & fixes

**Make answers extractable:**
1. Ship a standalone **`/faq` hub** assembling the rich FAQ catalog (low effort — helpers exist).
2. Put **direct 40–80-word answers** at the top of each service/pricing page (drafted in §15).
3. Expose **pricing** extractably — a `/pricing` page with a price-range table + `aggregateOfferSchema`, sourced from the `BookingPrice` DB so copy and schema never drift.

**Market reality that reshapes AEO priorities:** transactional/local queries no longer trigger AI Overviews → won via Local Pack + GBP. Informational/price queries still win **featured snippets + People-Also-Ask** and get cited by ChatGPT/Perplexity — and the current field (price-list spam, paid directory listicles) is weak and beatable with clean, dated, schema-marked content.

---

## 6. GEO findings & fixes

**GEO tactics with *measured* lift** (Princeton GEO paper, KDD 2024 — the only rigorous evidence):

| Tactic | Measured lift | In practice |
|---|---|---|
| Add quotations | **+41%** | Quote experts/authorities in content |
| Add statistics | **+33%** | Replace vague claims with real numbers |
| Cite sources | **+28%** | Inline citations to credible sources |
| Fluency | **+29%** | Clear, readable prose |
| Keyword stuffing | ~0 / can hurt | Doesn't transfer to GEO |

**Apply to every authority page:** lead with a crisp "X is…" definition, include ≥1 real statistic + ≥1 cited authority, keep dates current-year (Perplexity weights recency). **Disambiguation:** consolidate the entity (schema `sameAs`, GBP, Wikidata) so LLMs don't confuse Anees Health with `aneesclinic.com` or the unrelated "Anees Health" YouTube channel.

---

## 7. LLM visibility & the `llms.txt` files

**Honest standing (confirmed 2026):** no major AI provider has committed to reading `llms.txt`; Google publicly declined it; ~10% publisher adoption; rarely fetched. **Ship it as cheap insurance — expect no measurable lift today.** The real LLM-visibility levers are: (a) clean, structured, citable on-site content (§6), (b) off-domain consensus — being discussed on directories/Reddit/forums with consistent claims, and (c) staying fully crawlable (several rivals bot-block and forfeit this).

`llms.txt` content is in §14. `llms-full.txt` should be **generated** from `search-discovery.ts` + `faqs.ts` + `coverage.ts` so it never drifts.

---

## 8. Competitor research (9 verified)

Three structural layers: **horizontal super-apps** (home care is a side feature), **dedicated home-care brands** (app-first vs SEO-brochure vs home-hospital), and **hospital premium arms**.

| Competitor | Positioning | Strength | Weakness | How Anees beats them |
|---|---|---|---|---|
| **Vezeeta** | MENA's default doctor-booking super-app; home visits bolted on | Huge domain authority, programmatic pages, brand = "book a doctor in Egypt" | Home care thin/generic/one-off; no nursing/physio depth; no continuity | Win the specialized long tail + post-booking experience (record, continuity) |
| **7keema** | "Egypt's 1st on-demand home **nursing** app" | First-mover brand; AI repeats "market leader"; dual patient/provider apps | **2.2★ app**, nursing-only, thin web, no portal, no pricing | "Clinical-grade multi-disciplinary platform" vs "nurse-booking app" |
| **OtlobTabib** | Broad bilingual home-health booking; "60k+ visits" | **Mature health blog** = long-tail + AI-citation moat; bilingual; apps | Pricing opaque; FAQ/schema under-used; generic feel; no record | Out-content at higher quality (medically-reviewed, named-clinician E-E-A-T) + indicative pricing |
| **CliniDo** | Funded marketplace; 11k doctors; **installment financing** | Strong programmatic specialty×service×city URLs; FAQ; PR | Provider-variable quality; lightweight "record"; **bot-blocks crawlers (403)** | Mirror their programmatic pattern but clinically authoritative; stay crawlable |
| **Curexmed** | Direct provider; 9 services; SEO/FAQ brochure | Disciplined on-page SEO; extensive FAQ; bilingual; blog | Brochure-ware (no booking/portal); **stale "2022" titles**; no pricing | Beat the FAQ game with fresher, credentialed, schema'd pages + real product |
| **DoktorCare** | Niche: **elderly + chronic** home care; "secure medical file" | Clean per-service URLs; quotable "first for elderly/chronic" claim | "Medical file" likely lightweight; no pricing; narrow | Out-*deliver* the record claim with real FHIR EHR + consent portal |
| **Andalusia Home Care** | Hospital-brand premium; "hospital-level care at home" | Inherits 40-yr hospital E-E-A-T; credible trust | Landing page Arabic-only; phone-callback funnel, no self-serve product | Win on digital experience, speed, bilingual/expat reach; lean on your hospital MOU |
| **Care Hub** *(new)* | **"Egypt's first home hospital"** — ICU-at-home, dialysis, chemo, 25-min emergency | **Large social following (~82k FB)**, differentiated high-acuity positioning, New Cairo + Alexandria | **Bot-blocks crawlers (403)**; phone-first, no portal/record/online booking; no transparent pricing; Alexandria-rooted | Different lane — own *continuity/coordination* for elderly/post-op/chronic; win on digital product + record + crawlability where you overlap (New Cairo) |
| **SEO/phone cluster** (Dr. Moamen Nada, Hospitalia, Eshfaa, Vital Care + Arabic directories) | Fragmented mid-tier; phone-first; niche angles (female physio, home-ICU) | Collectively saturate generic SERPs + feed AI listicles | Sub-scale, brochure/phone, no product/record, inconsistent quality | Out-professionalize the long tail with credentialed, schema'd, bilingual pages + booking + portal |

---

## 9. Care Hub — deep dive (new)

**Entity:** Care Hub (Arabic: كير هَب — "أفضل و أول مستشفى منزلي في مصر" / "the first home hospital in Egypt to save lives"). A **home-hospitalization group specialized in emergency & critical care.** Verified live; bot-blocks automated fetch (HTTP 403).

**Positioning:** *Home hospital*, not a home-visit booking platform. Comfort + speed + "lowest cost for home intensive care in Egypt." High-acuity, hospital-at-home model.

**Services (verified via Dalili Medical + search):**
- Home ICU (full setup with onsite resident doctor + continuous vitals monitoring)
- **Emergency response with a 25-minute arrival guarantee**
- Home dialysis (portable machines, continuous monitoring)
- Home chemotherapy administration + onsite blood transfusion
- Mobile blood bank, 24/7
- Home nursing (wound care, injections, IV, feeding tubes, chronic + post-surgical)
- Home physiotherapy/rehab (post-stroke, fractures, surgery, paralysis, spinal injury)
- Home pharmacy, radiology, labs, family-doctor home clinics
- Specialties: cardiology, internal medicine, chest, GI, rehab/PT, vascular, diabetic foot, oncology

**Coverage:** Alexandria HQ (Loran — 696 El Horreya Rd, B-Tech Building; Sidi Gaber branch) + **New Cairo** (The Core Mall, Fifth Settlement). Phone 01146660330, hotline 15848.

**Off-site footprint:** very active Facebook (~82,799 likes, 1,267 "talking about"), Instagram (`carehubegy`), LinkedIn, Macrocare partner, listed on Dalili Medical, Yellow Pages Egypt (oddly categorized "Retirement Home"), bookdialysis.

**Strengths:** strongest *social* presence of any competitor reviewed; genuinely differentiated high-acuity capabilities (ICU/dialysis/chemo at home) few can match; 25-min emergency guarantee; New Cairo presence overlaps Anees's home turf.

**Weaknesses / gaps Anees exploits:**
1. **Bot-blocks crawlers (403)** → forfeits AI-engine/Google citation visibility (same self-inflicted gap as CliniDo). Anees staying fully crawlable wins the AI-answer layer.
2. **No patient-facing digital product** — phone/hotline-first; no online booking, portal, or longitudinal record evident.
3. **No transparent pricing** (despite a "lowest cost" claim).
4. **No continuity/record layer** — it's an acute-episode operation, not managed ongoing care.
5. **Alexandria-rooted**; Cairo is a branch — local-intent Cairo pages are beatable.

**Counter-strategy:** Do **not** fight Care Hub on home-ICU/emergency (capital-heavy, different operating model — and their "first home hospital" entity claim is well-seeded). Instead, **own the adjacent lane Care Hub doesn't claim: continuity + coordination for elderly/post-op/chronic care.** Where the markets overlap (affluent New Cairo families), win on the digital self-serve product, the real medical record, transparent pricing, bilingual experience, and AI-crawlability. Benchmark their social following — Anees needs a deliberate social-proof + review program to close that gap. Where useful, frame Anees as the *ongoing managed-care* layer that can hand off to a home-hospital like Care Hub for true crash/ICU events — partnership-friendly positioning rather than head-to-head.

**Confidence:** High on existence, positioning, services, locations, and social scale. Medium on exact founding date and pricing (not publicly surfaced; site bot-blocks).

---

## 10. Market & SERP landscape

- **Market size:** Egypt home-healthcare ~USD 160M (2024) → ~USD 272M (2030), ~9% CAGR. ~**72% of health spend is out-of-pocket** → self-pay, price-sensitive → almost nobody publishes pricing (Anees's transparency wedge).
- **Search split:** ~70/30 Arabic/English, in Egyptian *colloquial* Arabic ("دكتور يجي البيت", "ممرضة مقيمة", "جليسة مسنين") — **don't auto-translate.**
- **Decisive fact:** Google **removed AI Overviews from local-provider health queries** (100% Dec 2023 → 0% Dec 2025). Transactional money queries resolve via **Local Pack / Maps + directories + organic**, *not* AEO. Informational/price queries still trigger **featured snippets + PAA** and are winnable.
- **Who AI engines cite today:** directory listicles (Dalili Medical "Best 24 Home nursing in Egypt", Tebcan, Ekshef) + well-structured provider price/FAQ pages. These are thin and gameable — a credible, licensed, schema-marked operator can displace them.

**Published price anchors competitors use (for the `/pricing` content — replace with real `BookingPrice` numbers):** doctor home visit EGP 600–2,000 by specialty; nursing visit EGP 150–300, 12h shift EGP 900–1,600, 24h resident EGP 1,800–3,500/day, monthly 24h EGP 13,000–20,000+; home physio session EGP 200–400; live-in elderly companion ~EGP 4,500/mo.

**Seasonal demand:** winter (Nov–Feb) → night/emergency pediatric + flu home visits; summer (Jun–Aug) → IV-drip-at-home, elderly heat monitoring; Ramadan → diabetic/medication management; year-round → post-op discharge-to-home (hospital-referral aligned with your MOU).

---

## 11. Off-site authority & E-E-A-T

**Exists:** clean consistent handles — Facebook (`aneeshealthcare`), Instagram, LinkedIn (founded 2024, 11–50 employees), TikTok, YouTube. Site indexed EN+AR. *(Correction: the homepage **does** emit Organization/LocalBusiness/WebSite JSON-LD via `[locale]/layout.tsx`; a static fetch missed it.)*

**Critical gaps:**
- **No Google Business Profile** — biggest local-SEO/reputation gap; bilingual GBPs see ~340% more engagement than English-only.
- **No third-party citations** (Vezeeta, Dalili Medical, Tebcan, Yellow Pages Egypt) → no independent NAP anchors.
- **No Wikidata / Crunchbase entity** → weak machine-readable authority.
- **No off-site reviews** → the on-site "4.8★" is unverifiable (and a liability in a regulated context).
- **✅ Name collision resolved (action needed):** `aneesclinic.com` was **Anees's own earlier/predecessor brand**, now stopped (owner confirmed, 2026-06-25). **Action — 301-redirect the whole domain to aneeshealth.com** (registrar/hosting task, not in this repo):
  1. Keep the `aneesclinic.com` domain registered — do **not** let it lapse (a lapsed domain can be grabbed and impersonate the brand).
  2. At the domain's host/DNS, add a permanent **301 redirect** of `aneesclinic.com` (and `www.`) → `https://aneeshealth.com` — map old pages to their closest new equivalent where possible, else the homepage.
  3. Force HTTPS on the redirect; redirect every path (`aneesclinic.com/*` → `aneeshealth.com/...`).
  4. If `aneesclinic.com` was ever verified in Google Search Console, use the **Change of Address** tool there to pass signals to aneeshealth.com.
  5. Result: residual link-equity + entity signals consolidate into aneeshealth.com, and Google stops treating the two as competing/duplicate entities.

**Lock the canonical NAP now:** Anees Health / أنيس هيلث · Administrative Office, 5th Settlement, New Cairo · **one** primary phone for GBP · info@aneeshealth.com.

---

## 12. Differentiation & positioning

**Category to own:** **"Managed Home Care"** — *system, not errand.*

**One-line positioning:**
> For Egyptian families managing an elderly, post-operative, or chronically ill loved one at home, Anees is the doctor-founded home care platform that runs the whole case — licensed clinicians, transparent pre-visit pricing, and one coordinator working from a real medical record — so care builds visit over visit instead of starting from scratch every time.

**The wedge:** *"Anees is the only home care in Egypt that remembers."*

**Homepage hero (recommended — emotional/continuity lead):**
- **EN:** *Home care that remembers — so you don't have to.* / Doctor-founded, licensed home care for elderly, post-op, and chronic patients in Egypt. One coordinator, one medical record, transparent prices you see before the visit.
- **AR:** *رعاية منزلية بتفتكر كل حاجة — عشان انت متشيلش الهم.* / رعاية منزلية أسّسها أطباء، بفريق طبي مرخّص لكبار السن ومرضى ما بعد العمليات والأمراض المزمنة في مصر. منسّق واحد، وملف طبي واحد، وأسعار واضحة تشوفها قبل الزيارة.

**Primary CTA:** **"Arrange care for your loved one"** (not "Book a visit"). Secondary: "See pricing before you book."

**Proof points to make *visible*:** a "credential-verified clinician" badge (license type + verified status — you already capture `licenseType/Number/Expiry` and gate sign-off on `canSignClinical`); a visible vitals/labs trend in the portal; "a clinician with an expired license cannot sign your care — the system enforces it."

**ICP:** the 35–55 "sandwich" son/daughter managing an elderly/post-op/chronic parent (often expat, managing remotely). They want to *stop worrying*; continuity + one contact + a visible record converts them. **Not** the ICP: healthy young adults wanting a one-off GP (Vezeeta's commodity game).

**AI-search brand summary (seed verbatim into homepage meta, About page, and `llms.txt`):**
> Anees Health is Egypt's doctor-founded home healthcare platform offering doctor home visits, home nursing, home physiotherapy, and at-home lab tests for elderly, post-operative, and chronic-care patients. Unlike doctor-booking directories or one-off nursing agencies, Anees provides continuous, coordinated care: every visit is recorded in a real hospital-grade electronic medical record, every clinician is licensed and credential-verified, pricing is transparent before the visit, and a dedicated coordinator manages each case end to end. Fully bilingual (Arabic and English).

---

## 13. Content roadmap (11 clusters)

Every page lists title (EN+AR), slug under `/[locale]/…`, target keyword/intent, H2 outline, schema (mapped to existing builders), internal links, priority.

**Cluster 1 — Services** *(Wave 0 + 1, highest ROI)*: `/services` hub + `doctor-at-home`, `physiotherapy-at-home`, `elderly-care-at-home` (built — just route), then add `home-nursing`, `lab-tests-at-home`, `post-operative-care`, `palliative-chronic-care`. Schema: `servicesItemListSchema`, `medicalProcedureSchema`, `aggregateOfferSchema`, `physiciansItemListSchema`, `faqPageSchema`.

**Cluster 2 — Specialties** *(Wave 0, pure routing win)*: `/specialties` hub + dynamic `/specialties/[slug]` (internal-medicine, pediatrics, orthopaedics, geriatrics, cardiology, ob-gyn, family-medicine…). Schema: `medicalSpecialtySchema`, `physiciansItemListSchema`.

**Cluster 3 — Location pages** *(Wave 1–2, GeoJSON-backed)*: `/areas` hub + `/areas/{maadi,new-cairo,zamalek,heliopolis,sheikh-zayed,6th-october,giza}`. Schema: `localBusinessSchema` (per-area) + `coveragePlaceSchema`. Top-4 (Maadi, New Cairo, Zamalek, Heliopolis) first.

**Cluster 4 — Pricing explainers** *(Wave 1, AEO/snippet machines)*: `/pricing` overview + `/pricing/{doctor-home-visit,home-nursing,home-physiotherapy,lab-tests-at-home,elderly-care}-cost`. Lead with a direct answer + price-range table. Schema: `aggregateOfferSchema`, `medicalProcedureSchema` (offers).

**Cluster 5 — Comparison / "best in Cairo"** *(Wave 2)*: `/guides/best-home-nursing-cairo`, `best-home-physiotherapy-cairo`, `home-visit-vs-clinic`, `home-nursing-vs-private-nurse`, `home-care-vs-nursing-home`. Schema: `ItemList` + `articleSchema` + `faqPageSchema`.

**Cluster 6 — How-to / decision guides** *(Wave 2)*: `how-to-choose-home-nursing`, `how-to-book-doctor-home-visit` (uses `howToBookingSchema`), `prepare-home-after-surgery`, `care-for-elderly-parent-at-home`.

**Cluster 7 — Condition / use-case** *(Wave 3, GEO authority)*: `/conditions` hub + `stroke-rehab-at-home`, `post-surgery-wound-care`, `diabetic-foot-care`, `elderly-fall-prevention`. New `MedicalCondition` helper needed.

**Cluster 8 — Standalone `/faq` hub** *(Wave 1, low build)*: assemble `homeFaqs`+`servicesFaqs`+`bookingFaqs`+`coverageFaqs` + the 10 new pairs (§15). Schema: `faqPageSchema` + `webPageSchema`.

**Cluster 9 — Glossary** *(Wave 3–4)*: `/glossary` + `/glossary/{term}` (home nursing, palliative care, geriatrics, IV therapy, wound care, catheter care, DNR, post-operative care…). New `DefinedTerm`/`DefinedTermSet` helper.

**Cluster 10 — Blog engine** *(Wave 2 build, ongoing publish)*: `/blog` + `/blog/[slug]` (activates the unused `articleSchema`). First 6: "Home Healthcare in Egypt: Complete 2026 Guide", "Signs Your Elderly Parent Needs Home Care", "What to Expect from a Doctor Home Visit", "Recovering at Home After Surgery", "Managing Diabetes at Home in Egypt", "Physiotherapy at Home vs. Clinic".

**Cluster 11 — Technical GEO/AEO assets** *(Wave 0–1)*: `llms.txt`, `llms-full.txt`, 1200×630 OG card, sitemap-index + per-type sitemaps, breadcrumbs on every page.

**Internal-link mesh:** Service ⇄ Specialty ⇄ Location ⇄ Pricing ⇄ Condition, all funneling to the already-ranking doctor profiles. Add **Services** + **Specialties** to header nav; footer links the 7 pillars (`/services`, `/specialties`, `/areas`, `/pricing`, `/faq`, `/blog`, `/coverage`).

---

## 14. Ready-to-paste files

### 14a. `public/llms.txt` (links only real, existing pages — expand when `/services` ships)

```markdown
# Anees Health

> Anees Health (أنيس هيلث) is Egypt's doctor-founded home healthcare platform.
> We send licensed doctors, nurses, and physiotherapists to the patient's home and
> coordinate home lab tests, post-operative care, and chronic-disease follow-up across
> Greater Cairo. Bilingual (English/Arabic). Founded 2024. Contact: info@aneeshealth.com.

Anees provides continuous, coordinated home care — not one-off visits. Every visit is
recorded in a real hospital-grade electronic medical record (FHIR standard), every
clinician is licensed and credential-verified, pricing is shown before booking, and a
dedicated coordinator manages each patient's case end to end.

## Services
Doctor home visits, home nursing (wound care, injections, IV, catheter, vitals),
home physiotherapy and rehabilitation, lab tests at home, elderly/geriatric care,
post-operative care, and palliative & chronic-disease management.

## Coverage
Greater Cairo and surrounding governorates — including Maadi, Zamalek, New Cairo
(Fifth Settlement), Heliopolis, Nasr City, Mohandessin, Dokki, 6th of October, Sheikh Zayed,
and Giza. Verify any address on the coverage page before booking.

## Key pages
- [Home](https://aneeshealth.com/en): platform overview
- [Doctors](https://aneeshealth.com/en/doctors): licensed home-visit physicians by specialty
- [Coverage](https://aneeshealth.com/en/coverage): live service-area checker
- [About](https://aneeshealth.com/en/about-us): doctor-founded, licensed clinicians
- [Contact](https://aneeshealth.com/en/contact-us): booking and enquiries
- [Arabic site](https://aneeshealth.com/ar): full Arabic version

## Founders
- Dr. Mahmoud Darwish — Co-Founder, geriatrics
- Dr. Ahmed Oraby — Co-Founder

## Optional
- [Privacy Policy](https://aneeshealth.com/en/privacy-policy)
- [Terms & Conditions](https://aneeshealth.com/en/terms-and-conditions)
```

### 14b. Robots fix (locale-aware + drop the 404 sitemap)

```ts
// src/app/robots.ts — shared, locale-aware disallow applied to '*' AND every AI-crawler rule
const disallow = [
  '/api/', '/_next/', '/admin/', '/dashboard/',
  '/*/booking/', '/*/payment/', '/*/portal/', '/booking/confirmation',
];
// sitemap: keep ONLY `${baseUrl}/sitemap.xml`  (delete the /sitemap-doctors.xml line)
```
Also **delete** `src/app/sitemap-doctors.ts` (redundant — `sitemap.ts` already lists doctors). Optional: add correct tokens `Perplexity-User`, `Claude-User`, `Claude-SearchBot`, `Google-CloudVertexBot`.

### 14c. Config hardening (prevents the localhost-canonical disaster)

```ts
// src/lib/config/index.ts
function resolveBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === 'production') {
    if (!url || !url.startsWith('https://')) {
      throw new Error('NEXT_PUBLIC_SITE_URL must be set to an https:// origin in production.');
    }
    return url.replace(/\/$/, '');
  }
  return (url || 'http://localhost:3000').replace(/\/$/, '');
}
// baseUrl: resolveBaseUrl(),
```

### 14d. `/services` route (starter — uses existing builders)

```tsx
// src/app/[locale]/services/page.tsx
import Script from 'next/script';
import type { Metadata } from 'next';
import { buildServicesMetadata } from '@/lib/seo/metadata';
import { servicesItemListSchema, faqPageSchema, webPageSchema,
         breadcrumbSchema, renderJsonLd } from '@/lib/seo/jsonld';
import { servicesFaqs } from '@/lib/seo/faqs';
import { getAllServiceLandingSlugs, getServiceLanding } from '@/lib/seo/search-discovery';
import { site, type SupportedLocale } from '@/lib/seo/site';

export const revalidate = 3600;
export async function generateMetadata({ params }:{ params: Promise<{locale:string}> }): Promise<Metadata> {
  const { locale } = await params;
  return buildServicesMetadata(locale === 'ar' ? 'ar' : 'en');
}

export default async function ServicesPage({ params }:{ params: Promise<{locale:string}> }) {
  const { locale: raw } = await params;
  const locale: SupportedLocale = raw === 'ar' ? 'ar' : 'en';
  const services = getAllServiceLandingSlugs()
    .map(slug => getServiceLanding(locale, slug))
    .filter(Boolean)
    .map(s => ({ code: s!.slug, name: s!.title, description: s!.description, landingSlug: s!.slug }));

  const itemList = servicesItemListSchema(locale, services);
  const faq = faqPageSchema(servicesFaqs[locale]);
  const breadcrumbs = [
    { name: site.labels.home[locale], url: `${site.baseUrl}/${locale}` },
    { name: site.labels.services[locale], url: `${site.baseUrl}/${locale}/services` },
  ];
  const page = webPageSchema({ locale, path: `/${locale}/services`,
    name: site.labels.services[locale], description: '', breadcrumbs });

  return (<>
    <Script id="services-itemlist" type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: renderJsonLd(itemList) }} />
    <Script id="services-faq" type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: renderJsonLd(faq) }} />
    <Script id="services-webpage" type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: renderJsonLd(page) }} />
    {/* TODO: render the visible services grid + the answer-ready intro blocks (§15) */}
  </>);
}
```
*(The `[slug]` page mirrors this with `getServiceLanding` + `getServiceLandingDoctors` + `buildServiceLandingMetadata` + `medicalProcedureSchema` + `physiciansItemListSchema`. `/specialties` mirrors it with the specialty builders.)*

---

## 15. Answer-ready content (EN + AR)

> Each block is 40–80 words, front-loads the answer, and is self-contained so AI engines quote it verbatim. **Pricing `{price}` placeholders must be rendered from the `BookingPrice` DB / `AggregateOffer` — never hardcoded.** Coverage lists should be generated from `getCoverageAreas()`.

### Answer blocks

**1 — What is Anees Health?**
EN: *Anees Health is an Egyptian home healthcare platform that brings care to the patient's home. We dispatch licensed doctors, nurses, and physiotherapists for home visits, and coordinate home lab tests, imaging, post-operative care, and chronic-disease follow-up across Greater Cairo. Founded in 2024 by Dr. Mahmoud Darwish and Dr. Ahmed Oraby, Anees focuses on elderly, post-surgical, and chronic-care patients. Contact: info@aneeshealth.com.*
AR: *أنيس هيلث منصة رعاية صحية منزلية في مصر تنقل الرعاية إلى منزل المريض. نوفر زيارات منزلية لأطباء وممرضين وأخصائيي علاج طبيعي مرخصين، وننسق التحاليل والأشعة المنزلية ورعاية ما بعد العمليات ومتابعة الأمراض المزمنة في القاهرة الكبرى. تأسست أنيس عام 2024 على يد د. محمود درويش ود. أحمد عرابي، وتركّز على رعاية كبار السن ومرضى ما بعد الجراحة والحالات المزمنة. للتواصل: info@aneeshealth.com.*

**2 — How much does a doctor home visit cost in Egypt?**
EN: *A doctor home visit from Anees Health in Cairo starts from EGP {price}, with the exact price shown before you confirm the booking — no surprise fees at the door. The final price depends on the specialty, the area, and the time of the visit. Anees serves Greater Cairo with licensed physicians who come to the patient's home.*
AR: *تبدأ زيارة الطبيب المنزلية من أنيس هيلث في القاهرة من {price} جنيه مصري، ويظهر السعر النهائي بوضوح قبل تأكيد الحجز دون أي رسوم مفاجئة. تعتمد التكلفة على التخصص والمنطقة وموعد الزيارة. تخدم أنيس القاهرة الكبرى بأطباء مرخصين يأتون إلى منزل المريض.*

**3 — How much does home nursing cost in Cairo?**
EN: *Home nursing from Anees Health in Cairo starts from EGP {price} per visit, with the price confirmed before booking. Anees provides skilled, licensed nurses for wound care, injections, IV therapy, catheter and tube care, vitals monitoring, and post-operative support. Hourly, per-visit, and ongoing care-package rates are available; the exact rate depends on the service and shift length.*
AR: *يبدأ التمريض المنزلي من أنيس هيلث في القاهرة من {price} جنيه مصري للزيارة، مع تأكيد السعر قبل الحجز. توفر أنيس ممرضين مرخصين متخصصين للعناية بالجروح والحقن والمحاليل الوريدية والقساطر ومتابعة العلامات الحيوية ورعاية ما بعد العمليات. تتوفر أسعار بالساعة أو بالزيارة أو بباقات رعاية مستمرة، وتعتمد التكلفة على نوع الخدمة ومدة الوردية.*

**4 — Is home physiotherapy available in Cairo?**
EN: *Yes. Anees Health provides home physiotherapy across Greater Cairo. A licensed physiotherapist visits the patient at home for post-operative rehabilitation, stroke and neurological rehab, orthopedic recovery, mobility and balance training, and elderly fall-prevention programs. Sessions start from EGP {price}, confirmed before booking, and can be arranged as one-off visits or structured rehab plans.*
AR: *نعم. توفر أنيس هيلث العلاج الطبيعي المنزلي في جميع أنحاء القاهرة الكبرى. يزور أخصائي علاج طبيعي مرخص المريض في منزله لإعادة التأهيل بعد العمليات، وتأهيل الجلطات والحالات العصبية، والتعافي بعد إصابات العظام، وتدريبات الحركة والتوازن، وبرامج الوقاية من السقوط لكبار السن. تبدأ الجلسات من {price} جنيه مصري، وتُؤكد قبل الحجز.*

**5 — Which areas of Cairo does Anees cover?**
EN: *Anees Health covers Greater Cairo — including Cairo, Giza, and surrounding districts — plus nearby governorates, with coverage expanding continuously. Areas such as Maadi, Nasr City, Heliopolis, New Cairo, Zamalek, Mohandessin, Dokki, and 6th of October are within the service zone. You can verify any specific address using the live coverage checker on the Anees Coverage page before booking.*
AR: *تغطي أنيس هيلث القاهرة الكبرى — وتشمل القاهرة والجيزة والأحياء المحيطة — بالإضافة إلى المحافظات المجاورة، والتغطية في توسع مستمر. تقع مناطق مثل المعادي ومدينة نصر ومصر الجديدة والتجمع الخامس والزمالك والمهندسين والدقي و٦ أكتوبر ضمن نطاق الخدمة. يمكنك التحقق من تغطية أي عنوان عبر أداة فحص العنوان في صفحة المناطق المغطاة قبل الحجز.*

**6 — Are Anees clinicians licensed?**
EN: *Yes. Every doctor, nurse, and physiotherapist who visits through Anees Health is licensed by the Egyptian Medical Syndicate or the equivalent professional body, and passes Anees's own credentialing and license-verification before seeing any patient. Licenses are checked for validity on an ongoing basis, so the clinician who arrives at your home is verified, qualified, and authorized to provide the booked service.*
AR: *نعم. كل طبيب وممرض وأخصائي علاج طبيعي يزور من خلال أنيس هيلث مرخص من نقابة الأطباء المصرية أو الجهة المهنية المقابلة، ويجتاز عملية اعتماد والتحقق من الترخيص داخل أنيس قبل مقابلة أي مريض. تُراجع صلاحية التراخيص بشكل مستمر، حتى يكون من يصل إلى منزلك مؤهلاً وموثقاً ومصرحاً له بتقديم الخدمة المحجوزة.*

**7 — How fast can I get a home visit?**
EN: *Most routine home visits from Anees Health in Cairo are scheduled the same day. Urgent visits can typically be dispatched within hours, subject to clinician availability in your area. After you book, an Anees coordinator confirms the visit within minutes and assigns the right doctor, nurse, or physiotherapist. You choose your preferred date and time at booking.*
AR: *تُجدول معظم الزيارات المنزلية الاعتيادية من أنيس هيلث في القاهرة في نفس اليوم. أما الزيارات العاجلة فيمكن إرسالها خلال ساعات بحسب توفر الكادر الطبي في منطقتك. بعد الحجز، يؤكد منسق أنيس الزيارة خلال دقائق ويعيّن الطبيب أو الممرض أو أخصائي العلاج الطبيعي المناسب. أنت تختار التاريخ والوقت المناسبين أثناء الحجز.*

**8 — Anees Health vs hospital outpatient visit**
EN: *Anees Health brings a licensed clinician to the patient's home, while a hospital outpatient visit requires traveling to a clinic and waiting in a queue. Home care avoids transport stress, infection exposure, and waiting rooms — a major advantage for elderly, post-operative, and mobility-limited patients. Anees prices are confirmed before booking. Hospitals suit emergencies, surgery, and advanced imaging; Anees suits routine, follow-up, and ongoing care at home.*
AR: *توفر أنيس هيلث كادراً طبياً مرخصاً في منزل المريض، بينما تتطلب زيارة العيادات الخارجية بالمستشفى الانتقال والانتظار في الطابور. تجنّب الرعاية المنزلية عناء المواصلات والتعرض للعدوى وغرف الانتظار — وهي ميزة كبيرة لكبار السن ومرضى ما بعد العمليات ومحدودي الحركة. تناسب المستشفيات حالات الطوارئ والجراحة والأشعة المتقدمة، بينما تناسب أنيس الرعاية الاعتيادية والمتابعة في المنزل.*

**9 — Best home nursing for elderly parents in Cairo**
EN: *For elderly parents in Cairo, Anees Health provides licensed home nurses experienced in senior care — including medication management, wound and pressure-sore care, catheter and feeding-tube support, vitals monitoring, mobility help, and post-hospital recovery. One coordinator manages the nurse, doctor visits, physiotherapy, and labs, and keeps the family updated. Care is available as single visits or ongoing packages, with prices confirmed before booking.*
AR: *لرعاية الوالدين كبار السن في القاهرة، توفر أنيس هيلث ممرضين منزليين مرخصين ذوي خبرة في رعاية المسنين — تشمل إدارة الأدوية والعناية بالجروح وقرح الفراش والقساطر وأنابيب التغذية ومتابعة العلامات الحيوية والمساعدة على الحركة والتعافي بعد المستشفى. ينظم منسق واحد الممرض وزيارات الطبيب والعلاج الطبيعي والتحاليل ويبقي الأسرة على اطلاع. تتوفر الرعاية كزيارات مفردة أو باقات مستمرة، مع تأكيد الأسعار قبل الحجز.*

**10 — How do I book a home nurse in Egypt?**
EN: *To book a home nurse with Anees Health: choose the nursing service, pick a date and time, enter the patient's address in Greater Cairo, and confirm. An Anees coordinator confirms the visit within minutes and assigns a licensed nurse. You can also book by contacting Anees directly via WhatsApp or phone, or email info@aneeshealth.com. The price is shown before you confirm.*
AR: *لحجز ممرض منزلي مع أنيس هيلث: اختر خدمة التمريض، حدد التاريخ والوقت، أدخل عنوان المريض في القاهرة الكبرى، ثم أكد الحجز. يؤكد منسق أنيس الزيارة خلال دقائق ويعيّن ممرضاً مرخصاً. يمكنك أيضاً الحجز عبر واتساب أو الهاتف، أو عبر البريد info@aneeshealth.com. يظهر السعر قبل تأكيد الحجز.*

### New FAQ pairs for the `/faq` hub (add as `faqHubFaqs` in `faqs.ts` — net-new, don't duplicate existing)

1. **Pricing transparency / hidden fees** — *No hidden fees. Anees shows the full price before you confirm; costs vary by service, area, and time; out-of-zone addresses may add a disclosed travel surcharge; receipts for every visit.*
2. **Lab tests at home** — *Yes. Anees arranges home sample collection across Greater Cairo; samples processed by accredited labs; results digital; doctor review can be coordinated. Ideal for elderly/bedridden/post-op patients.*
3. **Coverage edge case** — *Primarily Greater Cairo + nearby governorates, expanding; just-outside addresses can often be arranged for a small surcharge or waitlisted; verify with the coverage checker.*
4. **Licensing & credentialing depth** — *Every clinician is syndicate-licensed and clears Anees's identity + license-validity checks before any visit; validity is re-checked over time.*
5. **Safety & privacy** — *Clinicians are vetted; clinical info stays confidential (shared only with the treating team); infection-control practices; each visit documented in a secure record; home care lowers hospital-infection exposure.*
6. **Cancellation & rescheduling** — *Cancel/reschedule from the booking confirmation or via the coordinator; terms in the Terms & Conditions; rescheduling in advance is usually free.*
7. **Home care vs clinic visit** — *Choose home for routine/follow-up/chronic/post-op/elderly/wound/IV/labs/physio; choose a clinic/hospital for emergencies, surgery, advanced imaging.*
8. **Payment methods** — *Pay online during booking via the secure Kashier gateway, or via InstaPay; receipt for every visit; full price shown before you confirm.*
9. **Ongoing / chronic care packages** — *Yes — ongoing packages for elderly/post-op/chronic combining nursing, doctor follow-ups, physio, lab monitoring, and medication under one coordinator; plan adapts as needs change.*
10. **What to expect during a visit** — *Clinician arrives on time with the needed equipment, confirms identity, reviews the case, performs the service, documents in a secure record, explains findings, and Anees coordinates any follow-up.*

*(Full bilingual AR text for FAQs 1–10 is available — see the answer-ready snippets file; store as real UTF-8 in `faqs.ts`.)*

---

## 16. Doctor & clinician search discoverability

**Goal:** when someone searches a clinician's name (or "Dr X home visit Cairo", "Dr X cardiologist"), the Anees profile page should appear in results.

**Verdict: sound goal — high-intent and brand-building — and ~80% already built.** Each doctor already has an indexable page with the right ingredients. This is one of the strongest-built parts of the site.

### What already exists (strong)
- Per-doctor **static page** at `/[locale]/doctors/[slug]` (`generateStaticParams`, ISR `revalidate=3600`).
- Search **title/description/canonical/hreflang/OG** via `buildDoctorProfileMetadata`.
- **`Physician` JSON-LD** via `physicianSchema` (name, specialty, languages, `worksFor`/`memberOf` → org, education, credentials, experience, available services).
- Doctor **FAQ + breadcrumb** schema; doctor URLs in `sitemap.ts`; canonical-slug redirect handling.

### Realistic expectations
- **Reliably winnable:** "Dr [Name] Anees", "Dr [Name] home visit", "Dr [Name] [specialty] Cairo".
- **Harder:** the *bare name alone* — the doctor may also appear on Vezeeta / Facebook / their hospital with higher domain authority. You compete with their *other* listings, not from zero. Winning the bare name is an entity/Knowledge-Panel game (see `sameAs` below).

### What makes them appear *better* (priority order)
1. **Route `/specialties` + `/services`** (Sprint 0). ✅ **Shipped 2026-06-25** — service + specialty pages now link to matching doctors (verified: the doctor-at-home page carries 118 doctor-profile links, the physical-therapy specialty page 38), so doctor profiles are no longer islands. *Biggest lever — done.*
2. **Add `sameAs` to each doctor's `Physician` schema** — list that doctor's *other verified* profiles (Vezeeta, LinkedIn, syndicate page). This consolidates their identity for Google → stronger name-search ranking + Knowledge-Panel eligibility. **Requires a data change (below).**
3. **Add `practicesAt`** (schema.org v24) linking the `Physician` to the org `MedicalOrganization` node (you already use `worksFor`/`memberOf` with `@id` — `practicesAt` is the newer recommended property AI engines reward).
4. **Unique, substantive bios** per doctor (real background, sub-specialties, conditions treated). Thin/duplicate bios rank poorly.
5. **Reviews** via the Google Business Profile (Sprint 1) feed doctor-level reputation + ranking.
6. **Submit the sitemap in Google Search Console** so new/updated doctors index in days, not weeks.

### Two data-model gaps to close
The `Doctor` type (`src/lib/models/doctor.types.ts`) currently has **no `sameAs`/external-profile field** and **no public/private flag**:
- **`sameAs` data** — add an optional `externalProfiles: string[]` (or `sameAs: string[]`) to the `Doctor` model + data source, then emit it in `physicianSchema`. Without source data there is nothing to link.
- **Public/private consent flag** — today *every* doctor in the data source is publicly indexable; there is **no way to hide a clinician** who hasn't consented to a public profile. For a health platform this matters. Add an `isPublic`/`published` boolean and gate **three** places: `generateStaticParams` (don't build private profiles), `generateMetadata` (`robots: { index: false }` for private), and `sitemap.ts` (exclude private). **Owner decision needed: do all listed clinicians consent to public search profiles?**

### Implementation checklist
- [x] (Sprint 0) Route `/specialties` + `/services` → internal links to doctors ✅ 2026-06-25
- [x] Add `practicesAt` to `physicianSchema` ✅ 2026-06-26 (`{ '@id': orgId() }`, schema.org v24)
- [x] **Close the doctor de-index hole** ✅ 2026-06-26 — `getDoctorBySlug` now filters `isActive`, so a deactivated doctor returns `null` → `notFound()` + `robots:{index:false}` on the direct-URL surface (previously a fully-indexable profile still rendered).
- [x] Add `externalProfiles`/`sameAs` to the `Doctor` model + emit in `physicianSchema` ✅ 2026-06-26 — **mechanism shipped**: migration `20260626120000_add_doctor_seo_discoverability` adds `externalProfiles JSONB`; `mapDoctor` maps it; `physicianSchema` emits it as `sameAs` (omitted when empty). ⏳ **Owner data still needed**: each doctor's real, verified external-profile URLs (Vezeeta / LinkedIn / syndicate) — linking them publicly is itself a consent question, so the column ships empty until the owner supplies URLs.
- [x] Add `isPublic`/consent flag → gate `generateStaticParams` + metadata `robots` + sitemap ✅ 2026-06-26 — **mechanism shipped**: `isPublic BOOLEAN NOT NULL DEFAULT true` added; `getDoctors`, `getAllDoctorSlugs`, and `getDoctorBySlug` all filter `isPublic` (so a private doctor disappears from the listing, grids, sitemap, static build, **and** the direct URL → `notFound()` + `noindex`). Defaults `true`, so **nothing changes until the owner marks a clinician private**. ⏳ **Owner decision**: which (if any) listed clinicians have NOT consented to a public, indexable profile → set `isPublic=false` for them.
- [ ] Ensure each bio is unique + substantive *(content/data task — owner/editorial)*
- [ ] Submit sitemap in Google Search Console (post-deploy)

---

## 17. Sprints & phases

> Owners: **ENG** = engineering, **MKT** = marketing/content, **OWNER** = business owner (non-code tasks). Each sprint ≈ 1–2 weeks.

### Sprint 0 — "Turn it on" (Wave 0, quick wins)
**Goal:** unlock the built-but-dead mid-funnel and fix the crawl landmines.
- [x] **ENG** Route `/services` hub + 3 service landings (`doctor-at-home`, `physiotherapy-at-home`, `elderly-care-at-home`) using existing builders *(C1)* ✅ 2026-06-25
- [x] **ENG** Route `/specialties` hub + dynamic `/specialties/[slug]` *(C1)* ✅ 2026-06-25
- [x] **ENG** Fix the homepage "Services" 404 CTA + Footer links *(C2)* ✅ 2026-06-25 (resolved — the routes now exist)
- [x] **ENG** Delete `sitemap-doctors.ts` + the robots `/sitemap-doctors.xml` line *(C3)* ✅ 2026-06-25
- [x] **ENG** Config fail-fast on missing prod `NEXT_PUBLIC_SITE_URL` *(C4)* ✅ 2026-06-25
- [x] **ENG** Locale-aware robots disallow *(M4)* ✅ 2026-06-25
- [x] **ENG** Add `/services` + `/specialties` into `sitemap.ts`; add **Services**/**Specialties** to header nav ✅ 2026-06-25
- [x] **ENG** Fix `/about-us` `@id` + `sameAs` *(H3)* ✅ 2026-06-25
- [x] **ENG** Single-source the home FAQ (schema now built from the same `home.faqs` i18n messages the visible FAQ renders) *(H5)* ✅ 2026-06-25
- [x] **ENG/MKT** Ship `public/llms.txt` + `llms-full.txt` route *(H1)* ✅ 2026-06-25
- [x] **ENG** Build the 1200×630 OG card *(M2)* ✅ 2026-06-25
- [ ] **ENG/OWNER** Redeploy (the live site lags the code)
- **Acceptance:** all 4 new routes return 200 + valid schema (Rich Results Test); no 404 links from home/footer; `robots.txt` blocks `/en/booking` & `/en/portal`; prod canonicals resolve to https (not localhost).

### Sprint 1 — "Win the money queries" (Wave 1)
**Goal:** capture high-intent commercial + local + price traffic.
- [ ] **OWNER** Create + verify a **bilingual Google Business Profile** (category "Home health care service", 24/7 hours, services, photos) *(H6)* — *biggest transactional lever*
- [ ] **OWNER** Lock the canonical NAP; start a post-visit review-request flow (EN+AR)
- [ ] **OWNER** Decide the `aneesclinic.com` question (301 if yours / defend the mark if not)
- [x] **ENG** Complete the service catalog (`home-nursing`, `lab-tests-at-home`, `post-operative-care`, `palliative-chronic-care`) — added to `SERVICE_COPY` (EN+AR) + doctor-matching; auto-routed + auto-sitemapped ✅ 2026-06-25
- [x] **ENG** Build the standalone `/faq` hub *(Cluster 8)* — assembled the existing FAQ catalog (14 Q&A across 4 themed groups) ✅ 2026-06-25
- [x] **ENG** Build `/pricing` overview ✅ 2026-06-25 — **package-based model** (`src/lib/seo/pricing.ts`: named packages with monthly/annual/range tiers). Seeded with owner data (Sanad: Monthly from EGP 19,500, Annual from EGP 60,000; Home Physiotherapy 12-session program EGP 8,000–12,000); AggregateOffer auto-emits (lowPrice 8,000 / highPrice 60,000). Remaining packages show "Confirmed before booking" until priced. **⚠️ Owner to confirm Sanad monthly/annual + fill the other packages.**
- [x] **ENG** Build location pages *(Cluster 3)* — shipped **10** Greater-Cairo neighbourhood pages (Maadi, New Cairo, Zamalek, Heliopolis, Nasr City, Mohandessin, Dokki, Sheikh Zayed, 6th October, Giza) + `/areas` hub ✅ 2026-06-25
- [x] **ENG/MKT** Build the 1200×630 OG card *(M2)* ✅ 2026-06-25; ~~fix sitemap `lastModified`~~ ✅ done in Sprint 0
- [x] **MKT** Seed the AI-search brand summary into homepage meta + About + `llms.txt` ✅ 2026-06-26 — set as the machine-readable `MedicalOrganization.description` in the site-wide org JSON-LD (emitted on the homepage + every page) **and** the About page's `AboutPage → mainEntity` description (`founders_search_statement`), bilingual; `llms.txt` already carried it. *(Kept out of the HTML `<meta name="description">` deliberately — it's ~80 words, too long for a SERP snippet; the entity `description` field is the correct, AI-parsed home for it.)*
- **Acceptance:** GBP live + first reviews; `/pricing` + `/faq` indexed; 4 location pages ranking-eligible; pricing copy and `AggregateOffer` driven by one source.

### Sprint 2 — "Authority & GEO" (Wave 2)
- [x] **ENG** Stand up the content engine — shipped as `/guides` + `/guides/[slug]` (activates `articleSchema`); content lives in `src/lib/seo/guides.ts` (no MDX dependency) ✅ 2026-06-25
- [x] **MKT/CMO** Editorial content — **13 bilingual guides shipped** ✅ 2026-06-26: Cluster 5 comparison/best-in-Cairo (home-care-vs-nursing-home, best-home-nursing-cairo, best-home-physiotherapy-cairo, home-visit-vs-clinic, home-nursing-vs-private-nurse) + Cluster 6 how-to (choosing home nursing, how-to-book, prepare-home-after-surgery, care-for-elderly-parent-at-home) + seasonal/high-intent (night/emergency, IV-drip, Ramadan-diabetes) + the pillar 2026 guide. GEO-optimized with web-verified cited statistics + named authorities. *Remaining (optional): further long-tail listicles as the roster/areas grow.*
- [x] **ENG** Location pages — all 10 areas (incl. Sheikh Zayed, 6th October, Giza) shipped in Sprint 1 ✅; per-type sitemaps + index still optional (single sitemap is fine at current scale)
- [ ] **OWNER/MKT** Directory citations (Vezeeta, Dalili Medical, Tebcan, Yellow Pages) with the canonical NAP; Crunchbase + Wikidata entities
- [x] **ENG** CWV pass *(M3)* ✅ 2026-06-25 — self-hosted Bootstrap CSS + JS (pinned v5.3.0, same-origin, dead jsdelivr preconnect removed, `/assets/js` cache header added). *Found the rest was already optimal:* Clarity + Meta Pixel already `lazyOnload`, Bootstrap JS `afterInteractive`, Chatling lazy, fonts self-hosted with `display: swap`, preconnects present. (Optional follow-up: drop the now-unused `cdn.jsdelivr.net` from the CSP allow-list.)
- **Acceptance:** content engine live with `articleSchema`; flagship comparison + how-to + pillar guides indexed; ≥4 directory citations live; CWV green on home + a service page.

### Sprint 3 — "Long-tail & moat" (Wave 3–4)
- [x] **ENG/MKT** Condition/use-case pages ✅ 2026-06-25 (4 shipped: stroke rehab, post-surgery wound care, diabetic foot care, fall prevention — bilingual, `MedicalWebPage` + `Article` + FAQ schema, linked to services) **+ Glossary** ✅ 2026-06-25 (10 bilingual `DefinedTerm` pages + `DefinedTermSet` hub)
- [ ] **MKT** Seasonal pages (winter night-visit, summer IV-drip, Ramadan diabetic support)
- [ ] **MKT** Off-domain brand seeding (Reddit r/Egypt, expat forums) with consistent claims
- [ ] **MKT** Ongoing review program + social-proof build (benchmark vs Care Hub's ~82k FB)
- **Acceptance:** `/conditions` + `/glossary` live; AI engines begin citing Anees for "home care for X in Egypt"; growing review corpus.

---

## 18. 30 / 60 / 90-day plan

**30 days — Foundation & quick wins:** Sprint 0 + the `/faq` hub + `/pricing` overview + answer-ready blocks + OG card + header nav. *Outcome: mid-funnel indexable, AI-citable answers live, local presence started.*

**60 days — Commercial expansion:** complete service catalog + top-4 location pages + pricing pages + canonical NAP locked + directory citations begun + review flow live + `aneesclinic.com` resolved. *Outcome: ranking for high-intent service + neighbourhood + price queries; local-pack presence.*

**90 days — Authority & GEO:** blog engine + first 6 articles + comparison/how-to/condition content + remaining locations + Wikidata/Crunchbase + off-domain seeding + CWV pass. *Outcome: topical authority, AI-engine citations, defensible "Managed Home Care" category ownership.*

---

## 19. Master priority checklist

**Do-now (highest ROI first):** *(✅ = shipped in code; ⏳ = owner action still required)*
- [x] Route `/services` + `/specialties` (turn on built code) — *largest organic gain* ✅ 2026-06-25
- [x] Fix the homepage "Services" 404 CTA ✅ 2026-06-25
- [x] Delete `sitemap-doctors.ts` + the robots 404 line; make robots locale-aware ✅ 2026-06-25
- [x] Config fail-fast on missing prod `NEXT_PUBLIC_SITE_URL` (before OVH migration) ✅ 2026-06-25
- [x] Ship `llms.txt` (+ generate `llms-full.txt`) ✅ 2026-06-25
- [ ] ⏳ **OWNER — Create a bilingual Google Business Profile** + start collecting reviews *(biggest transactional lever; account-owner task)*
- [ ] ⏳ **OWNER — Redeploy** (live site still lags the code)
- [x] Fix `/about-us` entity `@id` + `sameAs` ✅ 2026-06-25
- [x] Decide the `aneesclinic.com` question ✅ 2026-06-25 (owner confirmed it's the stopped predecessor brand → 301 plan documented in §11; the redirect itself is a ⏳ registrar task)

**Testing checklist:** Rich Results Test each new page · `sitemap.xml` 200 with all URLs · `robots.txt` blocks `/en/booking` & `/en/portal` · canonicals/hreflang resolve to https in prod · Search Console: submit sitemap + watch coverage · PageSpeed/CrUX on home + a service page · GBP verified + categories set.

---

## 20. Sources

**Repo (verified firsthand):** `src/lib/seo/{site,metadata,jsonld,faqs,coverage,search-discovery}.ts`, `src/app/{robots,sitemap,sitemap-doctors}.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/doctors/[slug]/page.tsx`, `src/components/sections/home/{homeBanner,sectionFaq}.tsx`, `next.config.ts`, `src/lib/config/index.ts`, `src/lib/config/social-links.ts`.

**Competitors & market (web-verified):**
- 7keema — https://7keema.com/ · OtlobTabib — https://www.otlobtabib.com/en · Vezeeta — https://www.vezeeta.com/en/home-visits · CliniDo — https://clinido.com/en · Curexmed — https://www.curexmed.com/en/ · DoktorCare — https://doktorcare.health/en/home/ · Andalusia Home Care — https://page.andalusiaegypt.com/homecare-nursing
- **Care Hub** — https://carehub.eg/ · https://www.dalilimedical.com/en/doctor-18455/CARE-Hub-Home-Hospital · https://www.facebook.com/carehubegy/ · https://www.linkedin.com/company/carehubegy/ · https://macro.care/en/partners/care-hub · https://yellowpages.com.eg/en/profile/care-hub/704728
- SEO/phone cluster — drmoamenada.com · egypt.hospitalia.net · eshfaa.com · vitalcare-eg.com · dalilimedical.com · tebcan.com
- Market/standards — Grand View Research & MarketDataForecast (market size) · GEO paper (arXiv 2311.09735, KDD 2024) · llmstxt.org · Google FAQ/HowTo rich-result deprecation (Search Engine Land/Journal) · schema.org medical types · TechCrunch (Google removes AI Overviews for medical queries, Jan 2026) · BrightEdge (healthcare AI search 2023–2025).

---

## 21. Implementation log

> Running record of what is actually shipped against this plan. Updated after each change.

### 2026-06-25 — Sprint 0, batch 1 (infrastructure quick wins) — ✅ typecheck passing
- **Added `public/llms.txt`** — curated AI-crawler digest (brand, services, coverage, key pages, founders). Links only existing pages; expand when `/services` ships. *(H1 — partial; `llms-full.txt` route still to wire.)*
- **`src/app/robots.ts`** — refactored to a shared, **locale-aware** disallow (`/*/booking/`, `/*/payment/`, `/*/portal/`), centralized AI-crawler list (added `OAI-SearchBot`, `Claude-User`, `Claude-SearchBot`, `Perplexity-User`, `Google-CloudVertexBot`), and **removed the 404 `/sitemap-doctors.xml`** reference. *(C3, M4)*
- **Deleted `src/app/sitemap-doctors.ts`** — was not a valid Next route (404'd) and redundant with `sitemap.ts`. *(C3)*
- **`src/lib/config/index.ts`** — `baseUrl` now **fails fast in production** if `NEXT_PUBLIC_SITE_URL` is missing or not https (prevents localhost-canonical de-indexing during the OVH migration); dev still falls back to localhost. *(C4)* ⚠️ **Deploy note:** ensure `NEXT_PUBLIC_SITE_URL` is set in the production/CI environment, or the build will (intentionally) fail.
- **Added §16 Doctor & clinician search discoverability** to this document.

### 2026-06-25 — Sprint 0, batch 2 (the routes) — ✅ typecheck + lint + browser-verified
- **Routed `/[locale]/services`** (hub) — renders the bilingual service catalog from `search-discovery.ts`; emits `servicesItemListSchema` + `faqPageSchema` + `webPageSchema` + `breadcrumbSchema`. *Verified: HTTP 200, hero H1, 3 service cards, 7 JSON-LD blocks, screenshot clean, no console errors.* *(C1)*
- **Routed `/[locale]/services/[slug]`** — per-service page (`doctor-at-home`, `physiotherapy-at-home`, `elderly-care-at-home`) with matching-doctor grid + "How to book"; emits `medicalProcedureSchema` + `physiciansItemListSchema` + `howToBookingSchema` + FAQ + WebPage + Breadcrumb. *Verified: HTTP 200, MedicalProcedure + HowTo schema, 118 internal doctor-profile links.* *(C1, H2)*
- **Routed `/[locale]/specialties`** (hub) + **`/[locale]/specialties/[slug]`** — dynamic per-specialty pages with matching-doctor grid; emits `medicalSpecialtySchema` + `physiciansItemListSchema`. *Verified: hub 200 with 12 specialty links; specialty page 200 with MedicalSpecialty schema + 38 doctor links.* *(C1, H2)*
- **New shared components:** `src/components/common/FaqSection.tsx` (visible, crawlable FAQ) + `src/features/doctors/components/DoctorMiniGrid.tsx` (doctor cards linking to profiles).
- **`src/app/sitemap.ts`** — now emits the services + specialties hubs and all landing slugs (8 service + 26 specialty URLs across both locales); removed the stale "not built yet" omission comment. *(C1)*
- **`src/components/layout/Header.tsx`** — the "Services" nav now points to `/services` (was a dead `/#services` anchor) and the dropdown adds **Specialties** (desktop + mobile drawer). *(C2)*
- **Homepage "Services" CTA 404 resolved** — `homeBanner.tsx` already pointed at `/services`; it now resolves. *(C2)*
- *Verified bilingual:* `/ar/services` returns 200 with the Arabic H1. `npx tsc --noEmit` clean; ESLint 0 errors.

### 2026-06-25 — Sprint 0, batch 3 (entity + AEO polish) — ✅ typecheck + lint + verified
- **`/about-us` entity graph fixed** *(H3)* — the `MedicalOrganization` `@id` now matches `orgId()` exactly (`/#organization`, with the slash), so it no longer forks a second Organization node; `sameAs` now points to the org's social profiles instead of founder URLs (founders stay linked via `founder[]`). *Verified: 0 slash-less `@id`, 0 founder URLs in `sameAs`, socials present.*
- **Home FAQ single-sourced** *(H5)* — the home `faqPageSchema` is now built from the same `home.faqs` i18n messages the visible `<SectionFaq />` renders, so schema and on-page copy can't drift (and public copy stays in `messages/` per the i18n convention). *Verified: home 200, 5 populated Q&A in the schema.*
- **`/llms-full.txt` route added** *(H1)* — `src/app/llms-full.txt/route.ts` generates the expanded AI digest from the live data layer (services, specialties, coverage, FAQ, founders, contact) so it never drifts. *Verified: HTTP 200, 6 sections, correct Arabic brand name.*
- **Sitemap `lastModified` stabilized** *(M1)* — replaced per-request `new Date()` with a deploy-stable module constant, so re-crawls see a real "last changed" signal instead of always-"now".

**Still open in Sprint 0:** build the 1200×630 OG card *(M2)*, and redeploy.

### 2026-06-25 — Sprint 1, batch 4 (catalog + FAQ hub) — ✅ typecheck + lint + tests + browser-verified
- **Completed the service catalog** — added `home-nursing`, `lab-tests-at-home`, `post-operative-care`, `palliative-chronic-care` to `SERVICE_COPY` (EN + AR) in `search-discovery.ts`, plus doctor-matching cases in `matchServiceDoctors`. They auto-route (the `/services/[slug]` `generateStaticParams` reads `getAllServiceLandingSlugs`), auto-appear in the sitemap, and auto-list on the hub. *Verified: services hub now lists all 7; `/en/services/home-nursing` returns 200 with MedicalProcedure schema + 13 matched doctor links; sitemap carries 14 service-slug URLs across both locales.*
- **Built the standalone `/faq` hub** — `src/app/[locale]/faq/page.tsx` consolidates the bilingual FAQ catalog (`homeFaqs` + `servicesFaqs` + `bookingFaqs` + `coverageFaqs`) into 4 themed groups with `FAQPage` + `WebPage` + `Breadcrumb` schema. Added `buildFaqMetadata` to `metadata.ts`, made `FaqSection` multi-instance-safe (unique heading ids), and linked `/faq` from the site-wide footer (new `footer.faq` message in EN + AR) and the sitemap. *Verified: HTTP 200, H1, all 4 groups, 14 Q&A pairs in schema, footer link live.*
- *Quality gates:* `npx tsc --noEmit` clean · ESLint 0 errors · 59/59 unit tests pass.

**Sprint 1 — still open (code):** `/pricing` overview + 5 cost pages (needs real `BookingPrice` numbers), top-4 location pages (Maadi/New Cairo/Zamalek/Heliopolis), OG card. **Owner tasks:** Google Business Profile, canonical NAP + review flow, `aneesclinic.com` decision.

### 2026-06-25 — Sprint 1 batch 5 + Sprint 0 close-out (location pages + OG card) — ✅ typecheck + lint + tests + browser-verified
- **Location pages shipped** *(Cluster 3)* — new `src/lib/seo/areas.ts` neighbourhood catalog (the coverage GeoJSON is a single Greater-Cairo polygon, so per-area data lives here), plus `/[locale]/areas` hub (grouped by governorate) and `/[locale]/areas/[area]` (10 districts: Maadi, New Cairo, Zamalek, Heliopolis, Nasr City, Mohandessin, Dokki, Sheikh Zayed, 6th October, Giza). Each area page lists the 7 services, links the coverage map, and emits Place + WebPage + FAQ + Breadcrumb schema (no duplicate LocalBusiness node). Added `buildAreasMetadata`/`buildAreaMetadata`, wired the sitemap (hub + 20 area URLs), and added a footer "Coverage Areas" link (EN+AR). *Verified: hub 200 (2 governorate groups, 10 links), `/en/areas/maadi` 200 (Place schema, 7 service links, FAQ), `/ar/areas/zamalek` 200.*
- **OG share card built** *(M2)* — `scripts/generate-og-image.cjs` renders a branded 1200×630 PNG (navy/gold/cream) via `sharp` → `public/assets/img/og-default.png`; `site.defaultOgImage` now points to it (was the generic `about-img1.png`). Static PNG = reliable across all social crawlers. *Verified: image served 200 image/png; home `og:image` now references the new card; 0 references to the old image.*
- *Quality gates:* `npx tsc --noEmit` clean · ESLint 0 errors · 59/59 tests pass.

**Sprint 0 is now complete** except the owner redeploy. **Sprint 1 — still open:** `/pricing` (needs the owner's real prices). **Owner tasks:** Google Business Profile, canonical NAP + review flow, `aneesclinic.com` decision.

### 2026-06-25 — Sprint 1 close-out + Sprint 2 kickoff (pricing + guides engine + content) — ✅ typecheck + lint + tests + browser-verified
- **Pricing cluster** *(Sprint 1)* — `src/lib/seo/pricing.ts` (owner-fillable "from EGP X" data, `null` ⇒ "confirmed before booking" instead of an invented figure) + `/[locale]/pricing` overview (transparent-pricing copy, a service price table linking to each service, `bookingFaqs`, and an `AggregateOffer` that auto-emits once a price is set). Added `buildPricingMetadata` + sitemap + footer link. *Verified: `/en/pricing` 200, 7 service rows, no invented prices, AggregateOffer correctly absent until numbers are added.*
- **Content engine + 3 flagship guides** *(Sprint 2)* — `/[locale]/guides` hub + `/[locale]/guides/[slug]` (structured bilingual content in `src/lib/seo/guides.ts`, no MDX dep; activates the previously-unused `articleSchema`). Written as CMO/content-creator, GEO-optimized (clear definitions, a cited statistic, chunked sections, FAQ), and positioned on continuity/managed-care — deliberately **not** competing with Care Hub's home-hospital/ICU lane:
  1. *How to Choose a Home Nursing Company in Egypt (2026)* — buyer's checklist + red flags (beats the thin paid directory listicles).
  2. *Home Care vs. Nursing Home in Egypt* — decision/comparison (PAA target).
  3. *Home Healthcare in Egypt: The Complete 2026 Guide* — pillar (cites the ~USD 160M→272M market + 75% chronic-disease stats; links every cluster).
  Added `buildGuidesMetadata`/`buildGuideMetadata` + sitemap + footer link. *Verified: hub 200 (3 cards); `/en/guides/home-care-vs-nursing-home-egypt` 200 (Article schema, 10 sections, FAQ); `/ar/guides/home-healthcare-egypt-guide` 200 (Arabic renders, stat cited).*
- **`aneesclinic.com` resolved** — owner confirmed it was Anees's stopped predecessor brand → documented the 301-redirect plan in §11 (registrar task).
- *Quality gates:* `npx tsc --noEmit` clean · ESLint 0 errors · 59/59 tests pass.

### 2026-06-25 — Pricing model switched to packages (owner request) — ✅ typecheck + lint + tests + verified
- **Restructured `src/lib/seo/pricing.ts` to a package model** — each offering has tiers (single "from" price or a "from–to" range); empty tiers ⇒ "Confirmed before booking" (no invented figures). Seeded from owner notes: **Sanad — Ongoing Home Care** (Monthly from EGP 19,500; Annual from EGP 60,000) and **Home Physiotherapy Program, 12 sessions** (EGP 8,000–12,000), both bilingual. Home nursing / doctor visit / labs / post-op left empty pending prices.
- **Rebuilt `/pricing`** to render package cards with tiers + ranges, linking each to its service page; `AggregateOffer` now auto-emits (lowPrice 8,000 / highPrice 60,000). *Verified: `/en/pricing` 200 (Sanad tiers shown, AggregateOffer present), `/ar/pricing` 200 (سند / من 19,500 ج.م).*
- *Quality gates:* typecheck clean · ESLint 0 · 59/59 tests pass.
- **⚠️ Needs owner confirmation:** the Sanad Annual (EGP 60,000) reads lower than 12× the monthly (EGP 19,500) — confirm it's a distinct/lighter annual plan, not a typo. And send the remaining package prices.

### 2026-06-25 — Sprint 3 kickoff: condition/use-case pages (Cluster 7) — ✅ typecheck + lint + tests + browser-verified
- **New `medicalWebPageSchema` helper** in `jsonld.ts` (schema.org `MedicalWebPage` with medical `aspect` + patient `audience` — the standards-correct type for health-content pages) + a shared `ArticleSections` render component.
- **4 bilingual condition pages** (`src/lib/seo/conditions.ts` + `/[locale]/conditions` hub + `/[locale]/conditions/[slug]`), written as content lead, GEO-optimized, each linking to the relevant home services:
  1. *Stroke Rehabilitation at Home* → physiotherapy + nursing
  2. *Post-Surgery Wound Care at Home* → nursing + post-op
  3. *Diabetic Foot Care at Home* → nursing + doctor visit
  4. *Elderly Fall Prevention at Home* → physiotherapy + elderly care
  Each emits `MedicalWebPage` + `Article` + `FAQPage` + `Breadcrumb`. Added `buildConditionsMetadata`/`buildConditionMetadata`, sitemap (8 condition URLs), and a footer "Care by Condition" link (EN+AR). *Verified: hub 200 (4 cards); `/en/conditions/stroke-rehab-at-home` 200 (MedicalWebPage schema, 4 sections, FAQ, 2 service links); `/ar/conditions/diabetic-foot-care` 200.*
- *Quality gates:* typecheck clean · ESLint 0 · 59/59 tests pass.

### 2026-06-25 — Design pass: brand polish across all new pages — ✅ typecheck + lint:css + lint:color + ESLint + tests + verified
- **New shared UI components** (brand-tokenized, CSS-var only, logical properties): `ContentHero` (cream hero band with a soft gold radial glow + a gold pill eyebrow + H1 + lead), `ContentCard` (rounded `--radius-lg` cards with a gold-tinted icon, optional meta pill, hover lift + soft→elevated shadow + gold arrow), restyled `FaqSection` (cards with a gold inline-start accent), and a `.prose` style for `ArticleSections` (gold list markers, readable rhythm). Icon map (`src/lib/seo/icons.ts`) uses only fa-classes `LucideIcon` actually maps.
- **Applied across all 12 new routes** — services (hub + slug), specialties (hub + slug), areas (hub + slug), conditions (hub + slug), guides (hub + slug), faq, pricing. Replaced the plain Bootstrap heroes/cards; dropped the duplicate breadcrumb title so each page has one clean hero.
- *Verified:* all 12 pages HTTP 200 (EN + AR) with `ContentHero`/`ContentCard` present; computed styles confirm the tokens apply (navy/gold/cream, 999px pill eyebrow `rgb(166,131,65)`, 20px card radius, navy soft-shadow, gold-tinted icon via `color-mix`). `tsc` clean · logical-CSS guard **passed** · color guard clean **for all new files** · ESLint 0 · 59/59 tests.
- **⚠️ Pre-existing issue flagged (NOT mine):** `npm run lint:color` fails on `src/features/booking/components/payment-method.module.scss` (4 raw hex colours, last changed in commit `c3bc5e2` before this session). Out of scope here — flagging per the "surface, don't silently fix" rule; worth a small follow-up to token-ize or `// hex-ok` those.

### 2026-06-25 — Sprint 3 cont.: Glossary cluster (Cluster 9) — ✅ typecheck + lint:css + lint:color + ESLint + tests + browser-verified
- **New `DefinedTermSet` + `DefinedTerm` schema helpers** in `jsonld.ts` (the standards-correct types for glossary/definition content).
- **10 bilingual glossary terms** (`src/lib/seo/glossary.ts` + `/[locale]/glossary` hub + `/[locale]/glossary/[slug]`): home healthcare, home nursing, home physiotherapy, geriatric care, palliative care, post-operative care, wound care, IV therapy, chronic disease management, vital signs. Each page = a crisp "What is X?" definition (GEO clean-definition pattern) + "when you'd need it" + the related Anees service + cross-links to sibling terms. Uses the new `ContentHero`/`ContentCard` design. Added `buildGlossaryMetadata`/`buildGlossaryTermMetadata`, sitemap (20 term URLs + 2 hubs), and a footer "Glossary" link (EN+AR).
- *Verified:* hub 200 (10 cards, `DefinedTermSet` schema); `/en/glossary/home-nursing` 200 (`DefinedTerm` schema, "What is Home nursing", related-service + 6 sibling links); `/ar/glossary/palliative-care` 200.
- *Quality gates:* typecheck clean · logical-CSS guard passed · color guard clean · ESLint 0 · 59/59 tests.

### 2026-06-25 — Performance / CWV pass (M3) — ✅ typecheck + ESLint + tests + verified
- **Self-hosted Bootstrap** — downloaded the pinned **v5.3.0** CSS (`public/assets/css/bootstrap.min.css`, 232,914 B) and JS bundle (`public/assets/js/bootstrap.bundle.min.js`, 80,421 B), and repointed `src/app/layout.tsx` (CSS `<link>`) + `src/app/[locale]/layout.tsx` (JS `<Script>`) to the local copies. Render-critical CSS is now **same-origin** (faster first paint, resilient if the CDN is blocked/down, and no third-party request per visit — a privacy win for a medical platform). Removed the now-dead `cdn.jsdelivr.net` preconnect/dns-prefetch and added an `/assets/js` 1-week cache header in `next.config.ts`. Documented the deliberate `<link>` (vs CSS import) to keep it out of the app's CSS-order graph.
- **The rest was already optimal** (good news — the M3 audit assumed otherwise): Microsoft Clarity + Meta Pixel are already `strategy="lazyOnload"`, Bootstrap JS is `afterInteractive`, Chatling is lazy, Google fonts are self-hosted by Next with `display: swap`, and the cdnjs preconnect remains for the font origin.
- *Verified:* `/assets/css/bootstrap.min.css` + `/assets/js/bootstrap.bundle.min.js` serve 200 with correct content-types and exact byte sizes; `/en/services` references the local paths with **0 jsdelivr requests**; CSS is byte-identical v5.3.0 so styling/JS behavior is unchanged. typecheck clean · ESLint 0 · 59/59 tests.
- **Optional follow-up:** the `cdn.jsdelivr.net` entry can now be removed from `next.config.ts` CSP `script-src`/`style-src` (left in place to avoid an untested CSP change here).

### 2026-06-25 — Bootstrap → design-system migration, Phase 1 (foundation + public hubs)
- **Why:** move the public site to the intended stack — SCSS Modules + design tokens + native CSS Grid/Flex layout primitives + (later) Radix UI for interactive widgets — and retire Bootstrap. This is a **staged migration**, not a delete: Bootstrap is load-bearing in **76 files** (44 public, 21 admin, 8 portal, 3 clinician — admin/portal/clinician use it by design), so it can only be *removed* once every file is converted **and visually verified**.
- **Built the foundation:** token-based layout primitives `src/components/common/layout/` (`Container`, `Section`, `Grid`, `Stack`, `Cluster`, `Measure`) — native CSS Grid/Flexbox, logical properties, container widths mirroring Bootstrap's steps exactly so converted pages stay edge-aligned with not-yet-migrated chrome.
- **Converted (Bootstrap-grid-free):** shared `ContentHero` + `FaqSection`, and the **6 public hub pages** (services, specialties, conditions, guides, glossary, faq) — `section/container/row/col` → `Section`/`Container`/`Grid`. *Verified: all 200 EN+AR, primitives present, card grids no longer Bootstrap.*
- ⚠️ **Verification limit (important):** this headless preview renders at a **1px viewport**, so I can confirm structure/CSS correctness but **cannot see responsive rendering**. The remaining surfaces — esp. the auth-gated **admin/portal/clinician (EHR)** I can't reach — must be visually QA'd in a real browser before they're trusted.
- *Quality gates:* typecheck clean · logical-CSS guard passed · color guard clean · ESLint 0 · 59/59 tests.
- **Remaining migration (staged):** article/[slug] pages + pricing table + areas hub (typography/utility classes), the shared chrome (`Header`/`Footer`/`Breadcrumb`/`RelatedLinks` — affects every public page), the doctors grid (Bootstrap-JS offcanvas/dropdown → Radix), home sections, then admin (21) / portal (8) / clinician (3). **Only after all 76 are converted + verified can Bootstrap (CSS + JS + CSP entries) be removed.**

### 2026-06-25 — SEO/AEO/GEO content phase: high-intent + seasonal guides — ✅ typecheck + ESLint + tests + verified
- **4 new bilingual guides** added to the engine (`guides.ts`), targeting the high-intent + seasonal demand the market research flagged as under-served:
  1. *How to Book a Doctor Home Visit in Egypt (Step by Step)* — transactional how-to.
  2. *Night & Emergency Doctor Home Visits in Cairo* — winter/urgent demand spike, with a clear "when to call an ambulance instead" safety section (E-E-A-T).
  3. *IV Drip & Hydration at Home in Cairo* — summer/dehydration demand, with a medical-safety caveat (IV must be doctor-indicated).
  4. *Managing Diabetes at Home During Ramadan* — Ramadan-specific, culturally relevant (glucose monitoring, medication timing, when to break the fast).
- GEO-optimized (clear structure, safety notes, FAQ); each emits `Article` + `FAQ` + `Breadcrumb` and auto-appears on the `/guides` hub and sitemap.
- *Verified:* `/en/guides` now lists **7 guides**; new pages 200 with FAQ schema; `/ar/guides/diabetes-care-ramadan` 200 (Arabic renders); sitemap carries 14 guide URLs. typecheck clean · ESLint 0 · 59/59 tests.

### 2026-06-26 — Audit re-verification + next-phase batch (doctor discoverability, AEO answer blocks, GEO citations, comparison guides) — ✅ typecheck + ESLint(0 err) + 59/59 tests
- **Re-audited the doc against the repo** (multi-agent: 6 dimension auditors + synthesis). Verdict: the doc is broadly accurate; found **one real bug** + three narrow overstatements + two stale-but-safe rows (now reconciled above).
- **🐛 Fixed the doctor de-index hole** *(new, medium)* — `getDoctorBySlug` (`src/lib/api/doctors.ts`) now filters `isActive`. Previously `generateStaticParams` + sitemap excluded inactive doctors, but a direct hit to an inactive slug still rendered a fully-indexable profile (`index:true`). Now inactive → `null` → `notFound()` + `robots:{index:false}`. The §16 consent leak on the direct-URL surface is closed.
- **`practicesAt` added to `physicianSchema`** *(§16)* — `{ '@id': orgId() }` alongside `worksFor`/`memberOf` (schema.org v24 recommended Physician property → entity consolidation + name-search ranking).
- **Doctor-profile `RelatedLinks` re-linked** to `/services` + `/specialties` (stale "those routes 404" comment removed — they exist now), rejoining doctor pages to the internal-link mesh.
- **§15 front-loaded answer blocks rendered** — new `SERVICE_ANSWER` map + `getServiceAnswer()` in `search-discovery.ts` (no baked-in prices, so no drift) renders a 40–80-word quotable direct answer under the hero on every `/services/[slug]`; a matching answer block added to `/pricing`. This is the AEO/featured-snippet + AI-citation lever the audit designed but had never put in the DOM.
- **GEO citations added** *(top §6 lever: statistics +33%, sources +28%)* — one dated, sourced statistic + named authority woven into all **4 conditions** (NIH on the stroke recovery window; WHO on surgical-site infection; IDF + diabetic-foot research on ulcer/amputation risk; WHO on falls) and **3 guides** (IDF on Egypt's diabetes burden for the Ramadan guide; WHO oral-rehydration-first for the IV-drip guide; the "time is brain" 1.9M-neurons/min figure + the FAST stroke check for the night/emergency guide), EN + AR. *(The procedural `how-to-book` guide was deliberately left without a forced statistic — a citation there would not improve the page.)*
- **4 new Cluster 5 comparison guides** (bilingual, GEO-structured, **no fabricated competitor rankings** — criteria-based and honest): `best-home-nursing-cairo`, `best-home-physiotherapy-cairo`, `home-visit-vs-clinic`, `home-nursing-vs-private-nurse`. Guides corpus is now **11 per locale**.
- **Area pages now feed the link mesh** — `/areas/[area]` renders a matched home-visit `DoctorMiniGrid` (capped at 12) + `physiciansItemListSchema`, closing the "doctor home visit in `<area>`" internal-link dead-end.
- **Dead `aggregateOfferSchema` revived** — refactored to take `number[]` (returns `null` when no price is set) and wired into `/pricing`, replacing the inline duplicate (kills the two-path drift risk). Removed the now-unused `BookingPriceMap` import from `jsonld.ts`. *(§3 H2 is now genuinely 5/5 builders emitted.)*
- **Housekeeping** — reworded the `homeBanner.tsx` trust-strip comment so it no longer signals intent to mark up a self-serving `AggregateRating` *(H4)*; fixed the footer's visible "Specialities" → "Specialties" to match the route/header. Reconciled the §3 table (C2/H2/M5 marked resolved) + the §16 checklist.

### 2026-06-26 — Doctor search discoverability + DB migration (§16) — ✅ migration applied to prod · typecheck + ESLint + 59/59 tests
- **DB migration `20260626120000_add_doctor_seo_discoverability`** (additive, non-destructive) — applied to the production Postgres via `prisma migrate deploy` (the safe, non-resetting path; migration state was clean beforehand and is clean after). Two new columns on `doctors`:
  - `isPublic BOOLEAN NOT NULL DEFAULT true` — public-profile **consent** flag. Default `true`, so every existing doctor stays exactly as it is; no behaviour change until a clinician is explicitly marked private.
  - `externalProfiles JSONB` (nullable) — verified external-profile URLs, emitted as schema.org `sameAs`.
  - *Verified*: `information_schema` confirms both columns + the `true` default; `migrate status` = up to date.
- **`isPublic` gating wired through the single data layer** — `getDoctors`, `getAllDoctorSlugs`, and `getDoctorBySlug` (`src/lib/api/doctors.ts`) now filter `isPublic: true`. One flag therefore hides a non-consented clinician from **every** public surface at once: the `/doctors` listing, the service/specialty/area doctor grids, the sitemap, the static build (`generateStaticParams`), and the direct profile URL (`getDoctorBySlug` → `null` → `notFound()` + `robots:{index:false}`).
- **`externalProfiles` → `sameAs`** — `mapDoctor` maps the column; `physicianSchema` emits a `sameAs` array when URLs exist (omitted when empty, which is the current state until the owner supplies verified URLs). `practicesAt` (shipped earlier today) + `sameAs` together are the §16 identity-consolidation pair that strengthens name-search ranking + Knowledge-Panel eligibility.
- **Owner-data note:** the plumbing is live and safe; it carries no data yet. `externalProfiles` stays empty until the owner provides each doctor's verified URLs, and every doctor stays public until the owner decides which (if any) to set `isPublic=false`.

### 2026-06-26 — Condition deep-dives expanded (Cluster 7) — ✅ typecheck + ESLint + 59/59 tests
- **3 new bilingual condition pages** added to `conditions.ts` (now **7 per locale**), each GEO-structured with one web-verified cited statistic + named authority, and cross-linked to the relevant home services:
  1. *Dementia & Alzheimer’s Care at Home* (WHO: 55M+ people live with dementia worldwide, 60%+ in LMICs) → elderly care + nursing.
  2. *Bedsore (Pressure Ulcer) Care at Home* (EPUAP/NPIAP guidelines: reposition ≥ every 2h; most are preventable) → nursing + post-op.
  3. *COPD & Respiratory Care at Home* (WHO: 3rd leading cause of death worldwide; ~90% of under-70 deaths in LMICs) → doctor visit + nursing.
- All emit `MedicalWebPage` + `Article` + `FAQPage` + `Breadcrumb`, auto-route via `/conditions/[slug]`, and auto-appear on the hub + sitemap (driven by `getAllConditionSlugs`).

### 2026-06-26 — Cluster 6 completed (how-to guides) — ✅ typecheck + verified
- **2 final how-to guides** added to `guides.ts` (now **13 per locale**), completing §13 Cluster 6:
  1. *How to Prepare Your Home for Recovery After Surgery* — discharge-prep checklist (cites WHO surgical-site-infection burden).
  2. *How to Care for an Elderly Parent at Home in Egypt* — the sandwich-generation caregiver framework (cites the WHO projection that 1 in 6 people will be 60+ by 2030).
- Both bilingual, GEO-structured (definition → checklist → FAQ), `Article` + `FAQ` + `Breadcrumb` schema, auto-routed + sitemapped. *Verified: both 200 EN + AR with the cited authority; hub lists all 13.*

### 2026-06-26 — AI-search brand summary seeded (§12) — ✅ typecheck + valid JSON + verified
- The §12 AI-search brand summary (doctor-founded + continuous-coordinated-care differentiator) is now the **machine-readable entity description** in two places: the site-wide `organizationSchema.description` (`jsonld.ts`, emitted on the homepage and every page) and the About page's `AboutPage → mainEntity` description (`founders_search_statement` in `messages/en|ar.json`, which previously held only a one-line founder sentence). Bilingual; `llms.txt` already carried it. *Verified: both phrases present in `/en` and `/en/about-us` JSON-LD.*

### 2026-06-26 — Condition library expanded to 10 (Cluster 7) — ✅ typecheck + ESLint + verified
- **3 more bilingual condition pages** added to `conditions.ts` (now **10 per locale**), each with a web-verified WHO statistic + named authority, cross-linked to the relevant services:
  1. *High Blood Pressure (Hypertension) Care at Home* (WHO: 1.28 billion adults aged 30–79 have hypertension; ~half unaware) → doctor visit + nursing.
  2. *Parkinson’s Disease Care at Home* (WHO: 8.5M+ people, doubled in 25 years) → physiotherapy + nursing.
  3. *Cancer & Palliative Care at Home* (WHO: 56.8M need palliative care/yr, only ~14% receive it) → palliative-chronic care + nursing.
- The full condition library now covers the highest-intent elderly/chronic/post-op verticals: stroke, post-surgery wounds, diabetic foot, fall prevention, dementia, bedsores, COPD, hypertension, Parkinson’s, cancer/palliative. *Verified: all 3 render 200 EN + AR with the cited authority; hub lists 10.*

### 2026-06-26 — Blog engine shipped (Cluster 10) — ✅ typecheck + ESLint + 59/59 tests + verified
- **`/blog` built as a DISTINCT content type from `/guides`** (owner asked for it; built so it adds value rather than duplicating): a *dated awareness / patient-education* stream emitting `Blog` + `BlogPosting` JSON-LD (not `Article`), ordered newest-first, with the publish date shown on every card and post. A live dated stream is also a recency signal AI answer engines reward.
- **`src/lib/seo/blog.ts`** + `/[locale]/blog` hub + `/[locale]/blog/[slug]`, with **4 all-new bilingual posts** that do NOT overlap the guides/conditions libraries:
  1. *Signs Your Elderly Parent May Need Home Care* (awareness checklist).
  2. *What to Expect During a Doctor’s Home Visit* (the visit experience — distinct from the how-to-book guide).
  3. *How a Real Medical Record Changes Home Care for Your Family* (the EMR/continuity differentiator — on-brand, no existing page covers it).
  4. *Protecting Elderly Parents During Egypt’s Summer Heat* (seasonal awareness).
- Added `blogPostingSchema` to `jsonld.ts`, `buildBlogMetadata`/`buildBlogPostMetadata`, sitemap entries (hub + 4 posts × 2 locales), and a footer **Blog** link (EN+AR). *Verified: hub 200 (4 dated cards), all posts 200 EN+AR, `BlogPosting` schema present.*

### 2026-06-26 — Per-service cost explainers shipped (Cluster 4) — ✅ typecheck + ESLint + 59/59 tests + verified
- **`/pricing/[service]-cost` pages built to target the distinct "how much does X cost in Egypt" query** (different intent from the service pages and the /pricing packages overview — so additive, not duplicate): `src/lib/seo/pricing-explainers.ts` + `/[locale]/pricing/[slug]`, with **5 bilingual cost pages** — doctor-home-visit, home-nursing, home-physiotherapy, lab-tests-at-home, elderly-care.
- Each leads with a **cost-first direct answer** (snippet/AEO bait, distinct from the service answer-blocks), explains *what drives the price*, and shows a **price box**. Crucially, **no figures are hard-coded**: the price box + `AggregateOffer` are pulled from `pricing.ts` via `packageSlug` (single source — zero drift). The 2 offerings with a published anchor (physiotherapy program, Sanad elderly package) show the real EGP figure + emit `AggregateOffer`; the other 3 honestly read "confirmed before booking" with the cost-driver breakdown.
- **Internal-link mesh:** `/pricing` overview now lists all cost guides, and each `/services/[slug]` page links to its matching cost guide under the answer block. Wired into the sitemap (5 × 2 locales). *Verified: all 5 render 200 EN+AR; anchored pages show the real `pricing.ts` figure + `AggregateOffer`; unanchored pages omit the offer; cross-links resolve. Sitemap now 232 URLs.*

### 2026-06-26 — 🐛 Title-tag (browser-tab) doubling fixed sitewide — ✅ typecheck + ESLint + 59/59 tests + verified
- **Confirmed + fixed the brand-doubling the audit §2 flagged as a risk.** Every `<title>` was rendering the brand **twice** — e.g. `About Us | Anees Health | Anees Health`, `…(2026) | Anees Health | Anees Health` (up to **106 chars** on area pages). Cause: the root layout's `title.template: '%s | Anees Health'` (`buildSiteMetadata`) **plus** ~20 per-route builders each hard-appending the brand. Worse on Arabic, which got the Arabic brand from the builder **and** the English brand from the template (`من نحن | أنيس هيلث | Anees Health`).
- **One central fix in `buildBaseMetadata`** (`metadata.ts`): strip any brand suffix the caller appended, add the **locale-correct** brand exactly once (skip it when the title already references the brand — home, doctors hub, service taglines), and emit `title: { absolute }` to bypass the English root template. Fixes ~15 page types at a stroke, and makes Arabic titles use `أنيس هيلث`.
- **Shortened four over-length hub titles** so they sit in the ~45–65 char SERP-display range: doctors hub (82→55), FAQ (85→44), pricing hub (92→53), area pages (106→~57). Content (guide/blog/condition) titles stay descriptive + keyword-front-loaded (~63–74) — full title indexed, only the display truncates.
- *Verified across EN + AR:* every title now carries the brand **once**, locale-correct; `/en/about-us` went from 2 brand mentions to 1. *(Also confirmed the earlier "Specialty not found" was a bad test slug — real slug is `internal-medicine-gastroenterology`; specialty pages render fine.)*

### 2026-06-26 — Static-rendering (ISR) optimization — investigated, NOT shipped (reverted)
- **Goal:** flip the `[locale]` public pages from dynamic SSR (ƒ) to static/ISR (○, `revalidate=3600`) for a TTFB/CWV win. **Outcome: blocked by a next-intl + Next 16 interaction; reverted to the known-good dynamic state.**
- **Root cause (confirmed via `export const dynamic = 'error'` diagnostic builds):** the shared `[locale]/layout.tsx` render tree reads `headers()`, which opts the whole subtree out of static rendering. It is **not** the obvious caller — the `headers()` read **persisted even after** adding `setRequestLocale` (layout + pages), removing the explicit `{locale}` args, and fully replacing `getMessages()`/`getTranslations()` with direct static `messages/*.json` imports. That points at next-intl's core integration (the `NextIntlClientProvider` + client `useTranslations` resolving the locale during SSR, combined with the `createIntlMiddleware` locale detection in `src/proxy.ts`).
- **Why parked:** making it static needs an **i18n restructure** (e.g. migrate to next-intl `defineRouting`, and/or move off middleware-based locale detection) — a significant, separately-testable change to infrastructure that is **load-bearing across the entire site** (public + admin + portal + clinician). **SEO impact of staying dynamic is nil** — every page already serves complete, crawlable HTML + JSON-LD on each request (verified throughout). It is a pure perf optimization, so the risk/reward did not justify shipping it as a live hack. *(Versions confirmed compatible: Next 16.2.6, next-intl 4.12.0.)*
- **Pre-existing facts for the next attempt:** root + `[locale]` layouts are otherwise clean (no `headers/cookies/auth`); `SessionProvider` is a pure client component; `next.config`/middleware don't force dynamic; only 7 truly-static routes prerender today (offline, llms-full, robots, sitemap, …).

**Now open (code):** *(optional perf)* the `[locale]` static-rendering/ISR optimization above — needs a dedicated, isolated i18n refactor · complete `pricing.ts` packages with the remaining owner numbers (the cost pages will surface them automatically) · the Bootstrap → design-system migration (Phase 1 done; staged, needs real-browser verification). **Owner tasks:** Google Business Profile + reviews, canonical NAP, the `aneesclinic.com` 301, directory citations, **supply doctor external-profile URLs + decide any non-public clinicians**, redeploy.

---

*This document is a living plan: the [Implementation log](#21-implementation-log) and the sprint checklists are updated after each change.*
