# Anees Health Platform

A modern, scalable Next.js telemedicine platform with full bilingual support (English and Arabic).

## Features

-  **Next.js 14+ with App Router** - Modern React framework with server components
-  **Bilingual Support** - Full internationalization with English and Arabic
-  **RTL/LTR Layouts** - Automatic right-to-left layout for Arabic
-  **TypeScript** - Type-safe development
-  **Sass/SCSS** - Advanced styling with existing design system
-  **Scalable Architecture** - Future-proof structure for telemedicine features

## Project Structure

```
anees-health-platform/
 src/
    app/
       [locale]/        # Locale-based routing
          layout.tsx   # Locale layout with RTL/LTR
          page.tsx     # Home page
       layout.tsx       # Root layout
    components/
       layout/          # Header, Footer
       sections/        # Page sections (Hero, Features, etc.)
    features/            # Future feature modules
    i18n/                # Internationalization config
    lib/                 # Utility functions
    styles/              # Global styles
    types/               # TypeScript types
 messages/                # Translation files (en.json, ar.json)
 public/
    assets/              # Images, fonts, CSS, SCSS from old website
 next.config.ts           # Next.js configuration
```

## Getting Started

### Development

Start the development server:

```bash
npm run dev
```

Visit:
- English: http://localhost:3000/en
- Arabic: http://localhost:3000/ar

### Build

```bash
npm run build
npm start
```

## Current Implementation

### Home Page
1. **Hero Section** - Welcome message with CTA
2. **Features Section** - Video consultations, easy booking, 24/7 support
3. **Services Section** - Healthcare solutions overview
4. **About Section** - Platform introduction
5. **Contact Section** - Get in touch

## Future Development

-  Doctor & Patient Modules
-  Booking System
-  Video Consultations
-  Real-time Chat
-  Dashboards

## Technologies

- Next.js 16
- TypeScript
- Sass/SCSS
- next-intl

 2025 Anees Health. All rights reserved.