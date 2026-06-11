'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../auth.module.scss';

export default function LoginForm() {
  const t = useTranslations('auth.login');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = rawCallbackUrl?.startsWith('/') ? rawCallbackUrl : null;
  const patientDefaultUrl = `/${locale}/portal`;
  // Staff land on the `/admin` dispatcher, which forwards each role to its own
  // home section. Never hardcode a single workspace here — it caused redirect
  // bounces (and wrong landings) for non-physio roles.
  const staffDefaultUrl = '/admin';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmed = identifier.trim();
    // An email identifier is a staff login; phone / case-id is a patient login.
    const isStaff = trimmed.includes('@');

    const result = isStaff
      ? await signIn('staff-credentials', { email: trimmed, password, redirect: false })
      : await signIn('patient-credentials', { identifier: trimmed, password, redirect: false });

    setLoading(false);

    if (result?.error) {
      setError(t('invalidCredentials'));
      return;
    }

    const destination = safeCallbackUrl ?? (isStaff ? staffDefaultUrl : patientDefaultUrl);
    router.push(destination);
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: safeCallbackUrl ?? patientDefaultUrl });
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
            {googleLoading ? '...' : t('google')}
          </button>

          <div className={styles.divider}>
            <span>{t('orDivider')}</span>
          </div>

          <form className={styles.form} onSubmit={handleCredentials} noValidate>
            <div className={styles.field}>
              <label htmlFor="identifier">{t('identifierLabel')}</label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder={t('identifierPlaceholder')}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                dir="auto"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">{t('passwordLabel')}</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.forgotRow}>
              <Link href={`/${locale}/auth/forgot-password`}>{t('forgotPassword')}</Link>
            </div>

            {error && <p className={styles.globalError}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          <p className={styles.footer}>
            {t('noAccount')}{' '}
            <Link href={`/${locale}/auth/signup`}>{t('signupLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
