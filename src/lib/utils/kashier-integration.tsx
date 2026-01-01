'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookingFormState, CreateBookingIntentRequest } from '@/lib/models/booking.types';

interface PaymentConfig {
  merchantId: string;
  displayName: string;
  apiKey: string;
  sandboxMode: boolean;
}

interface KashierPaymentResponse {
  status: 'success' | 'failed' | 'cancelled';
  transactionId?: string;
  bookingId?: string;
  amount?: number;
  message?: string;
}

// Get Kashier configuration from environment
const getPaymentConfig = (): PaymentConfig => {
  const sandboxMode = process.env.NEXT_PUBLIC_KASHIER_SANDBOX === 'true';
  
  return {
    merchantId: process.env.NEXT_PUBLIC_KASHIER_MERCHANT_ID || '',
    displayName: process.env.NEXT_PUBLIC_KASHIER_DISPLAY_NAME || 'Anees Health',
    apiKey: process.env.NEXT_PUBLIC_KASHIER_API_KEY || '',
    sandboxMode,
  };
};

interface BookingPaymentHandlerProps {
  formState: BookingFormState;
  totalPrice: number;
  onPaymentSuccess?: (response: KashierPaymentResponse) => void;
  onPaymentError?: (error: Error) => void;
}

export function useBookingPayment({
  formState,
  totalPrice,
  onPaymentSuccess,
  onPaymentError,
}: BookingPaymentHandlerProps) {
  const t = useTranslations();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /**
   * Create booking intent on server and initiate payment
   */
  const initiatePayment = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Create booking intent on server
      const bookingPayload: CreateBookingIntentRequest = {
        fullName: formState.fullName,
        phoneNumber: formState.phoneNumber,
        visitType: formState.visitType!,
        serviceType: formState.serviceType || undefined,
        specialty: formState.specialty || undefined,
        preferredDate: formState.preferredDate || undefined,
        timePreference: formState.timePreference || undefined,
        sessionCount: formState.sessionCount || undefined,
        caseType: formState.caseType || undefined,
        nursingType: formState.nursingType || undefined,
        nursingHoursPerDay: formState.nursingHoursPerDay || undefined,
        nursingDuration: formState.nursingDuration || undefined,
      };

      const bookingResponse = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking intent');
      }

      const { bookingId, amount } = await bookingResponse.json();

      // Step 2: Open Kashier iframe with payment parameters
      openKashierPayment({
        bookingId,
        amount,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment setup failed';
      setError(errorMessage);
      onPaymentError?.(new Error(errorMessage));
    } finally {
      setIsProcessing(false);
    }
  }, [formState, onPaymentError]);

  /**
   * Open Kashier payment iframe
   */
  const openKashierPayment = useCallback(
    ({ bookingId, amount }: { bookingId: string; amount: number }) => {
      const config = getPaymentConfig();

      if (!config.merchantId || !config.apiKey) {
        setError('Payment configuration missing. Please contact support.');
        return;
      }

      // Kashier iframe URL
      // Replace with actual Kashier endpoint and parameters
      const kashierUrl = buildKashierUrl({
        merchantId: config.merchantId,
        bookingId,
        amount,
        customerName: formState.fullName,
        customerEmail: '', // Add email collection if needed
        customerPhone: formState.phoneNumber,
        sandboxMode: config.sandboxMode,
      });

      // Open Kashier in modal/iframe
      // For production, you might use a modal library like dialog or a custom modal
      const width = 500;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      window.open(
        kashierUrl,
        'KashierPayment',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Listen for payment completion messages
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'KASHIER_PAYMENT_RESULT') {
          const result = event.data.payload as KashierPaymentResponse;

          if (result.status === 'success') {
            onPaymentSuccess?.(result);
          } else {
            setError(result.message || 'Payment failed');
            onPaymentError?.(new Error(result.message || 'Payment failed'));
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup listener
      return () => window.removeEventListener('message', handleMessage);
    },
    [formState, onPaymentSuccess, onPaymentError]
  );

  return {
    initiatePayment,
    isProcessing,
    error,
    iframeRef,
  };
}

/**
 * Build Kashier payment URL with parameters
 * This URL opens the Kashier payment page in an iframe or modal
 */
function buildKashierUrl({
  merchantId,
  bookingId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  sandboxMode,
}: {
  merchantId: string;
  bookingId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sandboxMode: boolean;
}): string {
  const baseUrl = sandboxMode
    ? 'https://sandbox.kashier.io/api/v1/charge'
    : 'https://kashier.io/api/v1/charge';

  const params = new URLSearchParams({
    merchantId,
    orderId: bookingId,
    amount: amount.toString(),
    currency: 'EGP',
    customerName,
    customerPhone,
    ...(customerEmail && { customerEmail }),
    redirectUrl: `${window.location.origin}/booking/payment-callback`,
    postUrl: `${window.location.origin}/api/bookings/payment-webhook`,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Component wrapper for payment button with Kashier integration
 */
interface KashierPaymentButtonProps {
  formState: BookingFormState;
  totalPrice: number;
  onPaymentSuccess?: (response: KashierPaymentResponse) => void;
  onPaymentError?: (error: Error) => void;
  className?: string;
}

export function KashierPaymentButton({
  formState,
  totalPrice,
  onPaymentSuccess,
  onPaymentError,
  className = '',
}: KashierPaymentButtonProps) {
  const t = useTranslations();
  const { initiatePayment, isProcessing, error } = useBookingPayment({
    formState,
    totalPrice,
    onPaymentSuccess,
    onPaymentError,
  });

  return (
    <>
      <button
        onClick={initiatePayment}
        disabled={isProcessing || totalPrice === 0}
        className={className}
        type="button"
      >
        {isProcessing ? t('booking.actions.processing') : t('booking.actions.payNow')}
      </button>
      {error && (
        <div role="alert" className="payment-error">
          {error}
        </div>
      )}
    </>
  );
}

/**
 * Alternative: For Kashier redirect (simpler integration)
 * Use this if you prefer full-page redirect instead of iframe/modal
 */
export function redirectToKashierPayment({
  bookingId,
  amount,
  customerName,
  customerPhone,
  sandboxMode = true,
}: {
  bookingId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  sandboxMode?: boolean;
}) {
  const config = getPaymentConfig();

  const kashierUrl = buildKashierUrl({
    merchantId: config.merchantId,
    bookingId,
    amount,
    customerName,
    customerEmail: '',
    customerPhone,
    sandboxMode,
  });

  window.location.href = kashierUrl;
}
