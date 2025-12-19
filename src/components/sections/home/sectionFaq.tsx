'use client';

import React, { useId } from 'react'
import { useTranslations } from 'next-intl';

const SectionFaq: React.FC = () => {
    const t = useTranslations();
    const uid = useId();
    const parentId = `${uid}-faq`;
    const headingIds = [1, 2, 3, 4, 5].map((n) => `${uid}-heading-${n}`);
    const collapseIds = [1, 2, 3, 4, 5].map((n) => `${uid}-collapse-${n}`);
    return (
        <div>
            <section className="faq-section-one">
                <div className="container">
                    <div
                        className="section-header sec-header-one text-center aos"
                        data-reveal
                    >
                        <span className="badge badge-primary">{t('home.faqs.badge')}</span>
                        <h2>{t('home.faqs.title')}</h2>
                    </div>
                    <div className="row">
                        <div className="col-md-10 mx-auto">
                            <div className="faq-info aos" data-reveal>
                                <div className="accordion" id={parentId}>
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id={headingIds[0]}>
                                            <button
                                                type="button"
                                                className="accordion-button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseIds[0]}`}
                                                aria-expanded="true"
                                                aria-controls={collapseIds[0]}
                                            >
                                                {t('home.faqs.q1')}
                                            </button>
                                        </h2>
                                        <div
                                            id={collapseIds[0]}
                                            className="accordion-collapse collapse show"
                                            aria-labelledby={headingIds[0]}
                                            data-bs-parent={`#${parentId}`}
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
                                        <h2 className="accordion-header" id={headingIds[1]}>
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseIds[1]}`}
                                                aria-expanded="false"
                                                aria-controls={collapseIds[1]}
                                            >
                                                {t('home.faqs.q2')}
                                            </button>
                                        </h2>
                                        <div
                                            id={collapseIds[1]}
                                            className="accordion-collapse collapse"
                                            aria-labelledby={headingIds[1]}
                                            data-bs-parent={`#${parentId}`}
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
                                        <h2 className="accordion-header" id={headingIds[2]}>
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseIds[2]}`}
                                                aria-expanded="false"
                                                aria-controls={collapseIds[2]}
                                            >
                                                {t('home.faqs.q3')}
                                            </button>
                                        </h2>
                                        <div
                                            id={collapseIds[2]}
                                            className="accordion-collapse collapse"
                                            aria-labelledby={headingIds[2]}
                                            data-bs-parent={`#${parentId}`}
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
                                        <h2 className="accordion-header" id={headingIds[3]}>
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseIds[3]}`}
                                                aria-expanded="false"
                                                aria-controls={collapseIds[3]}
                                            >
                                                {t('home.faqs.q4')}
                                            </button>
                                        </h2>
                                        <div
                                            id={collapseIds[3]}
                                            className="accordion-collapse collapse"
                                            aria-labelledby={headingIds[3]}
                                            data-bs-parent={`#${parentId}`}
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
                                        <h2 className="accordion-header" id={headingIds[4]}>
                                            <button
                                                type="button"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseIds[4]}`}
                                                aria-expanded="false"
                                                aria-controls={collapseIds[4]}
                                            >
                                                {t('home.faqs.q5')}
                                            </button>
                                        </h2>
                                        <div
                                            id={collapseIds[4]}
                                            className="accordion-collapse collapse"
                                            aria-labelledby={headingIds[4]}
                                            data-bs-parent={`#${parentId}`}
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


