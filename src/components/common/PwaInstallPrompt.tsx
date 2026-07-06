'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';
import styles from './PwaInstallPrompt.module.scss';

const DISMISS_KEY = 'anees-pwa-dismissed-at';
const NOTIFICATION_DISMISS_KEY = 'anees-pwa-notifications-dismissed-at';
const DISMISS_DAYS = 7;

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIphoneIpad = /iphone|ipad|ipod/i.test(ua);
  const isMacWithTouch = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIphoneIpad || isMacWithTouch;
}

function detectSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|crios|fxios|edgios/i.test(ua);
}

function wasDismissedRecently(key: string): boolean {
  if (typeof window === 'undefined') return false;
  const val = window.localStorage.getItem(key);
  if (!val) return false;
  const ts = parseInt(val, 10);
  if (isNaN(ts)) return false;
  return (Date.now() - ts) / 86_400_000 < DISMISS_DAYS;
}

function ShareIcon() {
  return (
    <svg
      className={styles.shareIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export default function PwaInstallPrompt() {
  const t = useTranslations('pwa');
  const [visible, setVisible] = useState(false);
  const [showNotificationStep, setShowNotificationStep] = useState(false);
  const [isIos] = useState<boolean>(() => detectIos());
  const [isSafari] = useState<boolean>(() => detectSafari());

  const {
    isInstalled,
    canInstall,
    hasUpdate,
    notificationPermission,
    isSubscribed,
    statusMessage,
    installApp,
    enableNotifications,
    applyAppUpdate,
    setStatusMessage,
  } = usePwaManager();

  const shouldOfferNotifications = (isInstalled || showNotificationStep) && notificationPermission === 'default' && !isSubscribed;

  // Auto-show after 2.5 s once conditions are ready
  useEffect(() => {
    const shouldShowNotifications = shouldOfferNotifications && !wasDismissedRecently(NOTIFICATION_DISMISS_KEY);
    const shouldShowInstall = !isInstalled && !wasDismissedRecently(DISMISS_KEY) && (isIos || canInstall);
    const shouldShow = hasUpdate || shouldShowNotifications || shouldShowInstall;
    if (!shouldShow) return;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [isInstalled, canInstall, hasUpdate, isIos, shouldOfferNotifications]);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      const dismissKey = shouldOfferNotifications && !hasUpdate ? NOTIFICATION_DISMISS_KEY : DISMISS_KEY;
      window.localStorage.setItem(dismissKey, String(Date.now()));
    }
  };

  const handleInstall = async () => {
    const accepted = await installApp();
    setStatusMessage(accepted ? t('installAccepted') : t('installDismissed'));
    if (accepted) {
      setShowNotificationStep(true);
      setVisible(true);
    }
  };

  const handleUpdate = () => {
    applyAppUpdate();
    setVisible(false);
  };

  const handleEnableNotifications = async () => {
    const enabled = await enableNotifications();
    if (enabled) {
      setStatusMessage(t('notificationsEnabled'));
      setShowNotificationStep(false);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('title')}>
      <div className={styles.modal}>
        {/* Close / dismiss */}
        <button type="button" onClick={dismiss} className={styles.closeBtn} aria-label={t('dismissButton')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* App icon */}
        <div className={styles.iconWrap}>
          <Image src="/assets/img/pwa-icon-192.png" alt="Anees Health" width={80} height={80} className={styles.appIcon} />
        </div>

        {hasUpdate ? (
          /* ── Update available ── */
          <>
            <h2 className={styles.modalTitle}>{t('updateButton')}</h2>
            <p className={styles.modalDesc}>{t('description')}</p>
            <Button
              type="button"
              onClick={handleUpdate}
              experience="mobile"
              variant="success"
              fullWidth
              className={`${styles.installBtn} ${styles.update}`}
            >
              {t('updateButton')}
            </Button>
          </>
        ) : shouldOfferNotifications ? (
          <>
            <h2 className={styles.modalTitle}>{t('notificationPromptTitle')}</h2>
            <p className={styles.modalDesc}>{t('notificationPromptDescription')}</p>
            <Button type="button" onClick={handleEnableNotifications} experience="mobile" fullWidth className={styles.installBtn}>
              {t('notificationPromptButton')}
            </Button>
          </>
        ) : isIos ? (
          /* ── iOS: show visual guide (Apple has no programmatic install API) ── */
          <>
            <h2 className={styles.modalTitle}>{t('iosHintTitle')}</h2>
            <p className={styles.modalDesc}>{t('iosHintSubtitle')}</p>
            {!isSafari ? (
              <p className={styles.iosNote}>{t('iosUseSafari')}</p>
            ) : (
              <ol className={styles.steps} aria-label="Installation steps">
                <li className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">1</span>
                  <span>{t('iosStep1')} <ShareIcon /></span>
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">2</span>
                  <span>{t('iosStep2')}</span>
                </li>
                <li className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">3</span>
                  <span>{t('iosStep3')}</span>
                </li>
              </ol>
            )}
          </>
        ) : canInstall ? (
          /* ── Android / Desktop: one-tap native install ── */
          <>
            <h2 className={styles.modalTitle}>{t('title')}</h2>
            <p className={styles.modalDesc}>{t('description')}</p>
            <Button type="button" onClick={handleInstall} experience="mobile" fullWidth className={styles.installBtn}>
              {t('installAndAlertsButton')}
            </Button>
          </>
        ) : null}

        {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}

        <button type="button" onClick={dismiss} className={styles.notNowBtn}>
          {t('dismissButton')}
        </button>
      </div>
    </div>
  );
}
