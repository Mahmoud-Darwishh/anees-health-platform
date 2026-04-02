'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';

const SectionService: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar';

    const serviceItems = [
        t('home.services.multi_speciality'),
        t('home.services.lab_testing'),
        t('home.services.medicines'),
        t('home.services.hospitals'),
        t('home.services.healthcare'),
        t('home.services.talk_doctors'),
        t('home.services.home_care'),
    ];

    const loopItems = [...serviceItems, ...serviceItems];


    return (
        <>
            {/* Services Section */}
            <section className="services-section services-ribbon-section">
                <div className={`services-ribbon ${isRTL ? 'rtl' : 'ltr'}`}>
                    <div className="services-ribbon-track" aria-live="off">
                        {loopItems.map((label, idx) => (
                            <div className="services-ribbon-item" key={`${label}-${idx}`}>
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {/* /Services Section */}
        </>

    )
}

export default SectionService


