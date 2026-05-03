'use client';

import { useTranslations } from 'next-intl';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';
import styles from './PwaInstallPrompt.module.scss';

export default function PwaInstallPrompt() {
  const t = useTranslations('pwa');
  const {
    isInstalled,
    canInstall,
    hasUpdate,
    dismissedInstallPrompt,
    notificationPermission,
    isSubscribed,
    statusMessage,
    installApp,
    dismissInstallPrompt,
    enableNotifications,
    applyAppUpdate,
    setStatusMessage,
  } = usePwaManager({ persistDismissedInstallPrompt: true });

  const canShowPrompt = !isInstalled && !dismissedInstallPrompt && (canInstall || hasUpdate || !isSubscribed);

  if (!canShowPrompt) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await installApp();
    setStatusMessage(accepted ? t('installAccepted') : t('installDismissed'));
  };

  const handleEnableNotifications = async () => {
    const enabled = await enableNotifications();
    setStatusMessage(enabled ? t('notificationsEnabled') : t('notificationsDenied'));
  };

  return (
    <aside className={styles.prompt} aria-live="polite">
      <h2 className={styles.title}>{t('title')}</h2>
      <p className={styles.description}>{t('description')}</p>
      <div className={styles.actions}>
        {canInstall ? (
          <button type="button" onClick={handleInstall} className={`${styles.button} ${styles.primary}`}>
            {t('installButton')}
          </button>
        ) : null}

        {hasUpdate ? (
          <button type="button" onClick={applyAppUpdate} className={`${styles.button} ${styles.primary}`}>
            {t('updateButton')}
          </button>
        ) : null}

        {notificationPermission !== 'granted' || !isSubscribed ? (
          <button type="button" onClick={handleEnableNotifications} className={`${styles.button} ${styles.secondary}`}>
            {t('enableNotifications')}
          </button>
        ) : null}

        <button type="button" onClick={dismissInstallPrompt} className={`${styles.button} ${styles.secondary}`}>
          {t('dismissButton')}
        </button>
      </div>
      {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
    </aside>
  );
}
