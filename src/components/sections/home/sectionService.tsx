'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const SectionService: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar';

    useEffect(() => {
        const scrollers = document.querySelectorAll(".horizontal-slide");

        scrollers.forEach((scroller) => {
            const scrollerInner = scroller.querySelector(".slide-list");
            if (!scrollerInner) return;

            const scrollerContent = Array.from(scrollerInner.children);
            // Duplicate items twice to guarantee seamless infinite scroll in all locales.
            for (let i = 0; i < 2; i += 1) {
                scrollerContent.forEach((item) => {
                    const duplicatedItem = item.cloneNode(true) as Element;
                    duplicatedItem.setAttribute("aria-hidden", "true");
                    scrollerInner.appendChild(duplicatedItem);
                });
            }
        });
    }, []);


    return (
        <>
            {/* Services Section */}
            <section className="services-section aos" data-reveal>
                <div
                    className="horizontal-slide d-flex"
                    data-direction={isRTL ? "left" : "right"}
                    data-speed="medium"
                    /*data-speed={isRTL ? "medium" : "medium"}*/
                >
                    <div className="slide-list d-flex gap-4">
                        <div className="services-slide">
                            <h6>
                                <Link href="#">
                                    {t('home.services.multi_speciality')}
                                </Link>
                            </h6>
                        </div>
                        <div className="services-slide">
                            <h6>
                                <Link href="#">{t('home.services.lab_testing')}</Link>
                            </h6>
                        </div>
                        <div className="services-slide">
                            <h6>
                                <Link href="#">{t('home.services.medicines')}</Link>
                            </h6>
                        </div>
                        <div className="services-slide">
                            <h6>
                                <Link href="#">{t('home.services.hospitals')}</Link>
                            </h6>
                        </div>
                        <div className="services-slide">
                            <h6>
                                <Link href="#">{t('home.services.healthcare')}</Link>
                            </h6>
                        </div>
                        <div className="services-slide">
                            <h6>
                                <Link href="#">{t('home.services.talk_doctors')}</Link>
                            </h6>
                        </div>
                        <div className="services-slide">
                            <h6>
                                <Link href="#">{t('home.services.home_care')}</Link>
                            </h6>
                        </div>
                    </div>
                </div>
            </section>
            {/* /Services Section */}
        </>

    )
}

export default SectionService


