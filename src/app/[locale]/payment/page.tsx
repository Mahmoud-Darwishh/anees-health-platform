import { useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import PaymentGateway from '@/components/booking/payment-gateway';

interface PaymentPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    orderId?: string;
    amount?: string;
    currency?: string;
    customerId?: string;
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

  return (
    <main>
      <PaymentGateway
        orderId={searchParams.orderId}
        amount={searchParams.amount}
        currency={searchParams.currency}
        customerId={searchParams.customerId}
        locale={locale}
      />
    </main>
  );
}
