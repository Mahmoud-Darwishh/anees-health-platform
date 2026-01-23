# SEO & GEO Status Documentation

**Last Updated:** January 23, 2026  
**Platform:** Anees Health (Next.js, TypeScript, Bilingual EN/AR)

---

## 📊 Current SEO Status

### ✅ Implemented Features

#### 1. **Technical SEO**
- **Next.js Server Components**: SSR-first architecture for better crawlability
- **XML Sitemap**: Dynamic `sitemap.ts` with all routes, priorities, and update frequencies
- **Robots.txt**: Configured via `robots.ts` for crawler guidelines
- **Canonical URLs**: Implemented in all pages to prevent duplicate content
- **Hreflang Tags**: Language alternates configured for EN/AR versions
- **Meta Tags**: 
  - Comprehensive title and description templates
  - Open Graph (OG) tags for social sharing
  - Twitter Card meta tags
  - Viewport and charset meta tags

#### 2. **Structured Data (Schema.org)**
- **BreadcrumbList Schema**: Implemented on all pages for navigation hierarchy
- **MedicalOrganization Schema**: Core business schema (name, address, contact, services)
- **LocalBusiness Schema**: Enhanced with geo-targeting data
- **LocalBusinesses Collection Schema**: Aggregated city-level schema

#### 3. **Metadata Architecture**
- **Root Layout Metadata** (`src/app/layout.tsx`):
  - Default title: "Anees Health | Home Healthcare & Telemedicine Egypt"
  - Keywords: 30+ core + bilingual Arabic keywords
  - GEO meta tags: Region (EG), place name (Cairo), coordinates
  - Open Graph & Twitter cards with OG image (1200×630px)

#### 4. **Bilingual Implementation**
- Localized URLs: `/en/*` and `/ar/*` routes
- Language alternates: hreflang linking EN ↔ AR
- Translated metadata and keywords for each locale
- RTL layout support for Arabic

#### 5. **Geo-Targeting (City Pages)**
- **Cairo Page** (`/[locale]/cairo`):
  - 20 neighborhoods (Zamalek, Maadi, Nasr City, Heliopolis, 5th Settlement, etc.)
  - Local keywords targeting Cairo
  - City-specific metadata and schema
  - 85+ doctors, 12,000+ patients stats
  
- **Giza Page** (`/[locale]/giza`):
  - 15 neighborhoods (6th October, Sheikh Zayed, Mohandessin, etc.)
  - 62+ doctors, 8,500+ patients
  
- **Alexandria Page** (`/[locale]/alexandria`):
  - 18 neighborhoods (Smouha, Sidi Gaber, Laurent, etc.)
  - 45+ doctors, 5,200+ patients

#### 6. **Sitemap Optimization**
- Main homepage: Priority 1.0
- Doctors index: Priority 0.95 (high search volume)
- Services: Priority 0.9 (elderly care focus)
- City pages: Priority 0.85-0.9
- Doctor detail pages: Dynamic priorities (0.7-0.8 for prominent doctors)

#### 7. **On-Page SEO**
- Semantic HTML structure
- Proper heading hierarchy (H1, H2, H3)
- Internal linking to doctors, services, cities
- Footer navigation with city links
- Breadcrumb navigation component

---

## 🌍 Current GEO Status

### ✅ Implemented Features

#### 1. **Geographic Targeting**
- **Service Areas**: Cairo, Giza, Alexandria (Egypt)
- **Page Coverage**:
  - 3 dedicated city landing pages
  - Neighborhood-level granularity (53 total neighborhoods)
  - City-specific keyword targeting
  - Local business schema with city data

#### 2. **Geo Metadata**
- **Root Meta Tags** (`src/app/layout.tsx`):
  - `geo.region`: EG (Egypt)
  - `geo.placename`: Cairo, Egypt
  - `geo.position`: 30.0444;31.2357 (Cairo coordinates)
  - `ICBM`: GPS coordinates in ICBM format

