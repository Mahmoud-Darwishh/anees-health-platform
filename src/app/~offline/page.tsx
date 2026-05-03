import styles from './offline.module.scss';

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>You are offline الآن بدون اتصال</h1>
        <p className={styles.description}>
          You can keep using cached pages while offline. بمجرد عودة الاتصال، سيتم تحديث المحتوى تلقائيا.
        </p>
      </section>
    </main>
  );
}
