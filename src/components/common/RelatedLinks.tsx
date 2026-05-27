import Link from 'next/link';
import styles from './RelatedLinks.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

export interface RelatedLinkItem {
  href: string;
  label: string;
}

interface RelatedLinksProps {
  locale: 'en' | 'ar';
  title?: string;
  links: RelatedLinkItem[];
}

export default function RelatedLinks({ locale, title, links }: RelatedLinksProps) {
  const heading =
    title || (locale === 'ar' ? 'روابط ذات صلة' : 'Related links');

  const isArabic = locale === 'ar';

  const sectionNote = isArabic
    ? 'روابط مختصرة تساعدك على الاستمرار في رحلتك الطبية بسرعة.'
    : 'Quick paths to continue your care journey with confidence.';

  const linkIcon = (href: string) => {
    if (href.includes('/booking')) return 'fa-solid fa-calendar-days';
    if (href.includes('/doctors')) return 'fa-solid fa-user-group';
    if (href.includes('/specialties')) return 'fa-solid fa-layer-group';
    if (href.includes('/services')) return 'fa-solid fa-heart-pulse';
    if (href.includes('/coverage')) return 'fa-solid fa-location-dot';
    if (href.includes('/contact')) return 'fa-solid fa-circle-question';
    return 'fa-solid fa-arrow-right';
  };

  return (
    <section className={`py-4 ${styles.relatedLinksSection}`}>
      <div className="container">
        <div className={`card border-0 shadow-sm ${styles.relatedLinksCard}`}>
          <div className="card-body p-4 p-lg-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h2 className="h5 mb-2">{heading}</h2>
                <p className={`${styles.sectionNote} mb-0`}>{sectionNote}</p>
              </div>
              <span className={styles.linksCount}>
                {isArabic ? `${links.length} روابط` : `${links.length} links`}
              </span>
            </div>

            <ul className={`list-unstyled mb-0 ${styles.linksGrid}`}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.relatedLinkItem}>
                    <span className={styles.linkStart}>
                      <LucideIcon iconClass={linkIcon(link.href)} aria-hidden="true"></LucideIcon>
                      <span>{link.label}</span>
                    </span>
                    <LucideIcon iconClass="fa-solid fa-arrow-right" aria-hidden="true"></LucideIcon>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
