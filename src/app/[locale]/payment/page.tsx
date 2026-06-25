import { redirect } from 'next/navigation';
import PaymentMethodChooser from '@/features/booking/components/payment-method-chooser';
import { logger } from '@/lib/utils/app-logger';

interface PaymentPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    orderId?: string;
    amount?: string;
    currency?: string;
    customerName?: string;
    customerPhone?: string;
  }>;
}

export default async function PaymentPage(props: PaymentPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { locale } = params;

  // Validate required parameters
  if (!searchParams.orderId || !searchParams.amount || !searchParams.currency) {
    redirect(`/${locale}/booking`);
  }

  // Display label + the InstaPay deep link that opens the app to pay this payee.
  // These MUST be set in production. We deliberately do NOT ship a hard-coded
  // payee deep link as a fallback: a missing env var must never silently route a
  // patient's money to a personal account. When unset, the panel shows the brand
  // label and simply omits the "open app" deep link.
  const instapayHandle = process.env.INSTAPAY_HANDLE || 'Anees Health';
  const instapayUrl = process.env.INSTAPAY_URL || '';

  if (process.env.NODE_ENV === 'production' && (!process.env.INSTAPAY_HANDLE || !process.env.INSTAPAY_URL)) {
    logger.warn('INSTAPAY_NOT_CONFIGURED: set INSTAPAY_HANDLE and INSTAPAY_URL — showing placeholder payee, deep link omitted', {
      hasHandle: Boolean(process.env.INSTAPAY_HANDLE),
      hasUrl: Boolean(process.env.INSTAPAY_URL),
    });
  }

  return (
    <main>
      <PaymentMethodChooser
        orderId={searchParams.orderId}
        amount={searchParams.amount}
        currency={searchParams.currency}
        customerName={searchParams.customerName}
        customerPhone={searchParams.customerPhone}
        locale={locale}
        instapayHandle={instapayHandle}
        instapayUrl={instapayUrl}
      />
    </main>
  );
}
