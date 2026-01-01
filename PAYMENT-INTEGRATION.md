# Kashier Payment Gateway Integration

## Overview
This project integrates Kashier payment gateway using the I-frame method for secure, PCI-compliant payment processing.

## Setup Instructions

### 1. Environment Variables
Update `.env.local` with your Kashier credentials:

```env
KASHIER_MERCHANT_ID=your_merchant_id_here
KASHIER_API_KEY=your_api_key_here
KASHIER_MODE=test  # Change to 'live' for production
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Your domain
```

### 2. How It Works

#### Flow:
1. **User completes booking form** → Data validated
2. **System generates order ID** → Booking saved to session storage
3. **Redirect to payment page** → `/payment?orderId=...&amount=...&currency=EGP`
4. **Backend generates hash** → API endpoint `/api/payment/generate-hash`
5. **Kashier iframe loads** → Secure payment form displayed
6. **Payment processed** → Webhook receives notification at `/api/payment/webhook`
7. **User redirected** → Success/failure page at `/payment/redirect`

### 3. API Endpoints

#### `/api/payment/generate-hash` (POST)
Generates HMAC SHA256 hash for payment authentication.

**Request:**
```json
{
  "amount": "1500",
  "currency": "EGP",
  "orderId": "ORDER-123",
  "customerId": "CUSTOMER-456" // Optional
}
```

**Response:**
```json
{
  "hash": "generated_hash_here",
  "merchantId": "MID-123-123",
  "mode": "test",
  "orderId": "ORDER-123",
  "amount": "1500",
  "currency": "EGP"
}
```

#### `/api/payment/webhook` (POST)
Receives server-to-server payment notifications from Kashier.

**Payload:**
```json
{
  "paymentStatus": "SUCCESS",
  "merchantOrderId": "ORDER-123",
  "transactionId": "TXN-789",
  "amount": "1500",
  "currency": "EGP",
  "signature": "validation_signature",
  "mode": "test"
}
```

### 4. Payment Pages

#### `/[locale]/payment`
Main payment page that loads Kashier iframe with booking details.

**Query Parameters:**
- `orderId` - Unique order identifier
- `amount` - Payment amount
- `currency` - Currency code (EGP)
- `customerId` - Optional customer ID for card saving

#### `/[locale]/payment/redirect`
Post-payment redirect page displaying success/failure status.

**Query Parameters:**
- `paymentStatus` - SUCCESS or FAILURE
- `merchantOrderId` - Order reference
- `transactionId` - Kashier transaction ID
- `amount` - Payment amount
- `currency` - Currency code
- `cardBrand` - Card type (Visa, Mastercard, etc.)
- `maskedCard` - Masked card number
- `signature` - Validation signature

### 5. Components

#### `PaymentGateway`
Client component that:
- Fetches payment hash from backend
- Loads Kashier iframe script
- Configures payment parameters
- Handles loading and error states

#### `PaymentResult`
Displays payment outcome with:
- Success/failure status
- Transaction details
- Return home / try again actions

### 6. Security Features

- **HMAC SHA256 Hashing** - Ensures data integrity
- **Signature Validation** - Verifies webhook authenticity
- **Server-side Hash Generation** - API key never exposed to client
- **3D Secure** - Enabled by default for card payments
- **PCI Compliance** - Handled by Kashier iframe

### 7. Testing

#### Test Mode
Set `KASHIER_MODE=test` in `.env.local`

**Test Cards:**
- **Success:** 4242 4242 4242 4242
- **Failure:** 4000 0000 0000 0002

**CVV:** Any 3 digits
**Expiry:** Any future date

### 8. Production Checklist

- [ ] Update `KASHIER_MERCHANT_ID` with live credentials
- [ ] Update `KASHIER_API_KEY` with live API key
- [ ] Change `KASHIER_MODE` to `live`
- [ ] Update `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Test webhook endpoint is publicly accessible
- [ ] Verify SSL certificate is valid
- [ ] Implement database storage for bookings
- [ ] Add email confirmation system
- [ ] Enable logging and monitoring
- [ ] Test all payment methods (cards, wallets, Fawry)

### 9. Database Integration (TODO)

Currently, booking data is stored in `sessionStorage`. For production:

1. Create booking database schema
2. Save booking on form submission
3. Update booking status on payment webhook
4. Send confirmation emails
5. Implement booking management dashboard

### 10. Supported Payment Methods

- **Credit/Debit Cards** (Visa, Mastercard, Meeza)
- **Mobile Wallets** (Vodafone Cash, Orange Cash, Etisalat Cash)
- **Fawry** (Cash payment at Fawry locations)
- **Bank Installments** (Available with select banks)

### 11. Customization

#### Brand Color
Change payment iframe color in `payment-gateway.tsx`:
```typescript
script.setAttribute('data-brandColor', '#aa8642'); // Your brand color
```

#### Allowed Methods
Restrict payment methods:
```typescript
script.setAttribute('data-allowedMethods', 'card,wallet'); // Remove Fawry
```

#### Language
Automatically set based on user locale (ar/en).

### 12. Troubleshooting

**Issue:** Hash validation fails
- Verify API key matches in backend and Kashier dashboard
- Check hash generation includes correct parameters in order

**Issue:** Webhook not received
- Ensure webhook URL is publicly accessible (not localhost)
- Check server logs for incoming requests
- Verify signature validation logic

**Issue:** Payment iframe not loading
- Check browser console for errors
- Verify all required data attributes are set
- Ensure Kashier script URL is correct

### 13. Support

- **Kashier Documentation:** https://developers.kashier.io/
- **Kashier Support:** support@kashier.io
- **Dashboard:** https://merchants.kashier.io/

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── payment/
│   │       ├── generate-hash/
│   │       │   └── route.ts          # Hash generation API
│   │       └── webhook/
│   │           └── route.ts          # Webhook handler
│   └── [locale]/
│       └── payment/
│           ├── layout.tsx            # Payment layout
│           ├── page.tsx              # Main payment page
│           └── redirect/
│               └── page.tsx          # Post-payment redirect
└── components/
    └── booking/
        ├── payment-gateway.tsx       # Kashier iframe loader
        ├── payment-gateway.module.scss
        ├── payment-result.tsx        # Success/failure display
        └── payment-result.module.scss
```
