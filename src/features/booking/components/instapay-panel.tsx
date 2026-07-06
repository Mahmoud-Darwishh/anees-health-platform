'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, ButtonLink, Input, Toast } from '@/components/ui';
import styles from './payment-method.module.scss';

interface InstaPayPanelProps {
  orderId: string;
  amount: string;
  currency: string;
  instapayHandle: string;
  instapayUrl: string;
}

export default function InstaPayPanel({ orderId, amount, currency, instapayHandle, instapayUrl }: InstaPayPanelProps) {
  const t = useTranslations('payment');
  const [reference, setReference] = useState('');
  const [senderName, setSenderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings/payment/instapay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: orderId, reference: reference.trim(), senderName: senderName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || t('instapay.error'));
        return;
      }
      setDone(true);
    } catch {
      setError(t('instapay.error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={styles.panel}>
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden>⏳</div>
          <h2>{t('instapay.successTitle')}</h2>
          <p>{t('instapay.successBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.amount}>{amount} {currency}</p>

      <div className={styles.handleBox}>
        <span className={styles.handleLabel}>{t('instapay.sendTo')}</span>
        <span className={styles.handleValue} dir="ltr">{instapayHandle}</span>
      </div>

      {instapayUrl ? (
        <ButtonLink
          href={instapayUrl}
          target="_blank"
          rel="noopener noreferrer"
          experience="mobile"
          className={styles.submit}
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: '1rem' }}
        >
          {t('instapay.openApp')}
        </ButtonLink>
      ) : null}

      <ol className={styles.steps}>
        <li>{t('instapay.step1')}</li>
        <li>{t('instapay.step2')}</li>
        <li>{t('instapay.step3')}</li>
      </ol>

      <form onSubmit={handleSubmit}>
        <Input
          id="instapay-reference"
          type="text"
          label={t('instapay.referenceLabel')}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={t('instapay.referencePlaceholder')}
          dir="ltr"
          experience="mobile"
          className={styles.field}
        />
        <Input
          id="instapay-sender"
          type="text"
          label={t('instapay.senderLabel')}
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          dir="auto"
          experience="mobile"
          className={styles.field}
        />

        {error ? <Toast experience="mobile" tone="danger" description={error} className={styles.error} /> : null}

        <Button type="submit" experience="mobile" className={styles.submit} disabled={submitting} loading={submitting}>
          {submitting ? t('instapay.submitting') : t('instapay.submit')}
        </Button>
      </form>
    </div>
  );
}
