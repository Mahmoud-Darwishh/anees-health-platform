'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import styles from './whatsapp-otp-test.module.scss';

type StatusState = {
  tone: 'success' | 'error';
  message: string;
};

type SendOtpSuccess = {
  success: true;
  recipient: string;
  expiresInSeconds: number;
};

type VerifyOtpSuccess = {
  success: true;
};

function isSendOtpSuccess(data: unknown): data is SendOtpSuccess {
  if (!data || typeof data !== 'object') return false;

  const candidate = data as {
    success?: unknown;
    recipient?: unknown;
    expiresInSeconds?: unknown;
  };

  return (
    candidate.success === true
    && typeof candidate.recipient === 'string'
    && typeof candidate.expiresInSeconds === 'number'
  );
}

function isVerifyOtpSuccess(data: unknown): data is VerifyOtpSuccess {
  if (!data || typeof data !== 'object') return false;
  return (data as { success?: unknown }).success === true;
}

function extractError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const value = (data as { error?: unknown }).error;
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export default function WhatsAppOtpTestForm() {
  const t = useTranslations('auth.whatsappOtpTest');
  const locale = useLocale();

  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('site-test');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<StatusState | null>(null);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!phone.trim()) {
      setStatus({ tone: 'error', message: t('errors.phoneRequired') });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const response = await fetch('/api/auth/otp/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose }),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok || !isSendOtpSuccess(data)) {
        throw new Error(extractError(data, t('errors.sendFailed')));
      }

      setOtpSent(true);
      setCode('');
      setStatus({
        tone: 'success',
        message: t('messages.otpSent', {
          recipient: data.recipient,
          expiresInSeconds: data.expiresInSeconds,
        }),
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : t('errors.sendFailed'),
      });
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim()) {
      setStatus({ tone: 'error', message: t('errors.codeRequired') });
      return;
    }

    setVerifying(true);
    setStatus(null);

    try {
      const response = await fetch('/api/auth/otp/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok || !isVerifyOtpSuccess(data)) {
        throw new Error(extractError(data, t('errors.verifyFailed')));
      }

      setStatus({ tone: 'success', message: t('messages.otpVerified') });
      setOtpSent(false);
      setCode('');
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : t('errors.verifyFailed'),
      });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardAccent} />

        <div className={styles.cardBody}>
          <div className={styles.heading}>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>

          <p className={styles.instructions}>{t('instructions')}</p>

          <form className={styles.form} onSubmit={handleSend} noValidate>
            <div className={styles.field}>
              <label htmlFor="wa-phone">{t('phoneLabel')}</label>
              <input
                id="wa-phone"
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('phonePlaceholder')}
                autoComplete="tel"
                dir="auto"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="wa-purpose">{t('purposeLabel')}</label>
              <input
                id="wa-purpose"
                type="text"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder={t('purposePlaceholder')}
                autoComplete="off"
              />
            </div>

            <button type="submit" className={styles.primaryButton} disabled={sending}>
              {sending ? t('sendSubmitting') : t('sendButton')}
            </button>
          </form>

          <form className={styles.form} onSubmit={handleVerify} noValidate>
            <div className={styles.field}>
              <label htmlFor="wa-code">{t('codeLabel')}</label>
              <input
                id="wa-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('codePlaceholder')}
                autoComplete="one-time-code"
                dir="auto"
                required
              />
            </div>

            <p className={styles.verifyHint}>{t('verifyHint')}</p>

            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={verifying || !otpSent}
            >
              {verifying ? t('verifySubmitting') : t('verifyButton')}
            </button>
          </form>

          {status ? (
            <p className={status.tone === 'error' ? styles.globalError : styles.globalSuccess}>
              {status.message}
            </p>
          ) : null}

          <p className={styles.footer}>
            <Link href={`/${locale}/auth/login`}>{t('backToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
