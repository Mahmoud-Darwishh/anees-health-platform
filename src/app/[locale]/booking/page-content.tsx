'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import BookingForm from '@/components/booking/booking-form';
import PaymentGateway from '@/components/booking/payment-gateway';
import { BookingFormState, calculateBookingPrice } from '@/lib/models/booking.types';
import styles from './page.module.scss';

interface PageContentProps {
  locale: string;
}

export default function BookingPage({ locale }: PageContentProps) {
  const t = useTranslations('booking');
  const [formState, setFormState] = useState<BookingFormState | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [orderId, setOrderId] = useState('');

  const handlePayNow = useCallback((state: BookingFormState) => {
    setFormState(state);
    // Calculate price based on booking
    const price = calculateBookingPrice(state);
    setTotalPrice(price);
    
    // Generate order ID
    const newOrderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    setOrderId(newOrderId);
    
    // Store booking data in sessionStorage for webhook reference
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        ...state,
        orderId: newOrderId,
        totalPrice: price,
        createdAt: new Date().toISOString()
      }));
    }
    
    // Show payment modal immediately
    setShowPayment(true);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    setShowSuccessMessage(true);
    // Reset form for new booking
    setTimeout(() => {
      setFormState(null);
      setTotalPrice(0);
      setShowSuccessMessage(false);
    }, 3000);
  }, []);

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
      <main className={styles.mainContent}>
        {showSuccessMessage ? (
          <div className={styles.successMessage} role="alert">
            <h2>✅ {t('success.title')}</h2>
            <p>{t('success.message')}</p>
            <button
              onClick={() => {
                setShowSuccessMessage(false);
                setFormState(null);
              }}
              className={styles.newBookingButton}
            >
              {t('newBooking')}
            </button>
          </div>
        ) : (
          <>
            <BookingForm onPayNow={handlePayNow} />
            
            {/* Payment Modal - Overlay the booking form */}
            {showPayment && (
              <PaymentGateway
                orderId={orderId}
                amount={String(totalPrice)}
                currency="EGP"
                customerId={formState?.phoneNumber}
                locale={locale}
                onPaymentSuccess={handlePaymentSuccess}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
