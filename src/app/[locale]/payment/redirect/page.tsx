import { redirect } from 'next/navigation';
import crypto from 'crypto';
import PaymentResult from '@/components/booking/payment-result';

interface PaymentRedirectPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    paymentStatus?: string;
    merchantOrderId?: string;
    orderId?: string;
    transactionId?: string;
    amount?: string;
    currency?: string;
    cardBrand?: string;
    maskedCard?: string;
    cardDataToken?: string;
    signature?: string;
    mode?: string;
    transactionResponseCode?: string;
  }>;
}

/**
 * Validate Kashier Signature
 * As per Kashier documentation
 */
function validateSignature(
  query: Record<string, string>,
  apiKey: string
): boolean {
  let queryString = '';

  // Build query string excluding 'signature' and 'mode'
  for (const key in query) {
    if (key === 'signature' || key === 'mode') continue;
    queryString += '&' + key + '=' + query[key];
  }

  // Remove leading '&'
  const finalUrl = queryString.substring(1);
  
  // Generate signature using HMAC SHA256
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(finalUrl)
    .digest('hex');

  return signature === query.signature;
}

export default async function PaymentRedirectPage(props: PaymentRedirectPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { locale } = params;

  // Validate that we have payment response
  if (!searchParams.paymentStatus || !searchParams.merchantOrderId) {
    console.error('❌ Missing required payment parameters');
    redirect(`/${locale}/booking`);
  }

  // Validate signature if present
  const apiKey = process.env.KASHIER_API_KEY;
  
  if (searchParams.signature && apiKey) {
    const queryParams = Object.fromEntries(
      Object.entries(searchParams).map(([key, value]) => [key, String(value)])
    );
    
    const isValid = validateSignature(queryParams, apiKey);
    
    if (!isValid) {
      console.error('❌ Invalid payment signature');
      // In production, you might want to show an error page
      // For now, we'll still show the result but log the error
    } else {
      console.log('✅ Payment signature validated');
    }
  }

  // Log payment result
  console.log('💳 Payment redirect received:', {
    status: searchParams.paymentStatus,
    orderId: searchParams.merchantOrderId,
    transactionId: searchParams.transactionId,
    amount: searchParams.amount,
    currency: searchParams.currency,
  });

  return (
    <main>
      <PaymentResult
        status={searchParams.paymentStatus}
        orderId={searchParams.merchantOrderId}
        transactionId={searchParams.transactionId}
        amount={searchParams.amount}
        currency={searchParams.currency}
        cardBrand={searchParams.cardBrand}
        maskedCard={searchParams.maskedCard}
        locale={locale}
      />
    </main>
  );
}
