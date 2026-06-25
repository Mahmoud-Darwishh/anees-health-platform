import Link from 'next/link';
import LucideIcon from '@/components/common/LucideIcon';
import styles from './ContentCard.module.scss';

interface ContentCardProps {
  href: string;
  title: string;
  description?: string;
  /** Small pill, e.g. "12 doctors". */
  meta?: string;
  /** Mapped fa-* icon (see LucideIcon). Defaults to a heart-pulse. */
  icon?: string;
  /** Optional call-to-action label with a trailing arrow. */
  cta?: string;
}

/**
 * Polished link card for content grids (services, specialties, areas,
 * conditions, guides). Gold-tinted icon, optional meta pill, hover lift.
 */
export default function ContentCard({ href, title, description, meta, icon, cta }: ContentCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <span className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          <LucideIcon iconClass={icon || 'fa-heart-pulse'} />
        </span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
      <span className={styles.title}>{title}</span>
      {description ? <span className={styles.desc}>{description}</span> : null}
      {cta ? (
        <span className={styles.cta}>
          {cta}
          <LucideIcon iconClass="fa-arrow-right" aria-hidden="true" />
        </span>
      ) : null}
    </Link>
  );
}