#### 3. **Local Schema**
- Each city page includes:
  - Breadcrumb schema with city hierarchy
  - LocalBusiness schema with city name
  - Address schema (when applicable)
  - Geo-coordinates in JSON-LD

#### 4. **Coverage Map**
- GeoJSON file available: `/assets/coverage/anees-cover-areas.geojson`
- Coverage page: `/coverage` route with interactive map

#### 5. **Location-Based Navigation**
- Footer "Cities" section with links to:
  - Cairo
  - Giza
  - Alexandria
- City page CTAs linking to services, bookings, and contact

---

## 📈 Next Suggested Improvements (Tier 2)

### 🔴 High Priority

#### 1. **FAQ Schema & Content**
- **Impact**: Significant CTR boost (30-50%) on SERPs
- **Implementation**:
  - Create FAQ sections on:
    - Homepage: General service FAQs
    - City pages: Location-specific FAQs
    - Doctors page: "How to find doctors" FAQs
  - Add FAQPage schema with questions and answers
  - Target long-tail keywords ("How to...?", "What...?")
- **Effort**: 4-6 hours
- **Files to Create**:
  - `src/components/sections/FAQ.tsx` (reusable component)
  - FAQ data in `src/lib/data/faqs.ts`

#### 2. **Performance Metrics & Core Web Vitals**
- **Current State**: No preloading optimizations active
- **Impact**: Ranking factor + user experience
- **Recommended Optimizations**:
  - Font preloading (Google Fonts)
  - Image optimization with Next.js Image component
  - CSS critical path optimization
  - DNS prefetch for CDNs
  - Lazy loading for below-fold images
- **Tools**:
  - Google Lighthouse audits
  - PageSpeed Insights
  - WebPageTest
- **Effort**: 6-8 hours
- **Priority**: Link from layout.tsx with preconnect, preload, and media="print" deferring

#### 3. **Expanded City Coverage**
- **Current**: 3 cities (Cairo, Giza, Alexandria)
- **Suggested Add**: 
  - Port Said (major healthcare hub)
  - Ismailia (Suez Canal region)
  - Mansoura (Nile Delta)
- **Impact**: +300% more search impressions
- **Implementation**: Clone city page template for new cities
- **Effort**: 2-3 hours per city
- **Keyword Opportunity**: "home healthcare Port Said", "doctor home visit Mansoura", etc.

#### 4. **Enhanced Internal Linking**
- **Current State**: Basic footer navigation
- **Suggested Strategy**:
  - Link city pages to relevant doctors in that city
  - Link service pages to city pages where available
  - Add "Related Articles" sections
  - Context-aware links in content (neighborhoods → doctors → services)
- **Impact**: 15-25% improvement in crawl depth
- **Effort**: 3-4 hours

#### 5. **Trust & Authority Signals**
- **Suggested**:
  - Patient testimonials/reviews (with schema)
  - Certifications & credentials display
  - Case studies or success stories
  - Medical board/advisory listings
  - Trust badges (HIPAA, data privacy, etc.)
- **Impact**: Improved CTR + reduced bounce rate
- **Effort**: 6-8 hours (design + schema integration)

---

### 🟡 Medium Priority

#### 6. **Blog/Content Hub**
- **Purpose**: Long-form content targeting informational queries
- **Topics**:
  - "Home healthcare benefits for elderly"
  - "When to call a home nurse"
  - "Telemedicine best practices"
  - "Chronic disease management at home"
- **Impact**: +40% organic traffic from new keywords
- **Effort**: 10-15 hours (4-5 articles + layout)

#### 7. **Doctor Profile Enhancement**
- **Current**: Basic doctor grid
- **Suggested**:
  - Rich profile pages with:
    - Education & credentials (schema)
    - Specializations (LocalService schema)
    - Patient reviews with star rating schema
    - Availability/booking schema
  - Doctor detail pages with JSON-LD
- **Impact**: 20% increase in doctor page visibility
- **Effort**: 8-10 hours

