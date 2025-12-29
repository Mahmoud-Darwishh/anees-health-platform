# Doctor Profile Page – Current State

Current implementation of the doctor profile page (Next.js App Router + TypeScript) with SEO, localization, data loading, and the latest UI/styling updates.

## URLs and Slugs
- Locale-first URLs: `/en/doctors/:slug` and `/ar/doctors/:slug`.
- Canonical slugs derived from English names and reused across locales (ASCII, lowercase, hyphenated; titles stripped).
- Static params generated for both locales; ISR `revalidate` is 3600s.

## Data Flow
- Source: `doctors.en.json` and `doctors.ar.json`.
- `getDoctorBySlug` resolves via canonical slug (English), then maps to localized record by `id` (falls back to English if missing).
- Numbers render with English digits in all locales for consistency.

## SEO
- Localized title/description, canonical, hreflang (`en`, `ar`, `x-default`), Open Graph, robots via `generateMetadata`.
- Physician JSON-LD injected server-side via `renderJsonLd` and `generatePhysicianSchema`.

## Layout (hero)
- Breadcrumb with doctor name title plus trail.
- Square doctor photo (max 360px, 1:1), reduced hero name weight/size.
- Smaller specialty pill under the name.
- Inline meta row: verified, availability, city, languages.
- Compact stats row (rating, experience, patients, success) with slim padding/border.
- Primary + outline CTAs below stats.

## Sections
- About: gradient background, tighter padding.
- Services & Pricing: compact cards/icons.
- Education & Certifications: smaller typography, tighter gaps; years in compact chips.
- Clinics: compressed cards and spacing.
- Coverage: smaller chips and gaps.
- Testimonials: compact grid and padding.
- Chat Coming Soon: informational row (muted status); final booking CTA removed.

## Styling
- Styles live in `src/assets/scss/pages/_doctor-profile.scss`.
- Vertical rhythm tightened (py-3/py-4) across sections; reduced gaps/margins.
- Stat cards: lighter borders, smaller padding/typography.
- Specialty pill: padding 0.5rem x 1rem, font-size 0.75rem, pill radius 999px.
- Photo hover lift retained; aspect ratio 1:1.

## Localization
- All labels/messages have English and Arabic variants; numerals stay in English digits by design.
- `dir` set per locale on the root article for proper RTL/LTR rendering.

## Future
- Swap JSON for database/Prisma.
- Replace Chat Coming Soon with live chat once ready.
- Wire CTAs to production booking flows.
  .education-list li {
    border-left: 4px solid var(--color-primary);

    [dir="rtl"] & {
      border-left: none;
      border-right: 4px solid var(--color-primary);
    }
  }
}
```

## Accessibility

- **Semantic HTML**: `<article>`, `<header>`, `<section>`
- **Microdata attributes**: `itemScope`, `itemProp`
- **Alt text** on images
- **Keyboard navigation** support
- **Screen reader** friendly
- **prefers-reduced-motion** respected

## Performance

### ISR Configuration

```typescript
export const revalidate = 3600; // 1 hour
```

### Static Generation

- Pre-generates all known doctors at build time
- Scales to thousands without impacting build time
- On-demand generation for new doctors

### Image Optimization

```tsx
<img src={`/${doctor.image}`} alt={doctor.doctorName} />
```

- Uses WebP optimized images
- Lazy loading (browser native)

## SEO Checklist

✅ **URL Structure**
- Locale-first URLs
- Stable slugs across locales
- No titles in slugs

✅ **Metadata**
- Localized title and description
- Canonical URLs
- hreflang alternates
- Open Graph
- Twitter Cards

✅ **Structured Data**
- Schema.org Physician JSON-LD
- Server-side injection
- Localized content

✅ **Internal Linking**
- Doctors listing pages link to profiles
- Breadcrumb navigation
- Sitemap inclusion

✅ **Sitemaps**
- Locale-specific sitemaps
- Root sitemap index
- Weekly change frequency
- Proper priority values

✅ **Content**
- Single `<h1>` with doctor name
- Localized bio and specialties
- Semantic markup
- Mobile-responsive

## Testing Examples

### URL Patterns

```
✅ /en/doctors/mohamed-farwiez
✅ /ar/doctors/mohamed-farwiez
❌ /doctors/mohamed-farwiez (no locale)
❌ /en/doctors/dr-mohamed-farwiez (has title)
```

### Slug Generation

```typescript
generateDoctorSlug("Dr. Mohamed Farwiez")    → "mohamed-farwiez"
generateDoctorSlug("د. محمد فرويز")          → "mhmd-frwyz"
generateDoctorSlug("Doctor Sarah Johnson")   → "sarah-johnson"
```

### ISR Behavior

1. **Build time**: Generate all known doctors
2. **First request** (new doctor): Generate on-demand, cache for 1 hour
3. **Subsequent requests**: Serve cached version
4. **After 1 hour**: Regenerate on next request

## Environment Variables

### Required Configuration

```env
# .env.local
NEXT_PUBLIC_API_URL=https://anees.com
```

## Future Enhancements

### Database Migration

Replace JSON with Prisma:

```typescript
// src/lib/api/doctors.ts
export async function getDoctorBySlug(slug: string, locale: 'en' | 'ar') {
  return await prisma.doctor.findFirst({
    where: {
      slug,
      locale,
    },
    include: {
      education: true,
      certifications: true,
      clinics: true,
    },
  });
}
```

### Booking Integration

```typescript
// Add to doctor profile page
<BookingCTA doctorId={doctor.id} locale={locale} />
```

### Reviews & Ratings

```typescript
// Fetch dynamic reviews
const reviews = await getReviews(doctor.id, locale);
```

## Compliance & Security

### Health-Tech Requirements

- ✅ No PHI (Protected Health Information) exposed client-side
- ✅ Server-side rendering for sensitive data
- ✅ Type-safe data access
- ✅ Audit-ready architecture

### Security Best Practices

- No secrets in client code
- Server Components by default
- Typed API boundaries
- Input validation (slug format)

## Deployment

### Build Command

```bash
npm run build
```

### Static Paths Generated

```
/en/doctors/mohamed-farwiez
/en/doctors/sara-ahmed
/ar/doctors/mohamed-farwiez
/ar/doctors/sara-ahmed
# ... (all doctors × 2 locales)
```

### Vercel Configuration

```json
{
  "rewrites": [
    {
      "source": "/:locale/sitemap.xml",
      "destination": "/api/sitemap/:locale"
    }
  ]
}
```

## Maintenance

### Adding a New Doctor

1. Add entry to `doctors.en.json` and `doctors.ar.json`
2. Ensure `doctorName` field is present in both
3. Deploy → ISR will generate page on first request
4. No code changes required

### Updating Doctor Data

- Changes reflect after ISR revalidation (1 hour)
- Force immediate update: redeploy or clear cache

## Support

For questions or issues:
- Review [PROJECT-STRUCTURE.md](../../PROJECT-STRUCTURE.md)
- Check [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
- Ensure compliance with architectural principles

---

**Last Updated**: December 29, 2025
**Version**: 1.0.0
**Author**: Anees Engineering Team
