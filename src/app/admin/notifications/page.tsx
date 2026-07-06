import { redirect } from 'next/navigation';
import { Card, PageHeader, StatusPill } from '@/components/ui';
import { getStaffUser } from '@/lib/auth/rbac';
import { countSubscriptions } from '@/lib/pwa/subscription-store';
import { PushNotificationForm } from './PushNotificationForm';
import styles from './notifications.module.scss';

export const dynamic = 'force-dynamic';

const NOTIFICATION_ADMIN_ROLES = ['superadmin', 'admin'] as const;

export default async function AdminNotificationsPage() {
  const user = await getStaffUser([...NOTIFICATION_ADMIN_ROLES]);

  if (!user) {
    redirect('/admin');
  }

  const [totalSubscriptions, englishSubscriptions, arabicSubscriptions] = await Promise.all([
    countSubscriptions(),
    countSubscriptions('en'),
    countSubscriptions('ar'),
  ]);

  return (
    <div className={styles.page}>
      <PageHeader
        experience="ops"
        eyebrow="PWA messaging"
        title="App notifications"
        description="Send short, PHI-light app alerts to users who installed or enabled push notifications."
        actions={
          <StatusPill tone={totalSubscriptions > 0 ? 'success' : 'warning'}>
            {totalSubscriptions} subscribed devices
          </StatusPill>
        }
      />

      <div className={styles.statsGrid}>
        <Card experience="ops" padding="sm" title="All devices">
          <p className={styles.statValue}>{totalSubscriptions}</p>
        </Card>
        <Card experience="ops" padding="sm" title="English">
          <p className={styles.statValue}>{englishSubscriptions}</p>
        </Card>
        <Card experience="ops" padding="sm" title="Arabic">
          <p className={styles.statValue}>{arabicSubscriptions}</p>
        </Card>
      </div>

      <div className={styles.layoutGrid}>
        <Card
          experience="ops"
          title="Send an alert"
          description="This sends through browser push to opted-in devices. Keep the text safe for lock screens."
        >
          <PushNotificationForm />
        </Card>

        <Card experience="ops" title="Operating rules">
          <ul className={styles.ruleList}>
            <li>Users must first tap Enable health alerts in the app or PWA settings.</li>
            <li>Messages should point users back into Anees instead of containing private details.</li>
            <li>Use Arabic targeting for Arabic copy; use English targeting for English copy.</li>
            <li>Expired browser subscriptions are removed automatically when a send fails permanently.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
