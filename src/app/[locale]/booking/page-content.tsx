'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import BookingForm from '@/components/booking/booking-form';
import { BookingFormState, PackageType } from '@/lib/models/booking.types';
import styles from './page.module.scss';

interface PageContentProps {
  locale: string;
}

export default function BookingPage({ locale }: PageContentProps) {
  const t = useTranslations('booking');
  const searchParams = useSearchParams();
  const router = useRouter();
  const preSelectedPackage = searchParams.get('package') as PackageType | null;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleBookingSubmit = async (formData: BookingFormState) => {
    try {
      setSubmitError(null);

      // Step 1: Create booking intent on the server
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.message || t('validation.allFieldsRequired'));
        return;
      }

      // Step 2: Redirect to payment page with booking details
      const paymentParams = new URLSearchParams({
        orderId: data.bookingId,
        amount: String(data.amount),
        currency: data.currency,
        ...(formData.fullName && { customerName: formData.fullName }),
        ...(formData.phoneNumber && {
          customerPhone: `+${formData.countryCode}${formData.phoneNumber}`,
        }),
      });

      router.push(`/${locale}/payment?${paymentParams.toString()}`);
    } catch {
      setSubmitError(t('validation.allFieldsRequired'));
    }
  };

  return (
    <div className={styles.bookingPageContainer}>
      <Header />

      <Breadcrumb
        title={t('title')}
        items={[
          { label: t('breadcrumb.home'), href: `/${locale}` },
          { label: t('breadcrumb.booking'), active: true },
        ]}
      />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className={styles.mainContent}>
        {submitError && (
          <div className={styles.errorBanner} role="alert">
            {submitError}
          </div>
        )}
        <BookingForm
          onSubmit={handleBookingSubmit}
          preSelectedPackage={preSelectedPackage}
        />
      </main>

      <Footer />
    </div>
  );
}
