'use client';

import React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import styles from './sectionApp.module.scss'

const SectionApp: React.FC = () => {
    const t = useTranslations();
    return (
        <div>
            <>
        {/* App Section */}
      <section className="app-section pt-0">
        <div className="container">
          <div className="app-bg">
            <div className="row align-items-end">
              <div className="col-lg-6 col-md-12">
                <div className="app-content">
                  <div className="app-header">
                    <span className={styles.comingSoonBadge} aria-label={t('home.app.coming_soon_note')}>
                      {t('home.app.coming_soon')}
                    </span>
                    <h5>{t('home.app.working')}</h5>
                    <h2>{t('home.app.title')}</h2>
                  </div>
                  <div className="app-scan">
                    <p>{t('home.app.scan_text')}</p>
                    <img
                      src="assets/img/scan-img.png"
                      alt="scan-image"
                    />
                  </div>
                  <div className={styles.storeButtons} aria-label={t('home.app.coming_soon_note')}>
                    <img
                      src="assets/img/icons/google-play-icon.svg"
                      alt="Google Play – Coming Soon"
                    />
                    <img
                      src="assets/img/icons/app-store-icon.svg"
                      alt="App Store – Coming Soon"
                    />
                  </div>
                  <p className={styles.comingSoonNote}>{t('home.app.coming_soon_note')}</p>
                </div>
              </div>
              <div className="col-lg-6 col-md-12">
                <div className="mobile-img">
                    <Image
                      src="/assets/img/optimized/mobile-img.webp"
                      alt="img"
                      width={800}
                      height={800}
                    className="img-fluid"
                      loading="lazy"
                      quality={85}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* /App Section */}
            </>

        </div>
    )
}

export default SectionApp


