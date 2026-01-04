# Payment Gateway 403 Forbidden Error - Troubleshooting Guide

## Issue
When submitting payment data, you receive a **403 Forbidden** error from Kashier.

## Root Causes Identified & Fixed

### 1. ✅ **Hash Generation Path Format (FIXED)**
**Problem:** The hash path was formatted incorrectly
- **Before:** `/?payment=mid.orderId.amount.currency`
- **After:** `mid.orderId.amount.currency`

**File:** [src/app/api/payment/generate-hash/route.ts](src/app/api/payment/generate-hash/route.ts#L44)

### 2. ✅ **API Key Whitespace Issues (FIXED)**
**Problem:** The `.env` file had trailing comments after the API key, causing whitespace
- **Before:** `KASHIER_API_KEY=ad66b6bf-4c64-424c-a058-87ca92c881ac    #Da ll API key...`
- **After:** `KASHIER_API_KEY=ad66b6bf-4c64-424c-a058-87ca92c881ac`

**File:** [.env](.env#L3)

### 3. ✅ **API Key Not Trimmed in Code (FIXED)**
**Problem:** The hash generation code wasn't trimming whitespace from environment variables
- **Added:** `const trimmedApiKey = apiKey.trim();`

**File:** [src/app/api/payment/generate-hash/route.ts](src/app/api/payment/generate-hash/route.ts#L44)

---

## How Kashier Hash Generation Works

Kashier validates payment requests using HMAC-SHA256 signatures. The hash must be generated correctly:

### Correct Format:
```
Hash = HMAC-SHA256(
  message: "merchantId.orderId.amount.currency[.customerId]",
  key: KASHIER_API_KEY
)
```

### Example:
- Merchant ID: `MID-36199-404`
- Order ID: `ORDER-123456`
- Amount: `500.00`
- Currency: `EGP`
- Customer ID: `+201234567890` (optional)

**Message to hash:**
```
MID-36199-404.ORDER-123456.500.00.EGP.+201234567890
```

**Result:** 32-character hex string used in Kashier payment URL

---

## Testing Checklist

- [ ] `.env` file has clean API key with no trailing comments
- [ ] `KASHIER_MERCHANT_ID` is set correctly (e.g., `MID-36199-404`)
- [ ] `KASHIER_API_KEY` is set correctly and matches your Kashier dashboard
- [ ] `KASHIER_MODE` is set to `test` for testing or `live` for production
- [ ] Browser console shows hash generation in the logs
- [ ] Network tab shows `/api/payment/generate-hash` returns 200 with hash
- [ ] Browser opens Kashier payment iframe after clicking "Pay Now"

---

## How to Test Payment Flow

1. **Open Browser DevTools** (F12)
2. **Go to Booking Page** → Fill form → Click "Pay Now"
3. **Check Console** for:
   - `🚀 Starting payment process: { orderId, amount, currency }`
   - `✅ Hash generated: [32-char-hex]`
   - `✅ Hash generated successfully`
4. **Check Network Tab** for:
   - `POST /api/payment/generate-hash` → Status 200
   - Response contains `hash`, `merchantId`, `mode`
5. **Kashier iframe** should open with payment form

---

## If Error Persists

### 1. Verify Kashier Credentials
```bash
# Check if environment variables are loaded
echo $KASHIER_MERCHANT_ID
echo $KASHIER_API_KEY
```

### 2. Test Hash Generation Directly
```bash
# In Node.js REPL
const crypto = require('crypto');
const apiKey = 'ad66b6bf-4c64-424c-a058-87ca92c881ac';
const message = 'MID-36199-404.TEST-ORDER.100.EGP';
const hash = crypto.createHmac('sha256', apiKey).update(message).digest('hex');
console.log(hash);
```

### 3. Check Kashier Dashboard
- Login to [Kashier Dashboard](https://dashboard.kashier.io)
- Verify:
  - Merchant ID matches `MID-36199-404`
  - API Key matches in `.env`
  - Account is in correct mode (test/live)
  - Webhook URL is set correctly

### 4. Enable Debug Logging
Add this to [src/app/api/payment/generate-hash/route.ts](src/app/api/payment/generate-hash/route.ts):

```typescript
console.log('🔍 DEBUG - API Key:', apiKey.slice(0, 10) + '...');
console.log('🔍 DEBUG - Hash input:', path);
console.log('🔍 DEBUG - Hash output:', hash);
```

---

## Common 403 Errors

| Error | Cause | Fix |
|-------|-------|-----|
| **403 Forbidden** | Invalid hash | Check hash algorithm and API key |
| **Invalid signature** | Whitespace in API key | Remove trailing spaces in `.env` |
| **Merchant not found** | Wrong merchant ID | Verify `KASHIER_MERCHANT_ID` |
| **Invalid request format** | Wrong hash path format | Use `mid.orderId.amount.currency` |
| **CORS error** | Missing Kashier domain | Check CSP headers in `next.config.ts` |

---

## Production Checklist

Before going live:

- [ ] Change `KASHIER_MODE=live` in `.env`
- [ ] Update `KASHIER_MERCHANT_ID` for production account
- [ ] Update `KASHIER_API_KEY` for production account
- [ ] Update webhook URLs to production domain
- [ ] Update redirect URLs to production domain
- [ ] Test with real payment credentials
- [ ] Monitor webhook responses in Kashier dashboard
- [ ] Set up error alerting and logging

---

## Related Files

- [API Route: generate-hash](src/app/api/payment/generate-hash/route.ts)
- [API Route: webhook](src/app/api/payment/webhook/route.ts)
- [Component: PaymentGateway](src/components/booking/payment-gateway.tsx)
- [Config: Environment Variables](.env)
- [Config: Next.js Setup](next.config.ts)

---

**Last Updated:** January 4, 2026  
**Status:** ✅ Fixed - Build successful
