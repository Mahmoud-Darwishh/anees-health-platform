'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import styles from './payment-gateway.module.scss';

interface PaymentGatewayProps {
  orderId: string;
  amount: string;
  currency: string;
  customerName?: string;
  customerPhone?: string;
  locale: string;
}

type GatewayState = 'loading' | 'ready' | 'error';

export default function PaymentGateway({
  orderId,
  amount,
  currency,
  customerName,
  customerPhone,
  locale,
}: PaymentGatewayProps) {
  const t = useTranslations('payment');
  const [state, setState] = useState<GatewayState>('loading');
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function createSession() {
      try {
        setState('loading');

        const response = await fetch('/api/bookings/payment/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: orderId,
            amount: parseFloat(amount),
            currency,
            locale,
            customerName,
            customerPhone,
          }),
        });

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || t('errorGeneric'));
          setState('error');
          return;
        }

        setSessionUrl(data.sessionUrl);
        setState('ready');
      } catch {
        if (cancelled) return;
        setErrorMessage(t('errorGeneric'));
        setState('error');
      }
    }

    createSession();
    return () => { cancelled = true; };
  }, [orderId, amount, currency, locale, t]);

  return (
    <section className={styles.paymentGateway} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>
            {t('subtitle', { orderId })}
          </p>
        </div>

        {/* Order Summary Bar */}
        <div className={styles.orderBar}>
          <span className={styles.orderLabel}>{t('orderTotal')}</span>
          <span className={styles.orderAmount}>
            {amount} <span className={styles.currency}>{currency}</span>
          </span>
        </div>

        {/* Payment Frame */}
        <div className={styles.frameWrapper}>
          {state === 'loading' && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>{t('loading')}</p>
            </div>
          )}

          {state === 'error' && (
            <div className={styles.errorState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p className={styles.errorMessage}>{errorMessage}</p>
              <button
                className={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                {t('retry')}
              </button>
            </div>
          )}

          {state === 'ready' && sessionUrl && (
            <iframe
              src={sessionUrl}
              className={styles.paymentFrame}
              title={t('iframeTitle')}
              allow="payment"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            />
          )}
        </div>

        {/* Security Note */}
        <div className={styles.securityNote}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>{t('securityNote')}</span>
        </div>
      </div>
    </section>
  );
}
