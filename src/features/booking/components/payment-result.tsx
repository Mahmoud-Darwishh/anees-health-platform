'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './payment-result.module.scss';

interface PaymentResultProps {
  status?: string;
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
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const isSuccess = status === 'SUCCESS';

  return (
    <section className={styles.resultPage} dir={dir}>
      <div className={styles.container}>
        <div className={`${styles.resultCard} ${isSuccess ? styles.success : styles.failure}`}>
          {/* Status Icon */}
          <div className={styles.iconWrapper}>
            {isSuccess ? (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>

          {/* Status Title */}
          <h1 className={styles.title}>
            {isSuccess ? t('result.successTitle') : t('result.failureTitle')}
          </h1>

          <p className={styles.message}>
            {isSuccess ? t('result.successMessage') : t('result.failureMessage')}
          </p>

          {/* Transaction Details */}
          {(orderId || transactionId || amount) && (
            <div className={styles.details}>
              {orderId && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('result.orderId')}</span>
                  <span className={styles.detailValue}>{orderId}</span>
                </div>
              )}
              {transactionId && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('result.transactionId')}</span>
                  <span className={styles.detailValue}>{transactionId}</span>
                </div>
              )}
              {amount && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('result.amount')}</span>
                  <span className={styles.detailValue}>
                    {amount} {currency || 'EGP'}
                  </span>
                </div>
              )}
              {cardBrand && maskedCard && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('result.paymentMethod')}</span>
                  <span className={styles.detailValue}>
                    {cardBrand} {maskedCard}
                  </span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('result.status')}</span>
                <span className={`${styles.detailValue} ${isSuccess ? styles.statusSuccess : styles.statusFailed}`}>
                  {isSuccess ? t('result.paid') : t('result.failed')}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            {isSuccess ? (
              <Link href={`/${locale}`} className={styles.primaryButton}>
                {t('result.backToHome')}
              </Link>
            ) : (
              <>
                <Link href={`/${locale}/booking`} className={styles.primaryButton}>
                  {t('result.tryAgain')}
                </Link>
                <Link href={`/${locale}/contact`} className={styles.secondaryButton}>
                  {t('result.contactSupport')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
