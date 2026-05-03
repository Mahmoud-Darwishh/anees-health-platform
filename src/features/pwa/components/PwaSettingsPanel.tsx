'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';
import styles from './PwaSettingsPanel.module.scss';

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

function isSecureContextForPwa(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return window.location.protocol === 'https:' || host === 'localhost' || host === '127.0.0.1';
}

export default function PwaSettingsPanel() {
  const t = useTranslations('pwaSettings');
  const [isIos] = useState<boolean>(() => detectIos());
  const [isSafari] = useState<boolean>(() => detectSafari());
  const [isSecure] = useState<boolean>(() => isSecureContextForPwa());

  const {
    isSupported,
    isInstalled,
    canInstall,
    hasUpdate,
    notificationPermission,
    isSubscribed,
    statusMessage,
    appVersion,
    installApp,
    enableNotifications,
    disableNotifications,
    applyAppUpdate,
    clearCaches,
    refreshStatus,
    setStatusMessage,
  } = usePwaManager();

  const onInstall = async () => {
    const accepted = await installApp();
    setStatusMessage(accepted ? t('installAccepted') : t('installDismissed'));
  };

  const onEnableNotifications = async () => {
    const enabled = await enableNotifications();
    setStatusMessage(enabled ? t('notificationsEnabled') : t('notificationsNotEnabled'));
  };

  const onDisableNotifications = async () => {
    const disabled = await disableNotifications();
    setStatusMessage(disabled ? t('notificationsDisabled') : t('notificationsDisableFailed'));
  };

  const onClearCaches = async () => {
    const cleared = await clearCaches();
    setStatusMessage(cleared ? t('cacheCleared') : t('cacheClearFailed'));
  };

  const readinessChecks = useMemo(
    () => [
      { label: t('checkSecureContext'), ready: isSecure },
      { label: t('checkPwaSupport'), ready: isSupported },
      { label: t('checkInstalled'), ready: isInstalled },
      { label: t('checkNotifications'), ready: notificationPermission === 'granted' && isSubscribed },
      { label: t('checkUpdate'), ready: !hasUpdate },
    ],
    [hasUpdate, isInstalled, isSecure, isSubscribed, isSupported, notificationPermission, t]
  );

  const readyCount = readinessChecks.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / readinessChecks.length) * 100);

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/img/fav.png" alt="" width={44} height={44} className={styles.appIcon} />
          <div>
            <h1 className={styles.title}>{t('title')}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>
        </div>
        <div className={styles.progressWrap} aria-label={t('readinessTitle')}>
          <div className={styles.progressTop}>
            <span className={styles.progressLabel}>{t('readyToDeploy')}</span>
            <strong className={styles.progressValue}>{readinessPercent}%</strong>
          </div>
          <div className={styles.progressTrack}>
            <span className={styles.progressFill} style={{ width: `${readinessPercent}%` }} />
          </div>
        </div>
      </header>

      <article className={`${styles.card} ${styles.readinessCard}`}>
        <h2 className={styles.cardTitle}>{t('readinessTitle')}</h2>
        <ul className={styles.checks}>
          {readinessChecks.map((item) => (
            <li key={item.label} className={styles.checkItem}>
              <span className={item.ready ? styles.checkOn : styles.checkOff}>{item.ready ? 'OK' : 'TODO'}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </article>

      {isIos ? (
        <article className={`${styles.card} ${styles.iosCard}`}>
          <h2 className={styles.cardTitle}>{t('iosCardTitle')}</h2>
          <p className={styles.meta}>{isSafari ? t('iosInstallHint') : t('iosOpenSafariHint')}</p>
        </article>
      ) : null}

      <div className={styles.grid}>
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>{t('installCardTitle')}</h2>
          <p className={styles.meta}>{isInstalled ? t('installed') : t('notInstalled')}</p>
          <span className={`${styles.badge} ${isInstalled ? styles.badgeGood : styles.badgeMuted}`}>
            {isInstalled ? t('stateActive') : t('statePending')}
          </span>
          <div className={styles.actions}>
            {canInstall ? (
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onInstall}>
                {t('installButton')}
              </button>
            ) : null}
            <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={refreshStatus}>
              {t('refreshButton')}
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>{t('notificationsCardTitle')}</h2>
          <p className={styles.meta}>
            {t('permission')}: <strong>{notificationPermission}</strong>
          </p>
          <p className={styles.meta}>
            {t('subscription')}: <strong>{isSubscribed ? t('subscribed') : t('notSubscribed')}</strong>
          </p>
          <span
            className={`${styles.badge} ${
              notificationPermission === 'granted' && isSubscribed ? styles.badgeGood : styles.badgeMuted
            }`}
          >
            {notificationPermission === 'granted' && isSubscribed ? t('stateActive') : t('statePending')}
          </span>
          <div className={styles.actions}>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onEnableNotifications}>
              {t('enableNotifications')}
            </button>
            <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onDisableNotifications}>
              {t('disableNotifications')}
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>{t('updatesCardTitle')}</h2>
          <p className={styles.meta}>{hasUpdate ? t('updateReady') : t('upToDate')}</p>
          <span className={`${styles.badge} ${hasUpdate ? styles.badgeWarn : styles.badgeGood}`}>
            {hasUpdate ? t('stateActionNeeded') : t('stateActive')}
          </span>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={applyAppUpdate}
              disabled={!hasUpdate}
            >
              {t('applyUpdateButton')}
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>{t('storageCardTitle')}</h2>
          <p className={styles.meta}>
            {t('appVersion')}: <strong>{appVersion}</strong>
          </p>
          <p className={styles.meta}>{isSupported ? t('pwaSupported') : t('pwaNotSupported')}</p>
          <div className={styles.actions}>
            <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onClearCaches}>
              {t('clearCacheButton')}
            </button>
          </div>
        </article>
      </div>

      {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
    </section>
  );
}
