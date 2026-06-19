'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import PaymentGateway from './payment-gateway';
import InstaPayPanel from './instapay-panel';
import styles from './payment-method.module.scss';

interface PaymentMethodChooserProps {
  orderId: string;
  amount: string;
  currency: string;
  customerName?: string;
  customerPhone?: string;
  locale: string;
  instapayHandle: string;
  instapayUrl: string;
}

type Method = 'card' | 'instapay' | null;

export default function PaymentMethodChooser(props: PaymentMethodChooserProps) {
  const t = useTranslations('payment');
  const [method, setMethod] = useState<Method>(null);

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <h1>{t('method.title')}</h1>
        <p>{t('method.subtitle')}</p>
      </div>

      <div className={styles.choices} role="radiogroup" aria-label={t('method.title')}>
        <button
          type="button"
          role="radio"
          aria-checked={method === 'card'}
          className={`${styles.choice} ${method === 'card' ? styles.active : ''}`}
          onClick={() => setMethod('card')}
        >
          <span className={styles.choiceIcon} aria-hidden>💳</span>
          <span className={styles.choiceBody}>
            <span className={styles.choiceTitle}>{t('method.card')}</span>
            <span className={styles.choiceHint}>{t('method.cardHint')}</span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={method === 'instapay'}
          className={`${styles.choice} ${method === 'instapay' ? styles.active : ''}`}
          onClick={() => setMethod('instapay')}
        >
          <span className={styles.choiceIcon} aria-hidden>🏦</span>
          <span className={styles.choiceBody}>
            <span className={styles.choiceTitle}>{t('method.instapay')}</span>
            <span className={styles.choiceHint}>{t('method.instapayHint')}</span>
          </span>
        </button>
      </div>

      {method === 'card' ? (
        <PaymentGateway
          orderId={props.orderId}
          amount={props.amount}
          currency={props.currency}
          customerName={props.customerName}
          customerPhone={props.customerPhone}
          locale={props.locale}
        />
      ) : null}

      {method === 'instapay' ? (
        <InstaPayPanel
          orderId={props.orderId}
          amount={props.amount}
          currency={props.currency}
          instapayHandle={props.instapayHandle}
          instapayUrl={props.instapayUrl}
        />
      ) : null}
    </div>
  );
}
