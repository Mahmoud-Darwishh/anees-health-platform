'use client';

import { useTranslations } from 'next-intl';
import styles from './summary.module.scss';

export default function PrintSummaryButton() {
  const t = useTranslations('portal.shareProfile');

  return (
    <button
      type="button"
      className={styles.printBtn}
      onClick={() => window.print()}
    >
      {t('print')}
    </button>
  );
}
