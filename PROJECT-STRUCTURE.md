# Anees Health Platform - Project Structure Documentation

## Overview

This is a **bilingual (English/Arabic), production-grade health-tech platform** built with **Next.js 14+ (App Router)** and **TypeScript**. The platform supports both LTR (English) and RTL (Arabic) layouts and is designed for scalability in the healthcare/telemedicine domain.

---

## Project Tree Structure

```
anees-health-platform/
│
├── 📁 .github/
│   └── copilot-instructions.md          # AI coding guidelines and standards
│
├── 📁 public/                            # Static assets (served directly)
│   ├── 📁 assets/
│   │   ├── 📁 coverage/                 # Geographic coverage data (GeoJSON)
│   │   ├── 📁 css/                      # Legacy CSS files (being migrated)
│   │   ├── 📁 fonts/                    # Custom web fonts
│   │   └── 📁 img/                      # Images organized by feature
│   │       ├── banner/                  # Hero banners
│   │       ├── banner-optimized/        # Optimized banner images
│   │       ├── doctors/                 # Doctor profile images
│   │       ├── doctors-optimized/       # Optimized doctor images
│   │       ├── specialities/            # Medical speciality icons
│   │       ├── clients/                 # Client/partner logos
│   │       └── [other feature folders]
│   └── 📁 logos/                        # Brand logos
│
├── 📁 scripts/                           # Build and maintenance scripts
│   ├── optimize-all-images.js           # Batch image optimization
│   ├── optimize-doctor-images.js        # Doctor image processor
│   └── update-doctor-json.js            # Doctor data updater
│
├── 📁 messages/                          # i18n translation files
│   ├── en.json                          # English translations
│   └── ar.json                          # Arabic translations
│
├── 📁 src/                               # Source code (main application)
│   │
│   ├── 📁 app/                          # Next.js App Router (routing & pages)
│   │   ├── layout.tsx                   # Root layout (HTML, providers, fonts)
│   │   │
│   │   ├── 📁 [locale]/                # Locale-based routing (/en, /ar)
│   │   │   ├── layout.tsx              # Locale layout (Header, Footer, direction)
│   │   │   ├── page.tsx                # Home page
│   │   │   │
│   │   │   ├── 📁 (about)/            # Route group: About pages
│   │   │   │   └── about-us/
│   │   │   │       └── page.tsx        # About Us page
│   │   │   │
│   │   │   ├── 📁 (contact)/          # Route group: Contact pages
│   │   │   │   └── contact-us/
│   │   │   │       └── page.tsx        # Contact Us page
│   │   │   │
│   │   │   ├── 📁 (legal)/            # Route group: Legal pages
│   │   │   │   ├── privacy-policy/
│   │   │   │   │   └── page.tsx        # Privacy Policy page
│   │   │   │   └── terms-and-conditions/
│   │   │   │       └── page.tsx        # Terms & Conditions page
│   │   │   │
│   │   │   └── 📁 doctors/            # Doctors directory feature
│   │   │       └── page.tsx            # Doctors listing page
│   │   │
│   │   └── 📁 api/                    # API Routes (server-side)
│   │       ├── 📁 contact/
│   │       │   └── route.ts            # Contact form submission API
│   │       └── 📁 doctors/
│   │           └── route.ts            # Doctors data API
│   │
│   ├── 📁 components/                  # React components (organized by domain)
│   │   │
│   │   ├── 📁 common/                 # Shared/reusable components
│   │   │   ├── Reveal.tsx             # Scroll reveal animation wrapper
│   │   │   └── WhatsAppButton.tsx     # Floating WhatsApp contact button
│   │   │
│   │   ├── 📁 layout/                 # Layout components (persistent UI)
│   │   │   ├── Header.tsx             # Navigation header (bilingual, mobile menu)
│   │   │   ├── Footer.tsx             # Site footer (social, links, copyright)
│   │   │   └── Breadcrumb.tsx         # Breadcrumb navigation component
│   │   │
│   │   ├── 📁 doctors/                # Doctor-specific components
│   │   │   └── 📁 doctorgrid/
│   │   │       ├── doctors-grid.tsx   # Main doctors grid container
│   │   │       ├── DoctorCard.tsx     # Individual doctor card component
│   │   │       ├── FilterSidebar.tsx  # Filters (speciality, location, etc.)
│   │   │       ├── SearchBar.tsx      # Doctor search input
│   │   │       ├── Pagination.tsx     # Pagination controls
│   │   │       └── types.ts           # TypeScript types for doctors
│   │   │
│   │   └── 📁 sections/               # Page sections (feature-specific)
│   │       ├── 📁 home/               # Home page sections
│   │       │   ├── HeroSection.tsx
│   │       │   ├── ServicesSection.tsx
│   │       │   └── [other sections]
│   │       ├── 📁 contact/            # Contact page sections
│   │       └── 📁 legal/              # Legal page sections
│   │
│   ├── 📁 assets/                     # Stylesheets (SCSS architecture)
│   │   └── 📁 scss/
│   │       ├── main.scss              # Main SCSS entry point
│   │       │
│   │       ├── 📁 base/               # Foundation styles
│   │       │   ├── _reset.scss        # CSS reset/normalize
│   │       │   ├── _typography.scss   # Font definitions
│   │       │   └── _variables.scss    # Design tokens (colors, spacing)
│   │       │
│   │       ├── 📁 layout/             # Layout-specific styles
│   │       │   ├── header.scss        # Header styling
│   │       │   ├── footer.scss        # Footer styling
│   │       │   └── [other layouts]
│   │       │
│   │       ├── 📁 components/         # Component-specific styles
│   │       │   ├── buttons.scss
│   │       │   ├── cards.scss
│   │       │   └── [other components]
│   │       │
│   │       ├── 📁 pages/              # Page-specific styles
│   │       │   ├── home.scss
│   │       │   ├── doctor-grid.scss
│   │       │   └── [other pages]
│   │       │
│   │       └── 📁 utils/              # Utility styles
│   │           ├── _mixins.scss       # Reusable SCSS mixins
│   │           └── _helpers.scss      # Helper classes
│   │
│   ├── 📁 styles/                     # Global CSS files
│   │   ├── globals.scss               # Global styles and CSS variables
│   │   ├── legacy.scss                # Legacy styles (to be refactored)
│   │   └── components.scss            # Component utilities
│   │
│   ├── 📁 hooks/                      # Custom React hooks
│   │   └── useReveal.ts               # Intersection Observer hook for animations
│   │
│   ├── 📁 i18n/                       # Internationalization setup
│   │   └── request.ts                 # i18n configuration for server components
│   │
│   ├── 📁 lib/                        # Shared utilities and configurations
│   │   └── config.ts                  # App-wide configuration
│   │
│   ├── 📁 types/                      # TypeScript type definitions
│   │   └── index.ts                   # Shared types and interfaces
│   │
│   ├── 📁 features/                   # Feature modules (future expansion)
│   │   └── [booking, telemedicine, chat, payments, etc.]
│   │
│   ├── 📁 generated/                  # Auto-generated files
│   │   └── 📁 prisma/                # Prisma ORM generated files
│   │
│   └── proxy.ts                       # Proxy configuration
│
├── 📄 next.config.ts                   # Next.js configuration
├── 📄 tsconfig.json                    # TypeScript configuration
├── 📄 eslint.config.mjs                # ESLint configuration
├── 📄 package.json                     # Dependencies and scripts
├── 📄 next-env.d.ts                    # Next.js TypeScript declarations
└── 📄 README.md                        # Project documentation

```

