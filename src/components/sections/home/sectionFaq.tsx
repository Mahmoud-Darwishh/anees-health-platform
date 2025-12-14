'use client';

import React from 'react'
import { useTranslations } from 'next-intl';

const SectionFaq: React.FC = () => {
    const t = useTranslations();
    return (
        <div>
            <section className="faq-section-one">
                <div className="container">
                    <div
                        className="section-header sec-header-one text-center aos"
                        data-aos="fade-up"
                    >
                        <span className="badge badge-primary">{t('home.faqs.badge')}</span>
                        <h2>{t('home.faqs.title')}</h2>
                    </div>
                    <div className="row">
                        <div className="col-md-10 mx-auto">
                            <div className="faq-info aos" data-aos="fade-up">
                                <div className="accordion" id="faq-details">
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id="headingOne">
                                            <button
                                                type="button"
                                                className="accordion-button"
                                                data-bs-toggle="collapse"
                                                data-bs-target="#collapseOne"
                                                aria-expanded="true"
                                                aria-controls="collapseOne"
                                            >
                                                {t('home.faqs.q1')}
                                            </button>
                                        </h2>
                                        <div
                                            id="collapseOne"
                                            className="accordion-collapse collapse show"
                                            aria-labelledby="headingOne"
                                            data-bs-parent="#faq-details"
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.faqs.a1')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* /FAQ Item */}
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id="headingTwo">
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target="#collapseTwo"
                                                aria-expanded="false"
                                                aria-controls="collapseTwo"
                                            >
                                                {t('home.faqs.q2')}
                                            </button>
                                        </h2>
                                        <div
                                            id="collapseTwo"
                                            className="accordion-collapse collapse"
                                            aria-labelledby="headingTwo"
                                            data-bs-parent="#faq-details"
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.faqs.a2')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* /FAQ Item */}
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id="headingThree">
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target="#collapseThree"
                                                aria-expanded="false"
                                                aria-controls="collapseThree"
                                            >
                                                {t('home.faqs.q3')}
                                            </button>
                                        </h2>
                                        <div
                                            id="collapseThree"
                                            className="accordion-collapse collapse"
                                            aria-labelledby="headingThree"
                                            data-bs-parent="#faq-details"
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.faqs.a3')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* /FAQ Item */}
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id="headingFour">
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target="#collapseFour"
                                                aria-expanded="false"
                                                aria-controls="collapseFour"
                                            >
                                                {t('home.faqs.q4')}
                                            </button>
                                        </h2>
                                        <div
                                            id="collapseFour"
                                            className="accordion-collapse collapse"
                                            aria-labelledby="headingFour"
                                            data-bs-parent="#faq-details"
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.faqs.a4')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* /FAQ Item */}
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id="headingFive">
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target="#collapseFive"
                                                aria-expanded="false"
                                                aria-controls="collapseFive"
                                            >
                                                {t('home.faqs.q5')}
                                            </button>
                                        </h2>
                                        <div
                                            id="collapseFive"
                                            className="accordion-collapse collapse"
                                            aria-labelledby="headingFive"
                                            data-bs-parent="#faq-details"
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.faqs.a5')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* /FAQ Item */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    )
}

export default SectionFaq


