# SEO & GEO Implementation Guide

## Overview

This document outlines the comprehensive SEO (Search Engine Optimization) and GEO (Generative Engine Optimization) implementation for the Anees Health platform.

## What Was Implemented

### 1. **Robots.txt Configuration** (`/src/app/robots.ts`)
- Allows all major search engines (Google, Bing, Yandex)
- Explicitly allows AI crawlers:
  - **GPTBot** (OpenAI/ChatGPT)
  - **ChatGPT-User** (OpenAI ChatGPT)
  - **CCBot** (Common Crawl - used by many AI models)
  - **anthropic-ai** (Claude)
  - **PerplexityBot** (Perplexity AI)
  - **Google-Extended** (Bard/Gemini)
- Protects sensitive areas (API, booking confirmations, admin)
- References multiple sitemaps for better indexing

### 2. **Structured Data (JSON-LD)** (`/src/lib/utils/structured-data.tsx`)

Implemented comprehensive Schema.org structured data:

- **Organization Schema**: Brand identity, contact info, social profiles
- **MedicalOrganization Schema**: Healthcare-specific attributes
- **LocalBusiness Schema**: Location, hours, service areas
- **Website Schema**: Search functionality, language support
- **Doctor/Physician Schema**: Individual doctor profiles
- **MedicalService Schema**: Service descriptions
- **FAQ Schema**: Frequently asked questions
- **Breadcrumb Schema**: Navigation hierarchy

### 3. **Metadata Generator** (`/src/lib/utils/metadata.ts`)

Reusable utility functions for generating:

- **OpenGraph tags**: Rich social media previews
- **Twitter Cards**: Twitter-specific metadata
- **Canonical URLs**: Prevent duplicate content
- **Alternate language links**: hreflang tags for bilingual support
- **Page-specific metadata**: Home, Doctors, Services, Coverage

### 4. **Enhanced Sitemap** (`/src/app/sitemap.ts`)

Added routes:
- Main pages (home, doctors, services, coverage)
- About pages (team, careers)
- Contact page
- Legal pages (privacy, terms)
- All doctor profiles (dynamic)

### 5. **Root Layout Enhancements** (`/src/app/layout.tsx`)

- Comprehensive metadata with title templates
- Multiple OpenGraph images
- Geo-location metadata (Egypt-specific)
- Theme color for PWA
- Format detection (phone, email, address)
- Robots configuration for Google
- Verification meta tags (ready for Search Console)
- Web manifest reference

### 6. **Locale Layout with Structured Data** (`/src/app/[locale]/layout.tsx`)

- Injects Organization, LocalBusiness, and Website schemas
- Locale-aware structured data (English/Arabic)
- Proper dir/lang attributes for accessibility

### 7. **Web App Manifest** (`/public/manifest.json`)

- PWA configuration
- App icons and theme colors
- Categories for app store discovery

---

## How to Use These Utilities

### Adding Metadata to a Page

```typescript
import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/utils/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  
  return generatePageMetadata({
    locale,
    path: `/${locale}/your-page`,
    title: 'Your Page Title',
    description: 'Your page description for search engines and AI',
    keywords: 'relevant, keywords, here',
  });
}
```

### Adding Structured Data to a Page

```typescript
import {
  generateDoctorSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from '@/lib/utils/structured-data';

export default function DoctorPage({ doctor }) {
  const doctorSchema = generateDoctorSchema({
    name: doctor.name,
    specialty: doctor.specialty,
    bio: doctor.bio,
    slug: doctor.slug,
    image: doctor.image,
  }, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(doctorSchema) }}
      />
      {/* Your page content */}
    </>
  );
}
```

---

## GEO Best Practices (For AI Models)

### 1. **Clear, Factual Content**
- AI models prefer authoritative, factual content
- Use clear headings and subheadings
- Avoid marketing jargon; be direct

### 2. **Answer Questions Directly**
- Structure content to answer common questions
- Use FAQ sections with structured data
- Provide comprehensive, detailed answers

### 3. **Entity Clarity**
- Clearly identify your organization, services, and locations
- Use consistent naming across all content
- Leverage structured data for entity recognition

### 4. **Structured Information**
- Use lists, tables, and clear hierarchies
- Implement breadcrumbs for navigation clarity
- Tag content with semantic HTML

### 5. **Multilingual Support**
- Provide high-quality translations
- Use proper language tags
- Implement hreflang correctly

---

## Next Steps for Maximum SEO/GEO Impact

### 1. **Apply Metadata to All Pages**

Update these pages with metadata:

```typescript
// /src/app/[locale]/doctors/page.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateDoctorsMetadata(locale);
}

// /src/app/[locale]/services/page.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateServicesMetadata(locale);
}

// /src/app/[locale]/coverage/page.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateCoverageMetadata(locale);
}
```

### 2. **Add Doctor-Specific Structured Data**

In doctor profile pages:

```typescript
import { generateDoctorSchema } from '@/lib/utils/structured-data';

const doctorSchema = generateDoctorSchema(doctorData, locale);
```

### 3. **Implement FAQ Pages with Schema**

Create FAQ components with structured data:

```typescript
const faqSchema = generateFAQSchema([
  { question: 'How do I book?', answer: '...' },
  { question: 'What areas do you cover?', answer: '...' },
], locale);
```

### 4. **Set Up Search Console & Analytics**

- Add Google Search Console verification code to metadata
- Submit sitemaps to Search Console
- Monitor search performance and AI citations

### 5. **Create High-Quality Content**

- Detailed service pages
- Educational blog posts about healthcare
- Patient testimonials with review schema
- Medical condition guides

### 6. **Optimize Images**

- Add descriptive alt text
- Use WebP format
- Implement lazy loading
- Include image structured data

### 7. **Monitor AI Citations**

Track how AI models reference your content:
- Set up alerts for brand mentions
- Monitor Perplexity, ChatGPT, and other AI search tools
- Refine content based on what AI models cite

---

## Technical SEO Checklist

- [x] Robots.txt configured
- [x] XML sitemap generated
- [x] Structured data implemented
- [x] OpenGraph tags added
- [x] Twitter Cards configured
- [x] Canonical URLs set
- [x] hreflang tags for bilingual support
- [x] Web manifest for PWA
- [ ] Search Console verification
- [ ] Performance optimization (Core Web Vitals)
- [ ] Mobile responsiveness testing
- [ ] Schema validation (use Google Rich Results Test)
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Validation Tools

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema Markup Validator**: https://validator.schema.org/
3. **OpenGraph Debugger**: https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
5. **Lighthouse CI**: Built into Chrome DevTools

---

## Monitoring & Maintenance

### Weekly
- Check Search Console for errors
- Monitor keyword rankings
- Review AI model citations

### Monthly
- Update structured data with new services/doctors
- Refresh content for relevance
- Analyze user engagement metrics

### Quarterly
- Comprehensive SEO audit
- Competitor analysis
- Content gap analysis

---

## Support & Resources

- Next.js SEO: https://nextjs.org/learn/seo/introduction-to-seo
- Schema.org Medical: https://schema.org/MedicalOrganization
- Google Search Central: https://developers.google.com/search
- OpenAI GPTBot: https://platform.openai.com/docs/gptbot

---

**Last Updated**: January 2026
**Maintained By**: Anees Health Development Team