---

## Detailed Component Explanations

### 🌐 Routing Architecture (`app/[locale]/`)

**Purpose**: Implements locale-based routing for bilingual support (English `/en` and Arabic `/ar`).

**Key Features**:
- **Dynamic locale routing**: `[locale]` folder enables `/en/*` and `/ar/*` paths
- **Route groups**: Parentheses `(about)`, `(contact)`, `(legal)` organize routes without affecting URL structure
- **Server-first rendering**: All pages use Next.js Server Components by default for optimal performance

**Layout Hierarchy**:
```
app/layout.tsx (Root)
  └── app/[locale]/layout.tsx (Locale-specific)
      └── app/[locale]/*/page.tsx (Individual pages)
```

---

### 🎨 Styling System (`assets/scss/`)

**Purpose**: Scalable SCSS architecture following BEM methodology and design token principles.

**Structure**:
- **`base/`**: Foundation styles (variables, typography, reset)
- **`layout/`**: Persistent UI elements (header, footer, navigation)
- **`components/`**: Reusable component styles (buttons, cards, forms)
- **`pages/`**: Page-specific styles (home, doctors, legal)
- **`utils/`**: Mixins and helper utilities

**Design Tokens** (`_variables.scss`):
- Colors (primary, secondary, semantic)
- Typography scale
- Spacing units
- Motion/animation values
- Breakpoints

**RTL Support**:
- Uses logical properties (`margin-inline`, `padding-block`)
- Direction-aware utilities
- Mirror transformations for RTL layouts

---

### 🧩 Component Organization

#### **Common Components** (`components/common/`)
- **`Reveal.tsx`**: IntersectionObserver-based scroll animations with `data-reveal` attributes
- **`WhatsAppButton.tsx`**: Floating action button for WhatsApp contact

#### **Layout Components** (`components/layout/`)
- **`Header.tsx`**: 
  - Bilingual navigation with mobile hamburger menu
  - Language switcher (EN ↔ AR)
  - Search functionality
  - Auto-closing mobile menu on link click
  - Sticky header on scroll

- **`Footer.tsx`**: 
  - Four-column layout (About, Patients, Doctors, Contact)
  - Social media links
  - Copyright and legal links with proper RTL/LTR alignment
  - Responsive stacking on mobile

- **`Breadcrumb.tsx`**: Dynamic breadcrumb navigation

