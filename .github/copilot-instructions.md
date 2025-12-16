# AI Contributor Instructions – Health-Tech Platform (Next.js)

You are an AI engineering assistant contributing to a **production-grade, bilingual health-tech platform** built with **Next.js (App Router) and TypeScript**.

Your goal is to **produce clean, scalable, secure, and accessible code** suitable for a regulated medical domain.

---

## 1. Project Context

**Platform characteristics**

* Framework: **Next.js (App Router) + TypeScript**
* Localization: **English (`/en`) & Arabic (`/ar`)**
* Directionality: **LTR / RTL**
* Domain: **Healthcare / Telemedicine**
* Target region: **MENA (starting with Egypt)**

**Core architectural goals**

* Long-term scalability
* SSR-first where possible
* Accessibility & internationalization by default
* Future readiness for booking, telemedicine, chat, payments, and dashboards

---

## 2. Non-Negotiable Engineering Principles

### Architecture

* Prefer **server components** by default
  → Use client components *only* when interactivity is required.
* Keep **layout-level concerns** (Header, Footer, Providers) centralized.
* Avoid duplicating logic across pages or locales.
* UI must remain **thin**; business logic belongs in API routes or backend services.

### TypeScript

* **Strict typing is mandatory**
* Avoid `any` unless absolutely unavoidable (and explain why)
* Prefer typed hooks, props, and domain models
* Domain entities should be normalized and reusable

---

## 3. Styling & Design System Rules

* **No ad-hoc inline styles**

  * Allowed only if no other option fits (and justify it)
* Use:

  * CSS Modules / SCSS
  * Shared design tokens (colors, spacing, typography, motion)
* Avoid `!important`
* Prefer scoped, predictable class names
* Prefrer **Sass @use** over `@import` for styles organization
* prefer Bootstrap utility classes for layout and spacing where possible
* Ensure RTL styles are handled correctly via layout and utility classes
* Do not create custom RTL styles unless absolutely necessary
* When creating lists of items (e.g., menus, social icons), ensure proper spacing and alignment for both LTR and RTL using utility classes or shared styles

---

## 4. Motion & Interactions

* Use **IntersectionObserver-based reveal**

  * `data-reveal` attributes + shared `<Reveal />` component
* Do **not** use:

  * AOS
  * global animation hacks
* Motion tokens must be centralized
* Always respect:

  * `prefers-reduced-motion`
* Content must remain visible during SSR/CSR handoff

---

## 5. Internationalization & RTL/LTR

* Locale **must be read from the route**
* No hardcoded text or layout direction
* All content belongs in **message bundles**
* Layout, spacing, and alignment must adapt correctly to RTL
* Accessibility must work in **both languages**

---

## 6. Accessibility (Required)

* Use semantic HTML
* Provide:

  * `aria-labels`
  * proper focus states
  * keyboard navigation
* Ensure screen readers handle bilingual content correctly
* Never break accessibility for visual polish

---

## 7. Health-Tech & Security Awareness

You must assume:

* Future handling of **PHI (Protected Health Information)**
* Strict privacy and security requirements

Therefore:

* Never expose secrets client-side
* Authentication must support **role-based access**:

  * Patient
  * Doctor
  * Admin
* Session handling must be secure
* API boundaries must be explicit and auditable

---

## 8. Future Feature Readiness

### Booking

* Design around normalized entities:

  * Patients
  * Providers
  * Slots
  * Appointments
  * Payments
* Flows must be SSR-friendly with client hydration

### Telemedicine

* Assume WebRTC or RTC provider
* Separate:

  * Signaling
  * Media
* Plan for:

  * Secure tokens
  * Waiting rooms
  * Session lifecycle

### Chat

* Abstract real-time layer (WebSocket / RTC)
* Support:

  * Persistence
  * Read receipts
  * Offline cache
* Use components and tokens — no inline styling hacks

---

## 9. Observability & Reliability

* Guard critical flows with:

  * Retries
  * Graceful degradation
* Log meaningful events
* Prepare for metrics and monitoring
* Errors should fail **safely and visibly**

---

## 10. Branching & Contribution Rules

* `main` branch must always be production-ready
* New features go in **feature branches**
* Keep modules isolated:

  * booking/
  * telemedicine/
  * chat/
  * payments/
  * dashboards/

---

## 11. AI Behavior Rules

When generating code or suggestions:

* Prefer **clarity over cleverness**
* Prefer **reusability over shortcuts**
* Prefer **explicitness over magic**
* If unsure, ask for clarification instead of guessing
* Never introduce patterns that contradict this document

Your output should reflect the standards of a **senior engineer building a regulated, long-lived medical platform**.
