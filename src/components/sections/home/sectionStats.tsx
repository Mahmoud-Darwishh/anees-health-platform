'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionStats.module.scss';

type Stat = { value: string; label: string };

const SectionStats: React.FC = () => {
  const t = useTranslations('home.stats');
  const items = t.raw('items') as Stat[];

  return (
    <Reveal as="section" className={styles.section} aria-label={t('badge')}>
      <div className="container">
        <ul className={styles.grid} role="list">
          {items.map((item, i) => (
            <li key={i} className={styles.item}>
              <span className={styles.value}>{item.value}</span>
              <span className={styles.label}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
};

export default SectionStats;
