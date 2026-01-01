# Booking System Documentation

## Overview

The Anees Health booking system is a comprehensive, accessible, and bilingual (English/Arabic) solution for managing healthcare service bookings. It supports:

- **Home Visits** (Doctor, Physiotherapy, Nursing)
- **Telemedicine** Consultations
- **Dynamic Pricing** based on selections
- **Live Booking Summary** with real-time updates
- **Payment Integration** with Kashier
- **WhatsApp Integration** for customer communication
- **Full RTL/LTR Support** for Arabic and English
- **Accessibility Features** (ARIA, keyboard navigation, focus management)

---

## Architecture

### Components Structure

```
src/components/booking/
├── booking-form.tsx              # Main form component
├── booking-form.module.scss      # Form styles
├── booking-summary.tsx           # Live summary/receipt
├── booking-summary.module.scss   # Summary styles
└── steps/                        # Future multi-step form variants
```

### Types & Constants

```
src/lib/models/booking.types.ts
- BookingFormState interface
- VisitType enum ('homeVisit' | 'telemedicine')
- ServiceType enum ('doctorVisit' | 'physiotherapy' | 'nursing')
- Pricing configuration
- Validation utilities
```

### Utilities

```
src/lib/utils/
├── booking-utils.ts              # WhatsApp message generation, encoding
└── kashier-integration.ts         # Kashier payment integration
```

### API Routes

```
src/app/api/bookings/
├── create/route.ts               # POST /api/bookings/create (create booking intent)
└── payment-webhook/route.ts       # POST /api/bookings/payment-webhook (payment status updates)
```

### Pages

```
src/app/[locale]/booking/
├── page.tsx                      # Route entry point
├── page-content.tsx              # Page component with hero, form, info
├── layout.tsx                    # Layout with metadata
└── page.module.scss              # Page styles
```

---

## Form Flow

### 1. Personal Information (Always Required)

Users provide:
- **Full Name** (text input, required)
- **Phone Number** (tel input, required, validates Egyptian format)

### 2. Visit Type Selection (Required)

**Radio Buttons:**
- **Home Visit** → Shows service type selection
- **Telemedicine** → Shows fixed price (250 EGP), skips further options

### 3. Conditional Service Selection (Home Visit Only)

**Radio Buttons for Service Type:**

