'use client';

import { useEffect, useState } from 'react';
import { Button, Card, StatusPill } from '@/components/ui';
import { cx } from '@/lib/styles/cx';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';
import styles from './PwaNotificationNudge.module.scss';

type NudgeLocale = 'en' | 'ar';

interface PwaNotificationNudgeProps {
  locale: NudgeLocale;
  className?: string;
}

const copy = {
  en: {
    title: 'Get health alerts on this phone',
    description: 'Enable visit updates, reminders, and safe care messages without hunting for settings.',
    enable: 'Enable alerts',
    pending: 'One tap setup',
    ready: 'Alerts are on',
    installFirst: 'On iPhone, open Anees from the Home Screen icon first, then tap Enable alerts.',
    blocked: 'Notifications are blocked on this device. Re-enable them from device settings.',
    unsupported: 'This browser cannot receive Anees app notifications.',
    tryAgain: 'Could not enable alerts. Try again from the installed app.',
  },
  ar: {
    title: 'استقبل التنبيهات على هذا الهاتف',
    description: 'فعّل تحديثات الزيارات والتذكيرات ورسائل الرعاية الآمنة دون البحث في الإعدادات.',
    enable: 'تفعيل التنبيهات',
    pending: 'تفعيل بخطوة واحدة',
    ready: 'التنبيهات مفعّلة',
    installFirst: 'على iPhone، افتح Anees من أيقونة الشاشة الرئيسية أولاً، ثم اضغط تفعيل التنبيهات.',
    blocked: 'الإشعارات محظورة على هذا الجهاز. أعد تفعيلها من إعدادات الجهاز.',
    unsupported: 'هذا المتصفح لا يستطيع استقبال تنبيهات تطبيق Anees.',
    tryAgain: 'تعذر تفعيل التنبيهات. حاول مرة أخرى من التطبيق المثبت.',
  },
} satisfies Record<NudgeLocale, Record<string, string>>;

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIphoneIpad = /iphone|ipad|ipod/i.test(ua);
  const isMacWithTouch = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIphoneIpad || isMacWithTouch;
}

export default function PwaNotificationNudge({ locale, className }: PwaNotificationNudgeProps) {
  const text = copy[locale];
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [localStatus, setLocalStatus] = useState('');
  const {
    isSupported,
    isInstalled,
    notificationPermission,
    isSubscribed,
    statusMessage,
    enableNotifications,
  } = usePwaManager();

  useEffect(() => {
    const timer = window.setTimeout(() => setHasHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hasHydrated) {
    return null;
  }

  const notificationsReady = notificationPermission === 'granted' && isSubscribed;
  if (notificationsReady) {
    return null;
  }

  const needsInstalledIosApp = detectIos() && !isInstalled;
  const notificationsBlocked = notificationPermission === 'denied';
  const unavailable = !isSupported;
  const disabled = isPending || needsInstalledIosApp || notificationsBlocked || unavailable;
  const helperText = needsInstalledIosApp
    ? text.installFirst
    : notificationsBlocked
      ? text.blocked
      : unavailable
        ? text.unsupported
        : statusMessage || localStatus || text.description;

  const onEnable = async () => {
    setLocalStatus('');
    setIsPending(true);
    const enabled = await enableNotifications();
    setIsPending(false);
    setLocalStatus(enabled ? text.ready : text.tryAgain);
  };

  return (
    <aside className={cx(styles.wrap, className)} aria-label={text.title}>
      <Card
        experience="mobile"
        title={text.title}
        description={helperText}
        className={styles.card}
        actions={
          <StatusPill tone={notificationsBlocked || unavailable ? 'danger' : 'warning'} withDot={false}>
            {text.pending}
          </StatusPill>
        }
        footer={
          <Button type="button" experience="mobile" onClick={onEnable} disabled={disabled} fullWidth>
            {text.enable}
          </Button>
        }
      />
    </aside>
  );
}
