'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionCoverageStrip.module.scss';

const SectionCoverageStrip: React.FC = () => {
  const t = useTranslations('home.coverageStrip');
  const locale = useLocale();

  return (
    <Reveal as="section" className={styles.section} aria-labelledby="coverage-strip-title">
      <div className="container">
        <div className={styles.band}>
          <span className={styles.iconWrap} aria-hidden="true">
            <i className="isax isax-location5" />
          </span>

          <div className={styles.text}>
            <span className={styles.badge}>{t('badge')}</span>
            <h2 id="coverage-strip-title" className={styles.heading}>
              {t('title')}
            </h2>
            <p className={styles.desc}>{t('desc')}</p>
          </div>

          <Link href={`/${locale}/coverage`} className={styles.cta}>
            {t('cta')}
            <i className="feather-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Reveal>
  );
};

export default SectionCoverageStrip;
