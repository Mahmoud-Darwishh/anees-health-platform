# ✅ Kashier Integration Checklist

## Setup (Do This First)

- [ ] Sign up at [Kashier Merchant Portal](https://merchant.kashier.io)
- [ ] Get your Merchant ID from Settings → API Keys
- [ ] Get your API Key from Settings → API Keys
- [ ] Create `.env.local` file in project root
- [ ] Add credentials to `.env.local`:
  ```bash
  KASHIER_MERCHANT_ID=your-merchant-id
  KASHIER_API_KEY=your-api-key
  KASHIER_MODE=test
  ```

## Test Payment Flow

- [ ] Run `npm run dev`
- [ ] Navigate to payment page
- [ ] Click "Pay Now" button
- [ ] Verify Kashier iframe modal opens
- [ ] Enter test card: `4111 1111 1111 1111`
- [ ] CVV: `123`, Expiry: `12/25`
- [ ] Submit payment
- [ ] Verify redirect to success page
- [ ] Check console for logs

## Test Both Languages

- [ ] Test payment in English (`/en/payment`)
- [ ] Test payment in Arabic (`/ar/payment`)
- [ ] Verify iframe displays in correct language
- [ ] Verify RTL layout works correctly

## Verify Webhook (Optional for Local)

- [ ] Install ngrok: `npm install -g ngrok`
- [ ] Run ngrok: `ngrok http 3000`
- [ ] Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
- [ ] Add webhook in Kashier dashboard: `https://abc123.ngrok.io/api/payment/webhook`
- [ ] Make a test payment
- [ ] Check terminal for webhook logs

## Production Preparation

- [ ] Get production credentials from Kashier
- [ ] Update `.env.local` with production keys
- [ ] Change `KASHIER_MODE=live`
- [ ] Set up HTTPS webhook URL
- [ ] Configure webhook in Kashier dashboard
- [ ] Test with small real amount (e.g., 1 EGP)
- [ ] Verify webhook receives notifications
- [ ] Set up error monitoring
- [ ] Configure email alerts for failed payments

## Code Integration

- [ ] Import PaymentGateway component
- [ ] Pass orderId, amount, currency, locale
- [ ] Handle booking status updates in webhook
- [ ] Test complete booking flow
- [ ] Add error handling for payment failures
- [ ] Add loading states during payment

## Documentation Read

- [ ] Read [KASHIER-QUICKSTART.md](./KASHIER-QUICKSTART.md)
- [ ] Read [KASHIER-INTEGRATION.md](./KASHIER-INTEGRATION.md)
- [ ] Read [KASHIER-SUMMARY.md](./KASHIER-SUMMARY.md)
- [ ] Bookmark Kashier developer docs

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test with ngrok (for webhooks)
ngrok http 3000

# Build for production
npm run build

# Start production server
npm start
```

## Quick Test Card Reference

| Card Number          | Scenario          |
|---------------------|-------------------|
| 4111 1111 1111 1111 | ✅ Success        |
| 4000 0000 0000 0002 | ❌ Declined       |
| 4000 0000 0000 0341 | 🔐 Requires 3DS   |

**CVV**: Any 3 digits  
**Expiry**: Any future date

---

**Done with all checkboxes? You're ready to accept payments! 🎉**
