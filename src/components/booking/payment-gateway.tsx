'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './payment-gateway.module.scss';

interface PaymentGatewayProps {
  orderId: string;
  amount: string;
  currency: string;
  customerId?: string;
  locale: string;
  onPaymentSuccess?: () => void;
  autoOpen?: boolean; // Auto-open modal without showing summary
}

export default function PaymentGateway({
  orderId,
  amount,
  currency,
  customerId,
  locale,
  onPaymentSuccess,
  autoOpen = true, // Default to auto-open
}: PaymentGatewayProps) {
  const t = useTranslations('payment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    console.log('✅ Payment component mounted');
    
    // If autoOpen is true, automatically start payment process
    if (autoOpen) {
      console.log('🚀 Auto-opening payment modal');
      handlePayment();
    }
    
    return () => {
      console.log('🔌 Payment component unmounted');
    };
  }, [autoOpen]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Starting payment process:', { orderId, amount, currency });

      // Validate required fields
      if (!orderId || !amount || !currency) {
        const errMsg = 'Missing payment information. Please try again.';
        console.error(errMsg);
        throw new Error(errMsg);
      }

      // Generate hash from backend
      console.log('📡 Requesting hash generation from /api/payment/generate-hash...');

      const hashResponse = await fetch('/api/payment/generate-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: String(orderId),
          amount: String(amount),
          currency: String(currency),
          customerId,
        }),
      });

      console.log('📊 Hash API response status:', hashResponse.status);

      if (!hashResponse.ok) {
        const errorText = await hashResponse.text();
        console.error('❌ Hash generation failed with status', hashResponse.status);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `API Error: ${hashResponse.status}`);
      }

      const responseData = await hashResponse.json();
      console.log('📊 Hash API response received');

      const { hash, merchantId, mode } = responseData;

      if (!hash || !merchantId) {
        console.error('❌ Invalid response from hash API');
        throw new Error('Invalid payment configuration received from server');
      }

      console.log('✅ Hash generated successfully');

      // Build redirect URL (prefer env for production/live compliance)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = process.env.KASHIER_REDIRECT || `${siteUrl}/${locale}/payment/redirect`;
      const webhookUrl = process.env.KASHIER_WEBHOOK || `${siteUrl}/api/payment/webhook`;

      // IMPORTANT: Use test mode URL if mode is 'test'
      const baseUrl = mode === 'test' 
        ? 'https://test-payments.kashier.io/' 
        : 'https://payments.kashier.io/';
      
      console.log('🔧 Payment mode:', mode, '| Base URL:', baseUrl);

      // Build Kashier Hosted Payment Page URL (for iframe src)
      const kashierUrl = new URL(baseUrl);
      kashierUrl.searchParams.append('merchantId', merchantId);
      kashierUrl.searchParams.append('orderId', orderId);
      kashierUrl.searchParams.append('amount', String(amount));
      kashierUrl.searchParams.append('currency', currency);
      kashierUrl.searchParams.append('hash', hash);
      kashierUrl.searchParams.append('mode', mode);
      kashierUrl.searchParams.append('merchantRedirect', redirectUrl);
      kashierUrl.searchParams.append('serverWebhook', webhookUrl);
      kashierUrl.searchParams.append('type', 'iframe');
      kashierUrl.searchParams.append('display', locale === 'ar' ? 'ar' : 'en');
      kashierUrl.searchParams.append('allowedMethods', 'card,wallet,fawry,bank_installments');
      kashierUrl.searchParams.append('brandColor', 'rgba(170, 134, 66, 0.9)');
      kashierUrl.searchParams.append('enable3DS', 'true');
      kashierUrl.searchParams.append('interactionSource', 'Ecommerce');
      
      if (customerId) {
        kashierUrl.searchParams.append('customer', JSON.stringify({ id: customerId }));
      }

      console.log('📋 Kashier I-frame URL:', kashierUrl.toString());
      
      // Set payment URL and show modal
      setPaymentUrl(kashierUrl.toString());
      setShowModal(true);
      setLoading(false);
      
      console.log('🎬 Opening payment modal...');
      
    } catch (err) {
      console.error('❌ Payment error occurred:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      console.error('📋 Error message:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const closeModal = () => {
    console.log('❌ Closing payment modal');
    setShowModal(false);
    setPaymentUrl(null);
  };

  return (
    <>
      {/* Only show summary if not auto-opening */}
      {!autoOpen && (
        <div className={styles.paymentContainer}>
          <div className={styles.paymentHeader}>
            <h1>{t('completePayment')}</h1>
            <p>{t('securePayment')}</p>
          </div>

          <div className={styles.orderSummary}>
            <h3>{t('orderSummary')}</h3>
            <div className={styles.summaryRow}>
              <span>{t('orderId')}:</span>
              <strong>{orderId}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>{t('amount')}:</span>
              <strong>
                {amount} {currency}
              </strong>
            </div>
          </div>

          {error && (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.paymentActions}>
            <button
              onClick={handlePayment}
              disabled={loading}
              className={styles.payButton}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  {t('processing')}
                </>
              ) : (
                <>💳 {t('payNow')}</>
              )}
            </button>

            <button 
              onClick={() => {
                if (onPaymentSuccess) onPaymentSuccess();
              }}
              className={styles.cancelButton}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal with I-frame - Full Screen */}
      {showModal && paymentUrl && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.iframeContainer}>
              <iframe
                ref={iframeRef}
                src={paymentUrl}
                title="Kashier Payment Gateway"
                className={styles.paymentIframe}
                allow="payment"
                sandbox="allow-same-origin allow-forms allow-scripts allow-popups allow-top-navigation"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
