import { redirect } from 'next/navigation';
import PaymentMethodChooser from '@/features/booking/components/payment-method-chooser';

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
  const instapayHandle = process.env.INSTAPAY_HANDLE || 'Anees Health';
  const instapayUrl = process.env.INSTAPAY_URL || 'https://ipn.eg/S/m_darwish/instapay/3FUhxJ';

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
