'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import LucideIcon from '@/components/common/LucideIcon';
import { Badge, Button, Card, StatusPill, Toast } from '@/components/ui';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';
import styles from './PwaSettingsPanel.module.scss';

type UiLocale = 'en' | 'ar';

type PwaPageCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  deviceNote: string;
  setupTitle: string;
  setupReady: string;
  setupBlocked: string;
  setupInstallFirst: string;
  setupUnsupported: string;
  setupInsecure: string;
  setupDefault: string;
  installGuideTitle: string;
  installGuideSafari: string;
  installGuideOther: string;
  androidInstallGuide: string;
  howTitle: string;
  howItems: string[];
  diagnosticsTitle: string;
  managementTitle: string;
  permissionLabel: string;
  subscriptionLabel: string;
  installedLabel: string;
  browserLabel: string;
  secureLabel: string;
  versionHelp: string;
  clearHelp: string;
  openFromHome: string;
  enabled: string;
  disabled: string;
  available: string;
  unavailable: string;
  installed: string;
  notInstalled: string;
  subscribed: string;
  notSubscribed: string;
};

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

const copy = {
  en: {
    eyebrow: 'App and alerts',
    title: 'Enable Anees on this device',
    subtitle:
      'One controlled setup page for install status, push permission, and the saved browser subscription.',
    deviceNote:
      'Web push is device-based. Repeat this page once on every iPhone, Android phone, tablet, or desktop browser that should receive Anees notifications.',
    setupTitle: 'Notification setup',
    setupReady: 'This device is ready to receive Anees alerts.',
    setupBlocked: 'Notifications are blocked for this browser. Re-enable them from device or browser settings.',
    setupInstallFirst:
      'On iPhone, open Anees from the Home Screen app icon first. Safari tabs cannot complete the installed-app notification flow.',
    setupUnsupported: 'This browser cannot receive Anees web push notifications.',
    setupInsecure: 'Open Anees over HTTPS before enabling notifications on this device.',
    setupDefault:
      'Tap once to allow notifications and save this device. After that, admin marketing and care alerts can reach this device.',
    installGuideTitle: 'iPhone install guide',
    installGuideSafari: 'In Safari, tap Share, choose Add to Home Screen, then open Anees from the new icon.',
    installGuideOther: 'Open this page in Safari first, then add Anees to your Home Screen.',
    androidInstallGuide:
      'On Android or desktop, use the install button when it appears, or choose Install app from the browser menu.',
    howTitle: 'How subscription works',
    howItems: [
      'The browser asks for permission only after your tap.',
      'Anees saves this browser subscription securely.',
      'Admin messages are sent to active saved subscriptions.',
      'If a user changes phone or browser, they should open this page again.',
    ],
    diagnosticsTitle: 'Device diagnostics',
    managementTitle: 'Maintenance',
    permissionLabel: 'Permission',
    subscriptionLabel: 'Subscription',
    installedLabel: 'Install mode',
    browserLabel: 'Browser support',
    secureLabel: 'Secure connection',
    versionHelp: 'Use refresh after installing, changing device settings, or opening the Home Screen app.',
    clearHelp: 'Reset offline assets only when the app looks stale after a release.',
    openFromHome: 'Open from Home Screen',
    enabled: 'Enabled',
    disabled: 'Disabled',
    available: 'Available',
    unavailable: 'Unavailable',
    installed: 'Installed',
    notInstalled: 'Not installed',
    subscribed: 'Subscribed',
    notSubscribed: 'Not subscribed',
  },
  ar: {
    eyebrow: 'التطبيق والتنبيهات',
    title: 'فعّل أنيس على هذا الجهاز',
    subtitle: 'صفحة واحدة للتحكم في التثبيت، إذن الإشعارات، واشتراك هذا المتصفح.',
    deviceNote:
      'إشعارات الويب تعمل لكل جهاز على حدة. افتح هذه الصفحة مرة على كل iPhone أو Android أو كمبيوتر تريد أن يستقبل تنبيهات أنيس.',
    setupTitle: 'إعداد التنبيهات',
    setupReady: 'هذا الجهاز جاهز لاستقبال تنبيهات أنيس.',
    setupBlocked: 'الإشعارات محظورة في هذا المتصفح. أعد تفعيلها من إعدادات الجهاز أو المتصفح.',
    setupInstallFirst:
      'على iPhone افتح أنيس من أيقونة الشاشة الرئيسية أولاً. تبويب Safari لا يكمل مسار إشعارات التطبيق المثبت.',
    setupUnsupported: 'هذا المتصفح لا يدعم إشعارات الويب من أنيس.',
    setupInsecure: 'افتح أنيس عبر HTTPS قبل تفعيل الإشعارات على هذا الجهاز.',
    setupDefault:
      'اضغط مرة واحدة للسماح بالإشعارات وحفظ هذا الجهاز. بعد ذلك يمكن أن تصل تنبيهات الرعاية والرسائل التسويقية لهذا الجهاز.',
    installGuideTitle: 'طريقة التثبيت على iPhone',
    installGuideSafari: 'في Safari اضغط مشاركة، ثم إضافة إلى الشاشة الرئيسية، ثم افتح أنيس من الأيقونة الجديدة.',
    installGuideOther: 'افتح هذه الصفحة في Safari أولاً، ثم أضف أنيس إلى الشاشة الرئيسية.',
    androidInstallGuide: 'على Android أو الكمبيوتر استخدم زر التثبيت عند ظهوره، أو اختر تثبيت التطبيق من قائمة المتصفح.',
    howTitle: 'كيف يعمل الاشتراك',
    howItems: [
      'المتصفح يطلب الإذن فقط بعد ضغط المستخدم.',
      'أنيس يحفظ اشتراك هذا المتصفح بأمان.',
      'رسائل الإدارة ترسل للاشتراكات النشطة المحفوظة.',
      'عند تغيير الهاتف أو المتصفح يجب فتح هذه الصفحة مرة أخرى.',
    ],
    diagnosticsTitle: 'فحوصات الجهاز',
    managementTitle: 'الصيانة',
    permissionLabel: 'الإذن',
    subscriptionLabel: 'الاشتراك',
    installedLabel: 'وضع التثبيت',
    browserLabel: 'دعم المتصفح',
    secureLabel: 'اتصال آمن',
    versionHelp: 'استخدم التحديث بعد التثبيت، تغيير إعدادات الجهاز، أو فتح التطبيق من الشاشة الرئيسية.',
    clearHelp: 'أعد ضبط الملفات دون اتصال فقط إذا ظهر التطبيق بإصدار قديم بعد النشر.',
    openFromHome: 'افتح من الشاشة الرئيسية',
    enabled: 'مفعل',
    disabled: 'غير مفعل',
    available: 'متاح',
    unavailable: 'غير متاح',
    installed: 'مثبت',
    notInstalled: 'غير مثبت',
    subscribed: 'مشترك',
    notSubscribed: 'غير مشترك',
  },
} satisfies Record<UiLocale, PwaPageCopy>;

