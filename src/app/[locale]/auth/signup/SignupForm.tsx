'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.scss';

export default function SignupForm() {
  const t = useTranslations('auth.signup');
  const tLogin = useTranslations('auth.login');
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [caseId, setCaseId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/patient/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), caseId: caseId.trim(), password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || t('error'));
      return;
    }

    setSuccess(t('success'));
    setTimeout(() => router.push(`/${locale}/auth/login`), 1500);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: `/${locale}/auth/link-account` });
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
          <p>{t('subtitle')}</p>
        </div>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          <Image src="/assets/img/google-icon.svg" alt="" width={20} height={20} />
          {googleLoading ? '...' : t('googleOption')}
        </button>

        <div className={styles.divider}>
          <span>{tLogin('orDivider')}</span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="name">{t('nameLabel')}</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              dir="auto"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="phone">{t('phoneLabel')}</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="caseId">{t('caseIdLabel')}</label>
            <input
              id="caseId"
              type="text"
              autoComplete="off"
              placeholder={t('caseIdPlaceholder')}
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              required
              dir="ltr"
            />
            <span className={styles.hint}>{t('caseIdHint')}</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t('confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.globalError}>{error}</p>}
          {success && <p className={styles.globalSuccess}>{success}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? t('submitting') : t('submit')}
          </button>
        </form>

        <p className={styles.footer}>
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/auth/login`}>{t('loginLink')}</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
