'use client';

import { useTranslations } from 'next-intl';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';
import styles from './PwaSettingsPanel.module.scss';

export default function PwaSettingsPanel() {
  const t = useTranslations('pwaSettings');
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

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>{t('installCardTitle')}</h2>
          <p className={styles.meta}>{isInstalled ? t('installed') : t('notInstalled')}</p>
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
          <p className={styles.meta}>{t('permission')}: {notificationPermission}</p>
          <p className={styles.meta}>{t('subscription')}: {isSubscribed ? t('subscribed') : t('notSubscribed')}</p>
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
          <p className={styles.meta}>{t('appVersion')}: {appVersion}</p>
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
