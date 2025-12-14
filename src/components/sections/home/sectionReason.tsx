'use client';

import React from 'react'
import { useTranslations } from 'next-intl'

const SectionReason: React.FC = () => {
    const t = useTranslations();
    return (
        <>
            {/* Reasons Section */}
            <section className="reason-section">
                <div className="container">
                    <div
                        className="section-header sec-header-one text-center aos"
                        data-aos="fade-up"
                    >
                        <span className="badge badge-primary">{t('home.reasons.badge')}</span>
                        <h2>{t('home.reasons.title')}</h2>
                    </div>
                    <div className="row row-gap-4 justify-content-center">
                        <div className="col-lg-4 col-md-6">
                            <div className="reason-item aos" data-aos="fade-up">
                                <h6 className="mb-2">
                                    <i className="isax isax-tag-user5 text-orange me-2" />
                                    {t('home.reasons.followup')}
                                </h6>
                                <p className="fs-14 mb-0">
                                    {t('home.reasons.followup_desc')}
                                </p>
                            </div>
                        </div>
                        <div className="col-lg-4 col-md-6">
                            <div className="reason-item aos" data-aos="fade-up">
                                <h6 className="mb-2">
                                    <i className="isax isax-voice-cricle text-purple me-2" />
                                    {t('home.reasons.patient_centered')}
                                </h6>
                                <p className="fs-14 mb-0">
                                    {t('home.reasons.patient_centered_desc')}
                                </p>
                            </div>
                        </div>
                        <div className="col-lg-4 col-md-6">
                            <div className="reason-item aos" data-aos="fade-up">
                                <h6 className="mb-2">
                                    <i className="isax isax-wallet-add-15 text-cyan me-2" />
                                    {t('home.reasons.convenient')}
                                </h6>
                                <p className="fs-14 mb-0">
                                    {t('home.reasons.convenient_desc')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* /Reasons Section */}
        </>

    )
}

export default SectionReason


