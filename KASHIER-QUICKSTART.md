# Quick Start: Kashier Payment Integration

Follow these steps to get Kashier payments working immediately.

## 1. Get Your Credentials (5 minutes)

1. Go to [Kashier Merchant Portal](https://merchant.kashier.io)
2. Sign up or login
3. Navigate to **Settings → API Keys**
4. Copy your:
   - Merchant ID (looks like `MID-123-456`)
   - API Key (your secret key)

## 2. Configure Environment (2 minutes)

Create `.env.local` in your project root:

```bash
KASHIER_MERCHANT_ID=MID-123-456
KASHIER_API_KEY=your-api-key-here
KASHIER_MODE=test
```

## 3. Test It (1 minute)

```bash
npm run dev
```

Navigate to your payment page and click "Pay Now". The Kashier iframe modal should open.

### Test Cards

- **Success**: 4111 1111 1111 1111
- **Declined**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## 4. How It Works

When a user clicks **"Pay Now"**:

1. ✅ Your backend generates a secure hash
2. ✅ Kashier script loads in the browser
3. ✅ Payment modal opens automatically
4. ✅ User enters card details securely
5. ✅ Payment processes
6. ✅ Webhook notifies your server
7. ✅ User redirects to success/failure page

## Files Modified

- ✅ `src/components/booking/payment-gateway.tsx` - Main payment UI
- ✅ `src/app/api/payment/generate-hash/route.ts` - Hash generation
- ✅ `src/app/api/payment/webhook/route.ts` - Payment notifications
- ✅ `src/app/[locale]/payment/redirect/page.tsx` - Result handler
- ✅ `messages/en.json` & `messages/ar.json` - Translations

## What You Need to Do

### For Testing (Right Now)

```bash
# 1. Add credentials to .env.local
KASHIER_MERCHANT_ID=your-test-merchant-id
KASHIER_API_KEY=your-test-api-key
KASHIER_MODE=test

# 2. Start dev server
npm run dev

# 3. Test payment flow
```

### For Production (Later)

1. Get production credentials from Kashier
2. Change `KASHIER_MODE=live`
3. Ensure webhook URL is HTTPS
4. Test with real small amounts first

## Component Usage

```tsx
import PaymentGateway from '@/components/booking/payment-gateway';

<PaymentGateway
  orderId="ORDER-12345"
  amount="250.00"
  currency="EGP"
  customerId="CUST-123"  // Optional
  locale={locale}
/>
```

## Webhook URL (For Kashier Dashboard)

**Local Development (with ngrok):**
```
https://your-ngrok-url.ngrok.io/api/payment/webhook
```

**Production:**
```
https://your-domain.com/api/payment/webhook
```

## Need Help?

- Check browser console for errors
- Check server logs for webhook data
- See [KASHIER-INTEGRATION.md](./KASHIER-INTEGRATION.md) for detailed guide
- Kashier Support: support@kashier.io

## Testing Checklist

- [ ] Environment variables configured
- [ ] Payment modal opens when clicking "Pay Now"
- [ ] Can enter card details in iframe
- [ ] Test card processes successfully
- [ ] Redirects to success page
- [ ] Webhook receives notification (check server logs)
- [ ] Both English and Arabic languages work

---

**Ready to go! 🚀**

If the modal opens and you can pay with test cards, the integration is working correctly.
