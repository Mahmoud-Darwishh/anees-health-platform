'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.scss';

export default function LinkAccountForm() {
  const t = useTranslations('auth.linkAccount');
  const locale = useLocale();
  const router = useRouter();
  const { update } = useSession();

  const [caseId, setCaseId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const res = await fetch('/api/auth/patient/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId.trim(), phone: phone.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || t('error'));
      return;
    }

    setSuccess(t('success'));
    // Refresh the session so patientId is updated in the JWT
    await update();
    setTimeout(() => router.push(`/${locale}/portal`), 1200);
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

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="caseId">{t('caseIdLabel')}</label>
              <input
                id="caseId"
                type="text"
                placeholder={t('caseIdPlaceholder')}
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="phone">{t('phoneLabel')}</label>
              <input
                id="phone"
                type="tel"
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {error && <p className={styles.globalError}>{error}</p>}
            {success && <p className={styles.globalSuccess}>{success}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          <p className={styles.footer}>
            <Link href={`/${locale}/portal`}>{t('skip')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
