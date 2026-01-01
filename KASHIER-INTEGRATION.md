# Kashier Payment Integration Guide

This document explains how to integrate and use the Kashier payment gateway in the Anees Health Platform.

## Overview

Kashier is integrated using their **I-frame** solution, which provides a secure popup payment window without redirection. The integration follows PCI compliance standards and supports multiple payment methods.

## Features

- ✅ **I-frame Modal**: Payment popup without page redirection
- ✅ **Bilingual**: Supports both English and Arabic
- ✅ **Multiple Payment Methods**: Cards, wallets, bank installments, Fawry
- ✅ **3DS Authentication**: Enhanced security
- ✅ **Server-to-Server Webhook**: Real-time payment notifications
- ✅ **Signature Validation**: Secure communication verification

## Setup Instructions

### 1. Get Kashier Credentials

1. Sign up at [Kashier Merchant Portal](https://merchant.kashier.io)
2. Navigate to Settings → API Keys
3. Copy your:
   - **Merchant ID** (e.g., `MID-123-456`)
   - **API Key** (used for hashing and signature validation)

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Kashier Configuration
KASHIER_MERCHANT_ID=your-merchant-id-here
KASHIER_API_KEY=your-api-key-here
KASHIER_MODE=test  # Use 'test' for development, 'live' for production

# Optional Settings
KASHIER_ENABLE_3DS=true
KASHIER_BRAND_COLOR=rgba(170, 134, 66, 0.9)
```

> **Important**: Never commit `.env.local` to version control. Use `.env.example` as a template.

### 3. Test Mode vs Live Mode

- **Test Mode**: Use test card numbers provided by Kashier
- **Live Mode**: Real transactions with actual payment processing

To switch modes, update `KASHIER_MODE` in your environment variables.

## Architecture

### Components

```
src/
├── components/booking/
│   ├── payment-gateway.tsx        # Main payment component
│   └── payment-result.tsx         # Success/failure page
├── app/
│   ├── api/payment/
│   │   ├── generate-hash/         # Hash generation endpoint
│   │   │   └── route.ts
│   │   └── webhook/               # Payment webhook handler
│   │       └── route.ts
│   └── [locale]/payment/
│       └── redirect/              # Post-payment redirect
│           └── page.tsx
```

### Flow Diagram

```
User → Pay Button
  ↓
Generate Hash (Backend API)
  ↓
Load Kashier Script
  ↓
Trigger I-frame Modal
  ↓
User Enters Card Details
  ↓
Payment Processed
  ↓
┌─────────────────────────┐
│                         │
│  Webhook Notification   │  Redirect to Success/Failure Page
│  (Server-to-Server)     │  (User Browser)
│                         │
└─────────────────────────┘
  ↓                       ↓
Update Booking Status     Show Result to User
```

## API Endpoints

### 1. Generate Payment Hash

**POST** `/api/payment/generate-hash`

Generates the HMAC SHA256 hash required by Kashier.

**Request Body:**
```json
{
  "orderId": "ORDER-12345",
  "amount": "250.00",
  "currency": "EGP",
  "customerId": "CUST-123" // Optional
}
```

**Response:**
```json
{
  "hash": "abc123...",
  "merchantId": "MID-123-456",
  "mode": "test",
  "orderId": "ORDER-12345",
  "amount": "250.00",
  "currency": "EGP"
}
```

### 2. Webhook Handler

**POST** `/api/payment/webhook`

Receives payment notifications from Kashier's servers.

**Payload:**
```json
{
  "paymentStatus": "SUCCESS",
  "merchantOrderId": "ORDER-12345",
  "transactionId": "TXN-789",
  "amount": "250.00",
  "currency": "EGP",
  "cardBrand": "VISA",
  "maskedCard": "4111********1111",
  "signature": "def456..."
}
```

### 3. Redirect Handler

**GET** `/[locale]/payment/redirect`

Handles user redirection after payment completion.

**Query Parameters:**
- `paymentStatus`: SUCCESS or FAILURE
- `merchantOrderId`: Your order ID
- `transactionId`: Kashier transaction ID
- `amount`: Payment amount
- `currency`: Payment currency
- `signature`: Validation signature

## Usage Example

### In Your Booking Flow

```tsx
import PaymentGateway from '@/components/booking/payment-gateway';

export default function CheckoutPage({ params }) {
  const { locale } = params;
  const bookingData = getBookingFromSession(); // Your booking logic

  return (
    <PaymentGateway
      orderId={bookingData.orderId}
      amount={bookingData.totalAmount}
      currency="EGP"
      customerId={bookingData.patientId}
      locale={locale}
    />
  );
}
```

### When User Clicks "Pay Now"

1. **Hash Generation**: Backend generates secure hash
2. **Script Loading**: Kashier checkout script loads
3. **Iframe Trigger**: Hidden button with data attributes triggers modal
4. **Payment Processing**: User completes payment in secure iframe
5. **Callbacks**: Webhook + redirect handle results

## Security Features

### Hash Generation

Uses HMAC SHA256 with your API key:

```javascript
const path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`;
const hash = crypto.createHmac('sha256', apiKey).update(path).digest('hex');
```

### Signature Validation

Validates all incoming webhooks and redirects:

```javascript
function validateSignature(query, apiKey) {
  let queryString = '';
  for (const key in query) {
    if (key === 'signature' || key === 'mode') continue;
    queryString += '&' + key + '=' + query[key];
  }
  const finalUrl = queryString.substring(1);
  const signature = crypto.createHmac('sha256', apiKey).update(finalUrl).digest('hex');
  return signature === query.signature;
}
```

## Payment Methods Supported

- 💳 **Credit/Debit Cards**: Visa, Mastercard, Meeza
- 📱 **Mobile Wallets**: Vodafone Cash, Orange Money, Etisalat Cash
- 🏦 **Bank Installments**: NBE, CIB, Banque Misr, etc.
- 💵 **Fawry**: Cash payment at Fawry kiosks

## Testing

### Test Card Numbers

Kashier provides test cards for different scenarios:

| Card Number | Scenario |
|-------------|----------|
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0000 0000 0341 | Requires 3DS |

**Expiry**: Any future date  
**CVV**: Any 3 digits

### Test the Integration

1. Set `KASHIER_MODE=test`
2. Navigate to payment page
3. Click "Pay Now"
4. Use test card numbers
5. Verify webhook logs in console
6. Check redirect to success/failure page

## Troubleshooting

### Common Issues

#### 1. Payment Modal Doesn't Open

**Causes:**
- Missing or incorrect Kashier script
- Invalid hash generation
- Missing data attributes

**Solution:**
```javascript
// Check browser console for errors
// Verify all data attributes are set correctly
// Ensure Kashier script is loaded
```

#### 2. Hash Validation Fails

**Causes:**
- Incorrect API key
- Wrong format in hash generation

**Solution:**
- Verify `KASHIER_API_KEY` in environment variables
- Check hash generation format matches Kashier docs

#### 3. Webhook Not Received

**Causes:**
- Incorrect webhook URL
- Server not accessible from Kashier

**Solution:**
- Use ngrok for local development
- Verify webhook URL is publicly accessible
- Check server logs for incoming requests

#### 4. RTL Issues (Arabic)

**Solution:**
- Set `data-display="ar"` for Arabic language
- Kashier iframe handles RTL automatically

## Production Checklist

Before going live:

- [ ] Switch `KASHIER_MODE` to `live`
- [ ] Use production API keys from Kashier dashboard
- [ ] Test with real cards (small amounts)
- [ ] Verify webhook URL is HTTPS
- [ ] Enable 3DS authentication
- [ ] Set up monitoring and logging
- [ ] Configure email notifications for failed payments
- [ ] Test all payment methods (cards, wallets, installments)
- [ ] Verify refund process
- [ ] Set up error alerting

## Webhooks for Production

For production, your webhook URL must be:
- **HTTPS** (SSL certificate required)
- **Publicly accessible** (not localhost)
- **Fast response** (under 5 seconds)

Example production webhook:
```
https://anees-health.com/api/payment/webhook
```

## Support

- **Kashier Documentation**: https://developers.kashier.io
- **Kashier Support**: support@kashier.io
- **Integration Issues**: Check browser console and server logs

## Additional Resources

- [Kashier Payment UI Documentation](https://developers.kashier.io/payment/payment-ui)
- [Kashier API Reference](https://developers.kashier.io/api)
- [Security Best Practices](https://developers.kashier.io/security)

---

**Last Updated**: January 2026  
**Version**: 1.0.0
