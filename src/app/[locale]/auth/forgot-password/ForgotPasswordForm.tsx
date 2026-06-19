'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.scss';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password-rules';

export default function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), purpose: 'password-reset' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('genericError'));
        return;
      }
      setInfo(t('otpSent'));
      setStep('reset');
    } catch {
      setError(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordHint'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/patient/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim(), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t('genericError'));
        return;
      }
      setInfo(t('success'));
      setTimeout(() => router.push(`/${locale}/auth/login`), 1500);
    } catch {
      setError(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardAccent} />
        <div className={styles.cardBody}>
          <div className={styles.logo}>
            <Image src="/assets/img/footer-logo.png" alt="Anees Health" width={140} height={48} />
          </div>

          <div className={styles.heading}>
            <h1>{t('title')}</h1>
            <p>{step === 'phone' ? t('subtitle') : t('subtitleReset')}</p>
          </div>

          {step === 'phone' ? (
            <form className={styles.form} onSubmit={handleSendCode} noValidate>
              <div className={styles.field}>
                <label htmlFor="phone">{t('phoneLabel')}</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              {error && <p className={styles.globalError}>{error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? t('sending') : t('sendCode')}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleReset} noValidate>
              {info && <p className={styles.globalSuccess}>{info}</p>}
              <div className={styles.field}>
                <label htmlFor="code">{t('codeLabel')}</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={t('codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="newPassword">{t('newPasswordLabel')}</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className={styles.hint}>{t('passwordHint')}</span>
              </div>
              {error && <p className={styles.globalError}>{error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? t('resetting') : t('resetButton')}
              </button>
            </form>
          )}

          <p className={styles.footer}>
            <Link href={`/${locale}/auth/login`}>{t('backToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
