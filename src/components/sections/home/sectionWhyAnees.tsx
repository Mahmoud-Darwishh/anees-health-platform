import React from 'react';
import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionWhyAnees.module.scss';

type Tile = {
  icon: string;
  title: string;
  desc: string;
};

const SectionWhyAnees: React.FC = () => {
  const t = useTranslations('home.whyAnees');
  const items = t.raw('items') as Tile[];

  return (
    <Reveal as="section" className={styles.section} aria-labelledby="why-anees-title">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.badge}>{t('badge')}</span>
          <h2 id="why-anees-title" className={styles.heading}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        <div className={styles.grid}>
          {items.map((item, i) => (
            <article key={i} className={styles.tile}>
              <span className={styles.tileIcon} aria-hidden="true">
                <i className={item.icon} />
              </span>
              <h3 className={styles.tileTitle}>{item.title}</h3>
              <p className={styles.tileDesc}>{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
  );
};

export default SectionWhyAnees;
