import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import styles from './Footer.module.scss';
import LucideIcon from '@/components/common/LucideIcon';
import SocialBrandIcon from '@/components/common/SocialBrandIcon';
import { FOOTER_SOCIAL_LINKS } from '@/lib/config/social-links';

/**
 * Site-wide public footer.
 *
 * Identity: dark-navy backdrop with gold ($primary) accents — provides
 * deliberate contrast to the white/gold sticky header above, and ties the
 * brand together via the gold hairline echoing the header's top edge.
 *
 * - Semantic HTML5 (footer / nav / address)
 * - CSS Module (scoped, no global class collisions with legacy footer.scss)
 * - Logical layout — RTL-safe via grid + flex (no left/right paddings)
 * - Accessible: aria labels, visible focus, hidden link text for socials
 */
const Footer = () => {
  const t = useTranslations();
  const locale = useLocale();
  const year = new Date().getFullYear();

  const href = (path: string) => `/${locale}${path}`;

  // Compact tagline derived from the long about_text — keeps the brand column
  // focused without adding a new translation key.
  const tagline = t('footer.about_text');

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.top}>
        <div className="container">
          <div className={styles.grid}>
            {/* ─── Brand ─────────────────────────────────────────────── */}
            <div className={`${styles.col} ${styles.brand}`}>
              <Link href={href('/')} className={styles.logo} aria-label={t('header.title')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/img/footer-logo.png" alt={t('header.title')} />
              </Link>
              <p className={styles.tagline}>{tagline}</p>

              <ul className={styles.socials} aria-label={t('footer.follow_us')}>
                {FOOTER_SOCIAL_LINKS.map((social) => {
                  const label = t(social.labelKey);

                  return (
                    <li key={social.brand}>
                      <a
                        href={social.href}
                        className={styles.socialBtn}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                      >
                        <span className="visually-hidden">{label}</span>
                        <SocialBrandIcon brand={social.brand} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ─── For Patients ──────────────────────────────────────── */}
            <nav className={styles.col} aria-label={t('footer.for_patients')}>
              <h2 className={styles.colTitle}>{t('footer.for_patients')}</h2>
              <ul className={styles.linkList}>
                <li>
                  <Link href={href('/doctors')} className={styles.link}>
                    {t('footer.search_doctors')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/booking')} className={styles.link}>
                    {t('footer.booking')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/coverage')} className={styles.link}>
                    {t('nav.coverage')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/areas')} className={styles.link}>
                    {t('footer.areas')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/pricing')} className={styles.link}>
                    {t('footer.pricing')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/specialties')} className={styles.link}>
                    {t('footer.specialities')}
                  </Link>
                </li>
              </ul>
            </nav>

            {/* ─── Company ───────────────────────────────────────────── */}
            <nav className={styles.col} aria-label={t('footer.quick_links')}>
              <h2 className={styles.colTitle}>{t('footer.quick_links')}</h2>
              <ul className={styles.linkList}>
                <li>
                  <Link href={href('/about-us')} className={styles.link}>
                    {t('footer.about_us')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/services')} className={styles.link}>
                    {t('footer.our_services')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/doctors')} className={styles.link}>
                    {t('nav.doctors')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/guides')} className={styles.link}>
                    {t('footer.guides')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/blog')} className={styles.link}>
                    {t('footer.blog')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/conditions')} className={styles.link}>
                    {t('footer.conditions')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/glossary')} className={styles.link}>
                    {t('footer.glossary')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/faq')} className={styles.link}>
                    {t('footer.faq')}
                  </Link>
                </li>
                <li>
                  <Link href={href('/contact-us')} className={styles.link}>
                    {t('footer.contact')}
                  </Link>
                </li>
              </ul>
            </nav>

            {/* ─── Contact ───────────────────────────────────────────── */}
            <address className={styles.col} style={{ fontStyle: 'normal' }}>
              <h2 className={styles.colTitle}>{t('footer.contact')}</h2>
              <ul className={styles.contactList}>
                <li className={styles.contactItem}>
                  <span className={styles.contactIcon} aria-hidden="true">
                    <LucideIcon iconClass="fa-solid fa-phone" />
                  </span>
                  <div className={styles.contactBody}>
                    <a href="tel:+201270558620" dir="ltr">+20 127 055 8620</a>
                    <a href="tel:+201096169459" dir="ltr">+20 109 616 9459</a>
                  </div>
                </li>
                <li className={styles.contactItem}>
                  <span className={styles.contactIcon} aria-hidden="true">
                    <LucideIcon iconClass="fa-solid fa-envelope" />
                  </span>
                  <div className={styles.contactBody}>
                    <a href="mailto:info@aneeshealth.com">info@aneeshealth.com</a>
                  </div>
                </li>
                <li className={styles.contactItem}>
                  <span className={styles.contactIcon} aria-hidden="true">
                    <LucideIcon iconClass="fa-solid fa-location-dot" />
                  </span>
                  <div className={styles.contactBody}>
                    <span className={styles.contactLabel}>{t('footer.admin_office')}</span>
                    <span>{t('footer.address')}</span>
                    <span className={styles.contactMuted}>{t('footer.city')}</span>
                  </div>
                </li>
              </ul>
            </address>
          </div>
        </div>
      </div>

      {/* ─── Bottom bar ─────────────────────────────────────────────── */}
      <div className={styles.bottom}>
        <div className="container">
          <div className={styles.bottomInner}>
            <p className={styles.copyText}>
              © {year} {t('header.title')}. {t('footer.rights')}.
            </p>
            <ul className={styles.legalLinks}>
              <li>
                <Link href={href('/terms-and-conditions')} className={styles.legalLink}>
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link href={href('/privacy-policy')} className={styles.legalLink}>
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
