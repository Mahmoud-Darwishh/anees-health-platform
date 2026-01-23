'use client';

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

const SectionApp: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();
    return (
        <div>
            <>
                {/* App Section */} {/*}
                <section className="app-section app-sec-one p-0">
                    <div className="container">
                        <div className="app-bg">
                            <div className="row">
                                <div className="col-lg-6 col-md-12 d-flex">
                                    <div className="app-content d-flex flex-column justify-content-center">
                                        <div className="app-header aos" data-reveal>
                                            <h3 className="display-6 text-white">
                                                Download Anees Health App today!
                                            </h3>
                                            <p className="text-light">
                                                To download an app related to a doctor or medical services,
                                                you can typically visit the app store on your device.
                                            </p>
                                        </div>
                                        <div className="google-imgs aos" data-reveal>
                                            <Link href="#">
                                                <img src="assets/img/icons/app-store-01.svg" alt="Download Anees Health app on Apple App Store" />
                                            </Link>
                                            <Link href="#">
                                                <img src="assets/img/icons/google-play-01.svg" alt="Get Anees Health app on Google Play Store" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12 aos" data-reveal>
                                    <div className="mobile-img">
                                      <Image
                                        src="/assets/img/optimized/mobile-img.webp"
                                        alt="Anees Health mobile app interface - Book doctors and manage healthcare"
                                        width={800}
                                        height={800}
                                            className="img-fluid"
                                        loading="lazy"
                                        quality={85}
                                        />
                                    </div>
                                </div>
                                
                            </div>
                            <div className="app-bgs">
                                <img
                                    src="assets/img/bg/app-bg-02.png"
                                    alt="img"
                                    className="app-bg-01"
                                />
                                <img
                                    src="assets/img/bg/app-bg-03.png"
                                    alt="img"
                                    className="app-bg-02"
                                />
                                <img
                                    src="assets/img/bg/app-bg-04.png"
                                    alt="img"
                                    className="app-bg-03"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="download-bg">
                        <img src="assets/img/bg/download-bg.png" alt="img" />
                    </div>
                </section> */}
                {/* /App Section */}

                      {/* App Section */}
      <section className="app-section pt-0">
        <div className="container">
          <div className="app-bg">
            <div className="row align-items-end">
              <div className="col-lg-6 col-md-12">
                <div className="app-content">
                  <div className="app-header aos" data-reveal>
                    <h5>{t('home.app.working')}</h5>
                    <h2>{t('home.app.title')}</h2>
                  </div>
                  <div className="app-scan aos" data-reveal>
                    <p>{t('home.app.scan_text')}</p>
                    <img
                      src="assets/img/scan-img.png"
                      alt="scan-image"
                    />
                  </div>
                  <div className="google-imgs aos" data-reveal>
                    <Link href="#">
                      <img
                        src="assets/img/icons/google-play-icon.svg"
                        alt="img"
                      />
                    </Link>
                    <Link href="#">
                      <img
                        src="assets/img/icons/app-store-icon.svg"
                        alt="img"
                      />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 col-md-12 aos" data-reveal>
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


