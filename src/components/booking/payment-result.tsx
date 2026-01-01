'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './payment-result.module.scss';

interface PaymentResultProps {
  status: string;
  orderId?: string;
  transactionId?: string;
  amount?: string;
  currency?: string;
  cardBrand?: string;
  maskedCard?: string;
  locale: string;
}

export default function PaymentResult({
  status,
  orderId,
  transactionId,
  amount,
  currency,
  cardBrand,
  maskedCard,
  locale,
}: PaymentResultProps) {
  const t = useTranslations('payment');
  const isSuccess = status === 'SUCCESS';

  return (
    <div className={styles.resultContainer}>
      <div className={`${styles.resultCard} ${isSuccess ? styles.success : styles.failure}`}>
        <div className={styles.iconWrapper}>
          {isSuccess ? (
            <div className={styles.successIcon}>✓</div>
          ) : (
            <div className={styles.failureIcon}>✕</div>
          )}
        </div>

        <h1 className={styles.resultTitle}>
          {isSuccess ? t('paymentSuccess') : t('paymentFailed')}
        </h1>

        <p className={styles.resultMessage}>
          {isSuccess
            ? t('paymentSuccessMessage')
            : t('paymentFailedMessage')}
        </p>

        {isSuccess && (
          <div className={styles.paymentDetails}>
            {orderId && (
              <div className={styles.detailRow}>
                <span className={styles.label}>{t('orderId')}:</span>
                <span className={styles.value}>{orderId}</span>
              </div>
            )}
            {transactionId && (
              <div className={styles.detailRow}>
                <span className={styles.label}>{t('transactionId')}:</span>
                <span className={styles.value}>{transactionId}</span>
              </div>
            )}
            {amount && currency && (
              <div className={styles.detailRow}>
                <span className={styles.label}>{t('amount')}:</span>
                <span className={styles.value}>
                  {amount} {currency}
                </span>
              </div>
            )}
            {cardBrand && maskedCard && (
              <div className={styles.detailRow}>
                <span className={styles.label}>{t('paymentMethod')}:</span>
                <span className={styles.value}>
                  {cardBrand} •••• {maskedCard.slice(-4)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <Link href={`/${locale}`} className={styles.primaryButton}>
            {t('returnHome')}
          </Link>
          {!isSuccess && (
            <Link href={`/${locale}/booking`} className={styles.secondaryButton}>
              {t('tryAgain')}
            </Link>
          )}
        </div>

        {isSuccess && (
          <div className={styles.confirmationNotice}>
            <p>{t('confirmationEmail')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
