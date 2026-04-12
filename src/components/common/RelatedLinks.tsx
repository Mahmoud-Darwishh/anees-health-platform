import Link from 'next/link';
import styles from './RelatedLinks.module.scss';

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
    if (href.includes('/booking')) return 'isax-calendar-1';
    if (href.includes('/doctors')) return 'isax-profile-2user';
    if (href.includes('/specialties')) return 'isax-category';
    if (href.includes('/services')) return 'isax-health';
    if (href.includes('/coverage')) return 'isax-location';
    if (href.includes('/contact')) return 'isax-message-question';
    return 'isax-arrow-right-3';
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
                      <i className={`isax ${linkIcon(link.href)}`} aria-hidden="true"></i>
                      <span>{link.label}</span>
                    </span>
                    <i className="isax isax-arrow-right-3" aria-hidden="true"></i>
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
