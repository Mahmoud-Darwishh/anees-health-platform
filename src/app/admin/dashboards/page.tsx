import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './dashboard.module.scss';

export const metadata: Metadata = {
  title: 'Clinical Dashboards | Anees Admin',
  robots: { index: false, follow: false },
};

const dashboardLinks = [
  { href: '/admin/dashboards/doctor', label: 'Doctor Dashboard', description: 'Unsigned notes, triage drafts, active problems, and chart review.' },
  { href: '/admin/dashboards/physio', label: 'Physio Dashboard', description: 'Session plans, follow-up slots, and rehabilitation continuity.' },
  { href: '/admin/dashboards/nurse', label: 'Nurse Dashboard', description: 'Escalations, vitals, bedside follow-up, and shift handoff.' },
  { href: '/admin/dashboards/medical-ops', label: 'Medical Ops Dashboard', description: 'Follow-ups, call routing, assignments, and coordination tasks.' },
];

export default function DashboardsHomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.headerRow}>
          <div>
            <h1>Clinical Dashboards</h1>
            <p>Dedicated work surfaces for each care role and the ops team.</p>
          </div>
          <Link href="/admin/patients" className={styles.backLink}>Back to patients</Link>
        </header>

        <section className={styles.boardGrid}>
          {dashboardLinks.map((item) => (
            <article key={item.href} className={styles.card}>
              <h2>{item.label}</h2>
              <p className={styles.subhead}>{item.description}</p>
              <Link href={item.href} className={styles.backLink}>Open dashboard</Link>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}