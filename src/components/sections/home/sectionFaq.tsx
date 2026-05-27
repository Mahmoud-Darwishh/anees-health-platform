'use client';

import React, { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionFaq.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const ANSWER_KEYS = ['a1', 'a2', 'a3', 'a4', 'a5'] as const;

const SectionFaq: React.FC = () => {
  const t = useTranslations('home.faqs');
  const uid = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex((current) => (current === i ? null : i));
  };

  return (
    <Reveal as="section" className={styles.section} aria-labelledby="faq-title">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.badge}>{t('badge')}</span>
          <h2 id="faq-title" className={styles.heading}>
            {t('title')}
          </h2>
        </div>

        <div className={styles.list}>
          {QUESTION_KEYS.map((qKey, i) => {
            const itemId = `${uid}-item-${i}`;
            const isOpen = openIndex === i;
            return (
              <div key={qKey} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
                <h3 className={styles.headingItem}>
                  <button
                    type="button"
                    className={styles.trigger}
                    aria-expanded={isOpen}
                    aria-controls={`${itemId}-panel`}
                    id={`${itemId}-trigger`}
                    onClick={() => toggle(i)}
                  >
                    <span className={styles.question}>{t(qKey)}</span>
                    <span className={styles.chevron} aria-hidden="true">
                      <LucideIcon iconClass="fa-solid fa-plus" />
                    </span>
                  </button>
                </h3>
                <div
                  id={`${itemId}-panel`}
                  role="region"
                  aria-labelledby={`${itemId}-trigger`}
                  className={styles.panel}
                  hidden={!isOpen}
                >
                  <div className={styles.panelInner}>
                    <p className={styles.answer}>{t(ANSWER_KEYS[i])}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
};

export default SectionFaq;