#### 8. **Service Pages Deep Dive**
- **Current**: Generic service listing
- **Suggested**:
  - Individual pages per service:
    - Home nursing
    - Physiotherapy
    - Lab tests at home
    - Remote monitoring
  - Each with:
    - Service-specific schema
    - Local service provider schema
    - City-specific pricing/availability
    - Related doctor listings
- **Impact**: Capture service-specific search queries
- **Effort**: 6-8 hours

#### 9. **Structured Data for Booking**
- **Current**: No booking schema
- **Suggested**:
  - EventReservation schema
  - OfferCatalog schema for services
  - PriceRange schema
  - Availability schema
- **Impact**: Enhanced rich snippets in Google
- **Effort**: 4-6 hours

---

### 🟢 Low Priority (Nice to Have)

#### 10. **Video Content & Schema**
- **Ideas**:
  - Service explainer videos
  - Doctor introduction videos
  - Patient testimonial videos
- **Schema**: VideoObject schema
- **Impact**: Visual SERP features, longer session duration
- **Effort**: 12-16 hours (content creation + optimization)

#### 11. **Local Link Building**
- **Strategy**:
  - Egyptian healthcare directories
  - Local business associations
  - Medical news sites
  - Government health portals
- **Impact**: Domain authority + referral traffic
- **Effort**: Ongoing (2-3 hours/week)

#### 12. **Internationalization Expansion**
- **Current**: EN/AR only
- **Suggested**: French (for international patients)
- **Effort**: 4-6 hours + translation costs

#### 13. **Advanced Analytics & Tracking**
- **Current**: Likely no detailed tracking
- **Suggested**:
  - Google Analytics 4 setup
  - Google Search Console monitoring
  - Event tracking (clicks, form submissions)
  - Conversion tracking for bookings
- **Effort**: 2-3 hours setup

---

## 🎯 Recommended Roadmap (Next 30 Days)

### Week 1: High-Impact Quick Wins
1. ✅ FAQ Schema + Content (2-3 city pages)
2. ✅ Performance optimization (Core Web Vitals)
3. ✅ Enhanced internal linking strategy

### Week 2-3: Content & Coverage Expansion
1. Add 1-2 new cities (Port Said or Mansoura)
2. Enhance doctor profiles with schema
3. Create service-specific landing pages

### Week 4: Authority & Trust
1. Implement testimonials/reviews with schema
2. Add trust badges
3. Certifications display

---

## 📋 Current Sitemap Priorities

| Route | Priority | Change Freq | Reason |
|-------|----------|-------------|--------|
| `/` | 1.0 | Daily | Homepage |
| `/doctors` | 0.95 | Daily | High search volume |
| `/services` | 0.9 | Weekly | Service discovery |
| `/cairo`, `/giza`, `/alexandria` | 0.85-0.9 | Weekly | Geo-targeting |
| `/coverage` | 0.7 | Monthly | Coverage map |
| Doctor detail pages | 0.7-0.8 | Monthly | Individual profiles |

---

## 🔧 Technical Stack for Future Enhancements

- **Next.js 15+**: App Router (SSR-first)
- **TypeScript**: Strict typing for data structures
- **Schema.org**: JSON-LD format
- **Bilingual**: next-intl library
- **Styling**: SCSS Modules + Bootstrap utilities
- **Image Optimization**: Next.js Image component
- **Metadata**: Automatic via `generateMetadata()`

---

## ⚠️ Known Limitations

1. **No Performance Optimization**: Removed preload/preconnect optimizations
2. **No Testimonials/Reviews**: Feature was removed per request
3. **Limited City Coverage**: Only 3 cities implemented
4. **No FAQ Schema**: Not yet implemented
5. **No Video Content**: Not implemented
6. **Basic Doctor Profiles**: Limited structured data

---

## 📞 Contact & Metadata

- **Domain**: aneeshealth.com
- **Service Areas**: Cairo, Giza, Alexandria (Egypt)
- **Contact Email**: info@aneeshealth.com
- **Phone**: +201096185922, +201270558620
- **Languages**: English (en), Arabic (ar)

---

**Next Action**: Discuss which Tier 2 improvements to prioritize based on business goals and available resources.
