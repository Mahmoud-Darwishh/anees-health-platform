import React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionHowItWorks.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

type Step = {
  number: string;
  icon: string;
  title: string;
  desc: string;
};

const WHATSAPP_NUMBER = '201055164595';

const SectionHowItWorks: React.FC = () => {
  const t = useTranslations('home.howItWorks');
  const locale = useLocale();
  const steps = t.raw('steps') as Step[];

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    locale === 'ar'
      ? 'مرحبًا أنيس، أريد التحدث مع طبيب بخصوص الرعاية المنزلية.'
      : "Hi Anees, I'd like to chat with a doctor about home care."
  )}`;

  return (
    <Reveal as="section" className={styles.section} aria-labelledby="how-it-works-title">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.badge}>{t('badge')}</span>
          <h2 id="how-it-works-title" className={styles.heading}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        <ol className={styles.steps} role="list">
          {steps.map((step, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {step.number}
              </span>
              <span className={styles.stepIcon} aria-hidden="true">
                <LucideIcon iconClass={step.icon} />
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
              {i < steps.length - 1 && (
                <span className={styles.connector} aria-hidden="true">
                  <LucideIcon iconClass="fa-solid fa-arrow-right" />
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className={styles.cta}>
          <a
            href={whatsappHref}
            className={styles.ctaPrimary}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LucideIcon iconClass="fa-solid fa-comment-dots" aria-hidden="true" />
            {t('cta')}
          </a>
          <Link href={`/${locale}#packages`} className={styles.ctaSecondary}>
            {t('ctaSecondary')}
          </Link>
        </div>
      </div>
    </Reveal>
  );
};

export default SectionHowItWorks;

