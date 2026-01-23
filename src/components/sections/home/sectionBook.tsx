'use client';

import React, { useId } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

const SectionBook: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();
    const accordionBaseId = useId();
    const faqParentId = `${accordionBaseId}-faq`;
    const headingOneId = `${accordionBaseId}-heading-vision`;
    const collapseOneId = `${accordionBaseId}-collapse-vision`;
    const headingTwoId = `${accordionBaseId}-heading-mission`;
    const collapseTwoId = `${accordionBaseId}-collapse-mission`;
    return (
        <>
            {/* Bookus Section */}
            <section className="bookus-section bg-dark">
                <div className="container">
                    <div className="row align-items-center row-gap-4">
                        <div className="col-lg-6">
                            <div className="bookus-img">
                                <div className="row g-3">
                                    <div className="col-md-12 aos" data-reveal>
                                            <Image
                                                src="/assets/img/optimized/book-01.webp"
                                                alt="Doctor conducting home visit for elderly patient in Cairo - Anees Health"
                                                width={600}
                                                height={400}
                                                className="img-fluid"
                                                sizes="(max-width: 992px) 100vw, 600px"
                                                style={{ width: '100%', height: 'auto' }}
                                                loading="lazy"
                                                quality={85}
                                            />
                                    </div>
                                    <div className="col-sm-6 aos" data-reveal>
                                            <Image
                                                src="/assets/img/optimized/book-02.webp"
                                                alt="Professional home nursing care services Egypt - Anees Health"
                                                width={400}
                                                height={400}
                                                className="img-fluid"
                                                sizes="(max-width: 576px) 50vw, 400px"
                                                style={{ width: '100%', height: 'auto' }}
                                                loading="lazy"
                                                quality={85}
                                            />
                                    </div>
                                    <div className="col-sm-6 aos" data-reveal>
                                            <Image
                                                src="/assets/img/optimized/book-03.webp"
                                                alt="Home physiotherapy session for rehabilitation - Anees Health Egypt"
                                                width={400}
                                                height={400}
                                                className="img-fluid"
                                                sizes="(max-width: 576px) 50vw, 400px"
                                                style={{ width: '100%', height: 'auto' }}
                                                loading="lazy"
                                                quality={85}
                                            />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div
                                className="section-header sec-header-one mb-2 aos"
                                data-reveal
                            >
                                <span className="badge badge-primary">{t('home.booking.title')}</span>
                                <h2 className="text-white mb-3">
                                    {t('home.booking.subtitle')}{" "}
                                    <span className="text-primary-gradient">
                                        
                                    </span>
                                </h2>
                            </div>
                            <p className="text-light mb-4">
                                {t('home.booking.description')}
                            </p>
                            <div className="faq-info aos" data-reveal>
                                <div className="accordion" id={faqParentId}>
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id={headingOneId}>
                                            <Link
                                                href="#"
                                                className="accordion-button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseOneId}`}
                                                aria-expanded="true"
                                                aria-controls={collapseOneId}
                                            >
                                                01 . {t('home.booking.vision')}
                                            </Link>
                                        </h2>
                                        <div
                                            id={collapseOneId}
                                            className="accordion-collapse collapse show"
                                            aria-labelledby={headingOneId}
                                            data-bs-parent={`#${faqParentId}`}
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.booking.vision_text')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* /FAQ Item */}
                                    {/* FAQ Item */}
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id={headingTwoId}>
                                            <Link
                                                href="#"
                                                className="accordion-button collapsed"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseTwoId}`}
                                                aria-controls={collapseTwoId}
                                            >
                                                02 . {t('home.booking.mission')}
                                            </Link>
                                        </h2>
                                        <div
                                            id={collapseTwoId}
                                            className="accordion-collapse collapse"
                                            aria-labelledby={headingTwoId}
                                            data-bs-parent={`#${faqParentId}`}
                                        >
                                            <div className="accordion-body">
                                                <div className="accordion-content">
                                                    <p>
                                                        {t('home.booking.mission_text')}
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
                    <div className="bookus-sec">
                        <div className="row g-4">
                            <div className="col-lg-3">
                                <div className="book-item">
                                    <div className="book-icon bg-primary">
                                        <i className="isax isax-search-normal5" />
                                    </div>
                                    <div className="book-info">
                                        <h6 className="text-white mb-2">{t('home.booking.search_doctors')}</h6>
                                        <p className="fs-14 text-light">
                                            {t('home.booking.search_doctors_desc')}
                                        </p>
                                    </div>
                                    <div className="way-icon">
                                        <img src="assets/img/icons/way-iconv2.svg" alt="img" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3">
                                <div className="book-item">
                                    <div className="book-icon bg-orange">
                                        <i className="isax isax-security-user5" />
                                    </div>
                                    <div className="book-info">
                                        <h6 className="text-white mb-2">{t('home.booking.check_profile')}</h6>
                                        <p className="fs-14 text-light">
                                            {t('home.booking.check_profile_desc')}
                                        </p>
                                    </div>
                                    <div className="way-icon">
                                        <img src="assets/img/icons/way-iconv2.svg" alt="img" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3">
                                <div className="book-item">
                                    <div className="book-icon bg-cyan">
                                        <i className="isax isax-calendar5" />
                                    </div>
                                    <div className="book-info">
                                        <h6 className="text-white mb-2">{t('home.booking.schedule')}</h6>
                                        <p className="fs-14 text-light">
                                            {t('home.booking.schedule_desc')}
                                        </p>
                                    </div>
                                    <div className="way-icon">
                                        <img src="assets/img/icons/way-iconv2.svg" alt="img" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3">
                                <div className="book-item">
                                    <div className="book-icon bg-indigo">
                                        <i className="isax isax-blend5" />
                                    </div>
                                    <div className="book-info">
                                        <h6 className="text-white mb-2">{t('home.booking.get_solution')}</h6>
                                        <p className="fs-14 text-light">
                                            {t('home.booking.get_solution_desc')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* /Bookus Section */}
        </>

    )
}

export default SectionBook