#### Doctor Visit
- Specialty dropdown (General Medicine, Pediatrics, etc.)
- Preferred date picker
- Time preference (Morning, Evening, Doesn't Matter)
- **Pricing:** 150 EGP

#### Physiotherapy
- Session count (1 session or 12 sessions)
- Case type dropdown (Postoperative, Fracture, Neuro, Other)
- **Pricing:** 100 EGP (1 session) or 900 EGP (12 sessions)

#### Nursing
- Nurse type dropdown (Registered Nurse or Nursing Assistant)
- Hours per day (8/12/24 hours)
- Duration (1 week, 2 weeks, 1 month)
- **Pricing:** Calculated as: `basePrice × hourMultiplier × durationMultiplier × days`

---

## Pricing System

Located in `src/lib/models/booking.types.ts`:

```typescript
export const PRICING = {
  telemedicine: 250,
  homeVisit: {
    doctorVisit: 150,
    physiotherapy: {
      session: 100,
      single: 100,
      twelve: 900, // 10% discount
    },
    nursing: {
      basePerDay: 80,
      hourMultipliers: {
        '8hrs': 1,
        '12hrs': 1.4,
        '24hrs': 1.8,
      },
      durationMultipliers: {
        '1week': 1,
        '2weeks': 0.95, // 5% discount
        '1month': 0.85, // 15% discount
      },
    },
  },
};
```

### Price Calculation

Use `calculateBookingPrice(formState)` function:

```typescript
import { calculateBookingPrice } from '@/lib/models/booking.types';

const totalPrice = calculateBookingPrice(formState);
// Returns number (EGP amount)
```

---

## Booking Summary

The `<BookingSummary />` component displays:

- ✅ **Your Details:** Name, Phone
- ✅ **Service Details:** Visit type, service, specialty, date, time, sessions, etc.
- ✅ **Pricing:** Total amount in EGP
- ✅ **Action Buttons:**
  - **Pay Now** → Initiates payment via Kashier
  - **Chat with Care Team** → Opens WhatsApp with prefilled message

### Mobile Behavior

- Collapsible toggle button on mobile (`<1024px`)
- Sticky positioning on desktop
- Auto-expanding when service is selected
- Full details visible on expansion

---

## Validation

Server-side validation happens in two places:

### 1. Client-Side Validation (Immediate Feedback)

```typescript
import { validateBookingForm } from '@/lib/models/booking.types';

const errors = validateBookingForm(formState);
// Returns BookingValidationError[]
// Each error has { field: string, message: string (i18n key) }
```

### 2. Server-Side Validation (API Endpoint)

```
POST /api/bookings/create
```

Validates all fields again before creating booking intent:

```typescript
const validationErrors = validateBookingForm(formState);
if (validationErrors.length > 0) {
  return { success: false, errors: validationErrors };
}
```

---

## Payment Integration (Kashier)

### Environment Variables

```env
NEXT_PUBLIC_KASHIER_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_KASHIER_DISPLAY_NAME=Anees Health
NEXT_PUBLIC_KASHIER_API_KEY=your_api_key
NEXT_PUBLIC_KASHIER_SANDBOX=true  # or false for production
```

### Payment Flow

1. **User clicks "Pay Now"** → Validates form client-side
2. **Request booking intent** → POST `/api/bookings/create`
3. **Receive bookingId + finalAmount** → Server calculates (prevents tampering)
4. **Open Kashier payment** → Modal/iframe with payment form
5. **Kashier processes payment** → Redirects or webhooks
6. **Webhook verification** → POST `/api/bookings/payment-webhook`
7. **Update booking status** → Set to 'confirmed' or 'failed'
8. **Show success/error** → UI updates with result

### Integration Hook

```typescript
import { useBookingPayment } from '@/lib/utils/kashier-integration';

const { initiatePayment, isProcessing, error } = useBookingPayment({
  formState,
  totalPrice,
  onPaymentSuccess: (response) => { /* ... */ },
  onPaymentError: (error) => { /* ... */ },
});

// Call when user clicks "Pay Now"
await initiatePayment();
```

### API Endpoints

#### Create Booking Intent

```
POST /api/bookings/create
Content-Type: application/json

{
  "fullName": "Ahmed Mohamed",
  "phoneNumber": "+20 10 5516 4595",
  "visitType": "homeVisit",
  "serviceType": "doctorVisit",
  "specialty": "generalMedicine",
  "preferredDate": "2026-01-15",
  "timePreference": "morning"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "bookingId": "BOOKING_1704067200000_abc12de",
  "amount": 150,
  "currency": "EGP"
}
```

#### Payment Webhook

```
POST /api/bookings/payment-webhook
Content-Type: application/json

{
  "orderId": "BOOKING_1704067200000_abc12de",
  "status": "success",
  "transactionId": "KASHIER_TXN_12345",
  "amount": 150,
  "currency": "EGP"
}
```

---

## WhatsApp Integration

### Message Generation

```typescript
import { generateBookingMessage } from '@/lib/utils/booking-utils';

const message = generateBookingMessage(formState, totalPrice, locale);
// Returns formatted message with all booking details
// Bilingual: English or Arabic based on locale param
```

### WhatsApp Flow

1. User clicks **"Chat with Care Team"**
2. Message is generated with all booking details
3. WhatsApp Web opens with prefilled message
4. User sends message to Anees care team

### Message Format

**English:**
```
Hello Anees Health! 👋

I would like to book a service with the following details:

📋 Name: Ahmed Mohamed
📱 Phone: +20 10 5516 4595
🏥 Visit Type: Home Visit
💼 Service: Doctor Visit
🩺 Specialty: General Medicine
📅 Preferred Date: January 15, 2026
⏰ Time: Morning

💰 Total Price: 150 EGP

Please confirm my booking and provide the next steps.

Thank you! ❤️
```

**Arabic (RTL):**
```
مرحباً بك في أنيس هيلث! 👋

أود حجز خدمة بالتفاصيل التالية:

📋 الاسم: أحمد محمد
📱 الهاتف: +20 10 5516 4595
🏥 نوع الزيارة: زيارة منزلية
💼 الخدمة: زيارة طبيب
🩺 التخصص: الطب العام
📅 التاريخ المفضل: 15 يناير 2026
⏰ الوقت: صباحاً

💰 السعر الإجمالي: 150 جنيه مصري

الرجاء تأكيد حجزي وتقديم الخطوات التالية.

شكراً لك! ❤️
```

---

## Localization

### Message Bundles

All text is in `messages/en.json` and `messages/ar.json`:

```json
{
  "booking": {
    "title": "Book Your Service",
    "form": {
      "fullName": "Full Name",
      "specialty": {
        "generalMedicine": "General Medicine",
        "pediatrics": "Pediatrics"
      }
    }
  }
}
```

### Usage in Components

```typescript
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <label>{t('booking.form.fullName')}</label>
  );
}
```

---

## Accessibility Features

### ARIA Labels & Roles

- ✅ `aria-label` on all interactive elements
- ✅ `aria-describedby` for error messages
- ✅ `aria-invalid` on form fields with errors
- ✅ `role="alert"` on error messages
- ✅ `role="form"` on main form
- ✅ Semantic `<fieldset>` and `<legend>` for grouping

### Keyboard Navigation

- ✅ Tab order follows visual flow
- ✅ Focus indicators (2px outline)
- ✅ Radio buttons/checkboxes fully keyboard accessible
- ✅ Form submission with Enter key
- ✅ Escape to close modals (if implemented)

### Color Contrast

- ✅ All text meets WCAG AA standards (4.5:1 minimum)
- ✅ Error messages use color + icon (not color alone)
- ✅ Focus indicators visible in light and dark modes

### Motion

- ✅ `prefers-reduced-motion` media query respected
- ✅ Animations disabled for users with motion preferences
- ✅ No auto-playing animations

### Focus Management

- ✅ Clear focus states on all interactive elements
- ✅ Focus visible with keyboard (`:focus-visible`)
- ✅ Focus remains visible through form validation

---

## RTL/LTR Support

### Automatic Direction Handling

```typescript
const locale = useLocale(); // 'ar' or 'en'
const dir = locale === 'ar' ? 'rtl' : 'ltr';

return <div dir={dir}>...</div>;
```

### SCSS RTL Patterns

```scss
// Flexbox automatically reverses
.radioGroup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

// Padding flips with dir attribute
[dir='rtl'] .input {
  padding-right: 2.5rem;
  padding-left: 1rem;
  background-position: left center;
}

[dir='ltr'] .input {
  padding-left: 2.5rem;
  padding-right: 1rem;
  background-position: right center;
}
```

### Text Direction

- ✅ No hardcoded `direction` properties (use `dir` attribute)
- ✅ Margins and padding use logical properties where possible
- ✅ Icons and badges positioned correctly for RTL

---

## State Management

### Form State Shape

```typescript
interface BookingFormState {
  fullName: string;
  phoneNumber: string;
  visitType: 'homeVisit' | 'telemedicine' | null;
  serviceType: 'doctorVisit' | 'physiotherapy' | 'nursing' | null;
  specialty: string | null;
  preferredDate: string; // ISO date
  timePreference: 'morning' | 'evening' | 'doesntMatter' | null;
  sessionCount: '1' | '12' | null;
  caseType: string | null;
  nursingType: string | null;
  nursingHoursPerDay: '8hrs' | '12hrs' | '24hrs' | null;
  nursingDuration: '1week' | '2weeks' | '1month' | null;
}
```

### State Updates

- ✅ Immutable updates with spread operator
- ✅ Resetting dependent fields when parent changes
- ✅ Clearing errors when user corrects input
- ✅ No external state library required (uses React hooks)

---

## Error Handling

### Validation Errors

Errors are keyed by field name and contain i18n message keys:

```typescript
const errors = [
  { field: 'fullName', message: 'validation.fullNameRequired' },
  { field: 'phoneNumber', message: 'validation.invalidPhoneNumber' }
];
```

### Display Errors

```typescript
{errors.fullName && (
  <span id="fullName-error" className={styles.errorText} role="alert">
    {t(errors.fullName)}
  </span>
)}
```

### Phone Number Validation

Egyptian phone numbers only (server-side):

```regex
/^(\+20|0)[0-9]{10}$/
```

Examples:
- ✅ `+20 10 5516 4595`
- ✅ `01055164595`
- ❌ `20 1055164595` (missing prefix)

---

## Styling & Design System

### Color Palette

- **Primary:** `#aa8642` to `#d4b16a` (gradient)
- **Success:** `#10b981`
- **Error:** `#dc2626`
- **Neutral:** `#6b7280` (gray-500)
- **Light BG:** `#f9fafb`

### Typography

- **Heading:** 600-700 font-weight, 1.25-3rem size
- **Body:** 400 font-weight, 0.95-1rem size
- **Labels:** 500 font-weight, 0.95rem size

### Spacing

- **Sections:** 2rem gap
- **Form groups:** 1.5rem gap
- **Form items:** 0.75rem gap

### Border Radius

- **Cards:** 12px
- **Inputs:** 8px
- **Badges:** 20px (pill shape)

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Graceful degradation for older browsers

---

## Future Enhancements

### Multi-Step Form

Current implementation is single-page. Future versions could include:

1. Step 1: Personal Info
2. Step 2: Service Selection
3. Step 3: Details & Options
4. Step 4: Summary & Payment

### Advanced Features

- [ ] Calendar picker with available time slots
- [ ] Real-time availability checking
- [ ] Promo code/discount handling
- [ ] Insurance integration
- [ ] Patient history/repeat bookings
- [ ] Admin booking management dashboard

### Analytics

- [ ] Track form abandonment rates
- [ ] Monitor payment success rates
- [ ] User flow analysis
- [ ] A/B testing for conversion

---

## Testing

### Unit Tests (Example)

```typescript
import { calculateBookingPrice, validateBookingForm } from '@/lib/models/booking.types';

describe('Booking Types', () => {
  it('should calculate doctor visit price', () => {
    const state = { visitType: 'homeVisit', serviceType: 'doctorVisit' };
    expect(calculateBookingPrice(state)).toBe(150);
  });

  it('should validate required fields', () => {
    const state = { fullName: '', phoneNumber: '' };
    const errors = validateBookingForm(state);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests (Example)

```typescript
describe('Booking Flow', () => {
  it('should complete a doctor visit booking', () => {
    cy.visit('/en/booking');
    cy.get('[name="fullName"]').type('Ahmed Mohamed');
    cy.get('[name="phoneNumber"]').type('+20 10 5516 4595');
    cy.get('[value="homeVisit"]').click();
    cy.get('[value="doctorVisit"]').click();
    cy.get('#specialty').select('generalMedicine');
    cy.get('[name="preferredDate"]').type('2026-01-15');
    cy.get('[value="morning"]').click();
    cy.get('button[type="submit"]').click();
    cy.contains('Your booking has been confirmed');
  });
});
```

---

## Support & Troubleshooting

### Common Issues

**Q: Form doesn't reset after submission**
A: Add `setFormState(INITIAL_FORM_STATE)` in `onPaymentSuccess` callback

**Q: Kashier payment not opening**
A: Check environment variables are set and not missing
Verify `NEXT_PUBLIC_KASHIER_MERCHANT_ID` is present

**Q: WhatsApp link not working on desktop**
A: WhatsApp Web will open; on mobile, native app opens

**Q: Form summary not updating**
A: Ensure `totalPrice` is recalculated after each form change
Check that `calculateBookingPrice` is called correctly

---

## Contact & Support

For questions or issues:
- 📧 Email: support@aneeshealth.com
- 💬 WhatsApp: +20 10 5516 4595
- 🌐 Website: aneeshealth.com
