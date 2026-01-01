import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment - Anees Health',
  description: 'Complete your booking payment',
  robots: 'noindex, nofollow',
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