export default function PwaSettingsPanel() {
  const t = useTranslations('pwaSettings');
  const locale = (useLocale() === 'ar' ? 'ar' : 'en') as UiLocale;
  const text = copy[locale];
  const [hasHydrated, setHasHydrated] = useState(false);
  const [busyAction, setBusyAction] = useState<'install' | 'enable' | 'disable' | 'cache' | null>(null);

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

  const notificationsReady = displayedNotificationPermission === 'granted' && displayedIsSubscribed;
  const notificationsBlocked = displayedNotificationPermission === 'denied';
  const needsInstalledIosApp = isIos && !displayedIsInstalled;
  const canEnableNotifications =
    displayedIsSupported && isSecure && !notificationsReady && !notificationsBlocked && !needsInstalledIosApp;

  const setupDescription = notificationsReady
    ? text.setupReady
    : notificationsBlocked
      ? text.setupBlocked
      : needsInstalledIosApp
        ? text.setupInstallFirst
        : !displayedIsSupported
          ? text.setupUnsupported
          : !isSecure
            ? text.setupInsecure
            : text.setupDefault;

  const readinessChecks = useMemo(
    () => [
      {
        icon: 'fa-lock',
        label: text.secureLabel,
        value: isSecure ? text.enabled : text.disabled,
        ready: isSecure,
      },
      {
        icon: 'fa-bell',
        label: text.browserLabel,
        value: displayedIsSupported ? text.available : text.unavailable,
        ready: displayedIsSupported,
      },
      {
        icon: 'fa-home',
        label: text.installedLabel,
        value: displayedIsInstalled ? text.installed : text.notInstalled,
        ready: displayedIsInstalled,
      },
      {
        icon: 'fa-shield-halved',
        label: text.permissionLabel,
        value: displayedNotificationPermission,
        ready: displayedNotificationPermission === 'granted',
        danger: displayedNotificationPermission === 'denied',
      },
      {
        icon: 'fa-check-circle',
        label: text.subscriptionLabel,
        value: displayedIsSubscribed ? text.subscribed : text.notSubscribed,
        ready: displayedIsSubscribed,
      },
    ],
    [
      displayedIsInstalled,
      displayedIsSubscribed,
      displayedIsSupported,
      displayedNotificationPermission,
      isSecure,
      text,
    ]
  );

  const readyCount = readinessChecks.filter((item) => item.ready).length;
  const readinessPercent = Math.round((readyCount / readinessChecks.length) * 100);
  const notificationTone = notificationsReady ? 'success' : notificationsBlocked ? 'danger' : 'warning';

  const onInstall = async () => {
    setBusyAction('install');
    const accepted = await installApp();
    setBusyAction(null);
    setStatusMessage(accepted ? t('installAccepted') : t('installDismissed'));
    await refreshStatus();
  };

  const onEnableNotifications = async () => {
    setBusyAction('enable');
    const enabled = await enableNotifications();
    setBusyAction(null);
    setStatusMessage(enabled ? t('notificationsEnabled') : t('notificationsNotEnabled'));
    await refreshStatus();
  };

  const onDisableNotifications = async () => {
    setBusyAction('disable');
    const disabled = await disableNotifications();
    setBusyAction(null);
    setStatusMessage(disabled ? t('notificationsDisabled') : t('notificationsDisableFailed'));
    await refreshStatus();
  };

  const onClearCaches = async () => {
    setBusyAction('cache');
    const cleared = await clearCaches();
    setBusyAction(null);
    setStatusMessage(cleared ? t('cacheCleared') : t('cacheClearFailed'));
  };

  return (
    <main className={styles.wrapper}>
      <section className={styles.hero} aria-labelledby="pwa-settings-title">
        <div className={styles.heroIconWrap}>
          <Image
            src="/assets/img/anees-app-icon-192.png"
            alt="Anees Health"
            width={96}
            height={96}
            className={styles.heroIcon}
            priority
          />
        </div>
        <div className={styles.heroText}>
          <Badge tone="brand">{text.eyebrow}</Badge>
          <h1 id="pwa-settings-title" className={styles.title}>
            {text.title}
          </h1>
          <p className={styles.subtitle}>{text.subtitle}</p>
          <p className={styles.deviceNote}>{text.deviceNote}</p>
        </div>
        <div className={styles.heroMeter} aria-label={t('readinessTitle')}>
          <span>{t('readyToDeploy')}</span>
          <strong>{readinessPercent}%</strong>
          <div className={styles.progressTrack}>
            <span className={styles.progressFill} style={{ width: `${readinessPercent}%` }} />
          </div>
        </div>
      </section>

      <section className={styles.mainGrid} aria-label={text.setupTitle}>
        <Card
          experience="mobile"
          className={styles.setupCard}
          eyebrow={text.openFromHome}
          title={text.setupTitle}
          description={setupDescription}
          actions={
            <StatusPill tone={notificationTone} withDot={false}>
              {notificationsReady ? t('stateActive') : notificationsBlocked ? t('stateActionNeeded') : t('statePending')}
            </StatusPill>
          }
          footer={
            <div className={styles.actionGrid}>
              {displayedCanInstall ? (
                <Button
                  type="button"
                  experience="mobile"
                  onClick={onInstall}
                  loading={busyAction === 'install'}
                  leadingIcon={<LucideIcon iconClass="fa-download" />}
                >
                  {t('installButton')}
                </Button>
              ) : null}
              <Button
                type="button"
                experience="mobile"
                onClick={onEnableNotifications}
                disabled={!canEnableNotifications}
                loading={busyAction === 'enable'}
                leadingIcon={<LucideIcon iconClass="fa-bell" />}
              >
                {notificationsReady ? t('stateActive') : t('enableNotifications')}
              </Button>
              {displayedIsSubscribed ? (
                <Button
                  type="button"
                  variant="outline"
                  experience="mobile"
                  onClick={onDisableNotifications}
                  loading={busyAction === 'disable'}
                >
                  {t('disableNotifications')}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" experience="mobile" onClick={refreshStatus}>
                {t('refreshButton')}
              </Button>
            </div>
          }
        >
          <div className={styles.statusStrip}>
            <span>
              {text.permissionLabel}: <strong>{displayedNotificationPermission}</strong>
            </span>
            <span>
              {text.subscriptionLabel}: <strong>{displayedIsSubscribed ? text.subscribed : text.notSubscribed}</strong>
            </span>
          </div>
        </Card>

        <Card experience="mobile" title={text.howTitle} className={styles.howCard}>
          <ol className={styles.steps}>
            {text.howItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </Card>
      </section>

      <section className={styles.grid}>
        <Card
          experience="mobile"
          title={text.diagnosticsTitle}
          className={styles.diagnosticsCard}
          actions={
            <StatusPill tone={readinessPercent === 100 ? 'success' : 'warning'} withDot={false}>
              {readyCount}/{readinessChecks.length}
            </StatusPill>
          }
        >
          <ul className={styles.checks}>
            {readinessChecks.map((item) => (
              <li key={item.label} className={styles.checkItem}>
                <span className={styles.checkIcon} aria-hidden="true">
                  <LucideIcon iconClass={item.icon} />
                </span>
                <span className={styles.checkText}>
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
                <StatusPill tone={item.ready ? 'success' : item.danger ? 'danger' : 'warning'} withDot={false}>
                  {item.ready ? t('stateActive') : item.danger ? t('stateActionNeeded') : t('statePending')}
                </StatusPill>
              </li>
            ))}
          </ul>
        </Card>

        <Card experience="mobile" title={isIos ? text.installGuideTitle : t('installCardTitle')} className={styles.guideCard}>
          <p className={styles.meta}>
            {isIos ? (isSafari ? text.installGuideSafari : text.installGuideOther) : text.androidInstallGuide}
          </p>
          <StatusPill tone={displayedIsInstalled ? 'success' : 'neutral'} withDot={false}>
            {displayedIsInstalled ? text.installed : text.notInstalled}
          </StatusPill>
        </Card>

        <Card
          experience="mobile"
          title={text.managementTitle}
          description={text.versionHelp}
          className={styles.managementCard}
          footer={
            <div className={styles.actionGrid}>
              <Button
                type="button"
                experience="mobile"
                onClick={applyAppUpdate}
                disabled={!displayedHasUpdate}
                leadingIcon={<LucideIcon iconClass="fa-download" />}
              >
                {t('applyUpdateButton')}
              </Button>
              <Button
                type="button"
                variant="outline"
                experience="mobile"
                onClick={onClearCaches}
                loading={busyAction === 'cache'}
              >
                {t('clearCacheButton')}
              </Button>
            </div>
          }
        >
          <p className={styles.meta}>
            {t('appVersion')}: <strong>{appVersion}</strong>
          </p>
          <p className={styles.meta}>{displayedHasUpdate ? t('updateReady') : t('upToDate')}</p>
          <p className={styles.meta}>{text.clearHelp}</p>
        </Card>
      </section>

      {statusMessage ? <Toast experience="mobile" tone="info" description={statusMessage} className={styles.toast} /> : null}
    </main>
  );
}
