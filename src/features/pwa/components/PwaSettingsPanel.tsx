'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, StatusPill, Toast } from '@/components/ui';
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
  const [hasHydrated, setHasHydrated] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => setHasHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isIos = hasHydrated ? detectIos() : false;
  const isSafari = hasHydrated ? detectSafari() : false;
  const isSecure = hasHydrated ? isSecureContextForPwa() : false;
  const displayedIsSupported = hasHydrated && isSupported;
  const displayedIsInstalled = hasHydrated && isInstalled;
  const displayedCanInstall = hasHydrated && canInstall;
  const displayedHasUpdate = hasHydrated && hasUpdate;
  const displayedNotificationPermission = hasHydrated ? notificationPermission : 'default';
  const displayedIsSubscribed = hasHydrated && isSubscribed;

  const onInstall = async () => {
    const accepted = await installApp();
    setStatusMessage(accepted ? t('installAccepted') : t('installDismissed'));
  };

  const onEnableNotifications = async () => {
    const enabled = await enableNotifications();
    if (enabled) {
      setStatusMessage(t('notificationsEnabled'));
    }
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
      { label: t('checkPwaSupport'), ready: displayedIsSupported },
      { label: t('checkInstalled'), ready: displayedIsInstalled },
      {
        label: t('checkNotifications'),
        ready: displayedNotificationPermission === 'granted' && displayedIsSubscribed,
      },
      { label: t('checkUpdate'), ready: !displayedHasUpdate },
    ],
    [
      displayedHasUpdate,
      displayedIsInstalled,
      displayedIsSubscribed,
      displayedIsSupported,
      displayedNotificationPermission,
      isSecure,
      t,
    ]
  );

  const readyCount = readinessChecks.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / readinessChecks.length) * 100);
  const notificationsReady = displayedNotificationPermission === 'granted' && displayedIsSubscribed;
  const notificationsBlocked = displayedNotificationPermission === 'denied';
  const needsInstalledIosApp = isIos && !displayedIsInstalled;
  const quickAlertDisabled = notificationsReady || notificationsBlocked || needsInstalledIosApp || !displayedIsSupported;
  const quickAlertHelp = notificationsReady
    ? t('quickAlertsReady')
    : notificationsBlocked
      ? t('quickAlertsBlocked')
      : needsInstalledIosApp
        ? t('quickAlertsInstallFirst')
        : t('quickAlertsHelp');

  return (
    <section className={styles.wrapper}>
      <Card experience="mobile" className={styles.header}>
        <div className={styles.brandRow}>
          <Image src="/assets/img/fav.png" alt="" width={44} height={44} className={styles.appIcon} />
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
      </Card>

      <Card
        experience="mobile"
        title={t('quickAlertsTitle')}
        description={quickAlertHelp}
        className={styles.quickAlertsCard}
        footer={
          <div className={styles.actions}>
            <Button type="button" experience="mobile" onClick={onEnableNotifications} disabled={quickAlertDisabled}>
              {notificationsReady ? t('stateActive') : t('enableNotifications')}
            </Button>
            <Button type="button" variant="outline" experience="mobile" onClick={refreshStatus}>
              {t('refreshButton')}
            </Button>
          </div>
        }
      >
        <StatusPill tone={notificationsReady ? 'success' : notificationsBlocked ? 'danger' : 'warning'} withDot={false}>
          {notificationsReady ? t('stateActive') : notificationsBlocked ? t('stateActionNeeded') : t('statePending')}
        </StatusPill>
      </Card>

      <Card experience="mobile" title={t('readinessTitle')} className={styles.readinessCard}>
        <ul className={styles.checks}>
          {readinessChecks.map((item) => (
            <li key={item.label} className={styles.checkItem}>
              <StatusPill tone={item.ready ? 'success' : 'warning'} withDot={false}>
                {item.ready ? 'OK' : 'TODO'}
              </StatusPill>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      {isIos ? (
        <Card experience="mobile" title={t('iosCardTitle')} className={styles.iosCard}>
          <p className={styles.meta}>{isSafari ? t('iosInstallHint') : t('iosOpenSafariHint')}</p>
        </Card>
      ) : null}

      <div className={styles.grid}>
        <Card
          experience="mobile"
          title={t('installCardTitle')}
          footer={
            <div className={styles.actions}>
              {displayedCanInstall ? (
                <Button type="button" experience="mobile" onClick={onInstall}>
                  {t('installButton')}
                </Button>
              ) : null}
              <Button type="button" variant="outline" experience="mobile" onClick={refreshStatus}>
                {t('refreshButton')}
              </Button>
            </div>
          }
        >
          <p className={styles.meta}>{displayedIsInstalled ? t('installed') : t('notInstalled')}</p>
          <StatusPill tone={displayedIsInstalled ? 'success' : 'neutral'} withDot={false}>
            {displayedIsInstalled ? t('stateActive') : t('statePending')}
          </StatusPill>
        </Card>

        <Card
          experience="mobile"
          title={t('notificationsCardTitle')}
          footer={
            <div className={styles.actions}>
              <Button type="button" experience="mobile" onClick={onEnableNotifications}>
                {t('enableNotifications')}
              </Button>
              <Button type="button" variant="outline" experience="mobile" onClick={onDisableNotifications}>
                {t('disableNotifications')}
              </Button>
            </div>
          }
        >
          <p className={styles.meta}>
            {t('permission')}: <strong>{displayedNotificationPermission}</strong>
          </p>
          <p className={styles.meta}>
            {t('subscription')}: <strong>{displayedIsSubscribed ? t('subscribed') : t('notSubscribed')}</strong>
          </p>
          <StatusPill tone={notificationsReady ? 'success' : 'neutral'} withDot={false}>
            {notificationsReady ? t('stateActive') : t('statePending')}
          </StatusPill>
        </Card>

        <Card
          experience="mobile"
          title={t('updatesCardTitle')}
          footer={
            <div className={styles.actions}>
              <Button type="button" experience="mobile" onClick={applyAppUpdate} disabled={!displayedHasUpdate}>
                {t('applyUpdateButton')}
              </Button>
            </div>
          }
        >
          <p className={styles.meta}>{displayedHasUpdate ? t('updateReady') : t('upToDate')}</p>
          <StatusPill tone={displayedHasUpdate ? 'warning' : 'success'} withDot={false}>
            {displayedHasUpdate ? t('stateActionNeeded') : t('stateActive')}
          </StatusPill>
        </Card>

        <Card
          experience="mobile"
          title={t('storageCardTitle')}
          footer={
            <div className={styles.actions}>
              <Button type="button" variant="outline" experience="mobile" onClick={onClearCaches}>
                {t('clearCacheButton')}
              </Button>
            </div>
          }
        >
          <p className={styles.meta}>
            {t('appVersion')}: <strong>{appVersion}</strong>
          </p>
          <p className={styles.meta}>{displayedIsSupported ? t('pwaSupported') : t('pwaNotSupported')}</p>
        </Card>
      </div>

      {statusMessage ? <Toast experience="mobile" tone="info" description={statusMessage} /> : null}
    </section>
  );
}