#### **Feature Components** (`components/doctors/doctorgrid/`)
- **`doctors-grid.tsx`**: Main container with filtering, search, and pagination
- **`DoctorCard.tsx`**: 
  - 1:1 aspect ratio images with `object-fit: cover`
  - Verified badge overlay
  - Speciality color-coded bars
  - Service chips (Video, Chat, Home visits, Clinic)
  - Experience years display
  - Pricing information

- **`FilterSidebar.tsx`**: Multi-select filters (speciality, location, price range)
- **`SearchBar.tsx`**: Real-time doctor search
- **`Pagination.tsx`**: Page navigation controls

---

### 🌍 Internationalization (i18n)

**Implementation**: Uses `next-intl` library for type-safe translations.

**Translation Files** (`messages/`):
- **`en.json`**: English translations
- **`ar.json`**: Arabic translations

**Structure**:
```json
{
  "nav": {
    "home": "Home",
    "about_us": "About Us"
  },
  "footer": {
    "copyright": "© 2025 Anees Health",
    "terms": "Terms & Conditions"
  }
}
```

**Usage in Components**:
```tsx
import { useTranslations } from 'next-intl';

const Component = () => {
  const t = useTranslations();
  return <h1>{t('nav.home')}</h1>;
};
```

---

### 🎭 Animation System

**Implementation**: Custom `Reveal` component with IntersectionObserver.

**Usage**:
```tsx
<Reveal>
  <div>Content fades in on scroll</div>
</Reveal>
```

**Features**:
- Respects `prefers-reduced-motion` for accessibility
- Configurable thresholds and delays
- SSR-safe (no layout shift on hydration)
- Reusable motion tokens

---

### 🔒 Security & Privacy

**Considerations**:
- No client-side secrets exposure
- API routes for sensitive operations
- Future PHI (Protected Health Information) handling
- Role-based access control ready (Patient, Doctor, Admin)

---

### 📱 Responsive Design

**Breakpoints**:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

**Approach**:
- Mobile-first CSS
- Bootstrap utilities for layout
- Custom responsive components
- Touch-optimized interactions

---

### 🚀 Future Feature Readiness

**Planned Modules** (`src/features/`):

1. **Booking System**:
   - Patient/Provider/Slot/Appointment entities
   - Calendar integration
   - Payment processing

2. **Telemedicine**:
   - WebRTC video consultations
   - Waiting rooms
   - Session recording (HIPAA-compliant)

3. **Chat**:
   - Real-time messaging (WebSocket)
   - Read receipts
   - Offline support

4. **Payments**:
   - Multi-gateway support
   - Refunds and invoicing
   - Subscription management

5. **Dashboards**:
   - Patient dashboard (appointments, records)
   - Doctor dashboard (schedule, earnings)
   - Admin dashboard (analytics, users)

---

## Development Guidelines

### Code Standards

1. **TypeScript Strict Mode**: No `any` types without justification
2. **Server Components First**: Use client components only when necessary
3. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
4. **No Inline Styles**: Use SCSS modules or utility classes
5. **Motion Respect**: Always support `prefers-reduced-motion`

### File Naming Conventions

- **Components**: PascalCase (`DoctorCard.tsx`)
- **Pages**: lowercase (`page.tsx`)
- **Styles**: kebab-case (`doctor-grid.scss`)
- **Types**: PascalCase (`types.ts`)

### Commit Message Format

```
feat: Add doctor filtering by speciality
fix: Resolve mobile menu not closing on link click
style: Update footer alignment for RTL
docs: Add project structure documentation
```

---

## Scripts Reference

### Development
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Image Optimization
```bash
node scripts/optimize-all-images.js        # Optimize all images
node scripts/optimize-doctor-images.js     # Optimize doctor images
node scripts/update-doctor-json.js         # Update doctor data
```

---

## Environment Variables

**Required**:
- `NEXT_PUBLIC_API_URL` - API base URL
- `DATABASE_URL` - Database connection string

**Optional**:
- `NEXT_PUBLIC_GA_ID` - Google Analytics ID
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking

---

## Browser Support

- **Chrome**: Last 2 versions
- **Firefox**: Last 2 versions
- **Safari**: Last 2 versions
- **Edge**: Last 2 versions
- **Mobile**: iOS 12+, Android 8+

---

## Performance Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Lighthouse Score**: > 90

---

## Accessibility Compliance

- **WCAG 2.1 Level AA**: Target compliance
- **Screen Reader Support**: NVDA, JAWS, VoiceOver tested
- **Keyboard Navigation**: Full support
- **Color Contrast**: Minimum 4.5:1 ratio

---

## Version History

- **v1.0.0** (Current): Initial production release
  - Bilingual support (EN/AR)
  - Doctor directory with filtering
  - Contact form
  - Legal pages
  - Mobile-responsive design

---

## Contributors & Maintainers

**Development Team**: Anees Health Engineering
**Documentation**: Generated December 22, 2025

---

## License

Proprietary - All rights reserved by Anees Health © 2025

---

## Contact & Support

- **Website**: [aneeshealth.com](https://aneeshealth.com)
- **Email**: info@aneeshealth.com
- **Phone**: +201055164595

---

*This documentation is maintained as the project evolves. Last updated: December 22, 2025*
