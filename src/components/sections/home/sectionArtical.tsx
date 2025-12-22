'use client';

import React from 'react'
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const SectionArtical: React.FC = () => {
    const t = useTranslations();
    return (
        <div>
            <>
                {/* Article Section */}
                <section className="article-section">
                    <div className="container">
                        <div
                            className="section-header sec-header-one text-center aos"
                            data-reveal
                        >
                            <span className="badge badge-primary">{t('home.articles.badge')}</span>
                            <h2>{t('home.articles.title')}</h2>
                        </div>
                        <div className="row g-4">
                            <div className="col-lg-6">
                                <div className="article-item aos" data-reveal>
                                    <div className="article-img">
                                        <a
                                            href="https://www.facebook.com/share/p/1AC323K9G8/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Open related article on Facebook"
                                        >
                                            <img
                                                src="assets/img/blog/article-01.png"
                                                className="img-fluid"
                                                alt="img"
                                            />
                                        </a>
                                        <div className="date-icon">
                                            <span>15</span>May
                                        </div>
                                    </div>
                                    <div className="article-info">
                                        <span className="badge badge-cyan mb-2">{t('home.articles.ophthalmology')}</span>
                                        <h6 className="mb-2">
                                            <a
                                                href="https://www.facebook.com/share/p/1AC323K9G8/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Open related article on Facebook"
                                            >
                                                {t('home.articles.article1_title')}
                                            </a>
                                        </h6>
                                        <p>
                                            {t('home.articles.article1_desc')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <div className="article-item aos" data-reveal>
                                    <div className="article-img">
                                        <a
                                            href="https://www.facebook.com/share/p/1AC323K9G8/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Open related article on Facebook"
                                        >
                                            <img
                                                src="assets/img/blog/article-02.png"
                                                className="img-fluid"
                                                alt="img"
                                            />
                                        </a>
                                        <div className="date-icon">
                                            <span>18</span>May
                                        </div>
                                    </div>
                                    <div className="article-info">
                                        <span className="badge badge-cyan mb-2">{t('home.articles.cardiology')}</span>
                                        <h6 className="mb-2">
                                            <a
                                                href="https://www.facebook.com/share/p/1AC323K9G8/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Open related article on Facebook"
                                            >
                                                {t('home.articles.article2_title')}
                                            </a>
                                        </h6>
                                        <p>
                                            {t('home.articles.article2_desc')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {/*
                            <div className="col-lg-6">
                                <div className="article-item aos" data-reveal>
                                    <div className="article-img">
                                        <Link href="/blog/blog-details">
                                            <img
                                                src="assets/img/blog/article-03.jpg"
                                                className="img-fluid"
                                                alt="img"
                                            />
                                        </Link>
                                        <div className="date-icon">
                                            <span>21</span>Apr
                                        </div>
                                    </div>
                                    <div className="article-info">
                                        <span className="badge badge-cyan mb-2">Dental</span>
                                        <h6 className="mb-2">
                                            <Link href="/blog/blog-details">
                                                5 Essential Tips for Maintaining Optimal Oral Health
                                            </Link>
                                        </h6>
                                        <p>Learn the top five daily practices to keep your teeth....</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <div className="article-item aos" data-reveal>
                                    <div className="article-img">
                                        <Link href="/blog/blog-details">
                                            <img
                                                src="assets/img/blog/article-04.jpg"
                                                className="img-fluid"
                                                alt="img"
                                            />
                                        </Link>
                                        <div className="date-icon">
                                            <span>22</span>Jan
                                        </div>
                                    </div>
                                    <div className="article-info">
                                        <span className="badge badge-cyan mb-2">
                                            Care &amp; Treatment
                                        </span>
                                        <h6 className="mb-2">
                                            <Link href="/blog/blog-details">
                                                Beating Strong: The Digital Revol in Cardiac Care
                                            </Link>
                                        </h6>
                                        <p>
                                            Discover how digital advancements are transforming cardiac
                                            care...
                                        </p>
                                    </div>
                                </div>
                            </div> */}
                        </div> 
                        <div className="text-center load-item aos" data-reveal>
                            <a
                                href="https://www.facebook.com/share/p/1AC323K9G8/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-dark"
                                aria-label={t('home.articles.continue_facebook_aria')}
                            >
                                {t('home.articles.continue_facebook')}
                                <i className="isax isax-arrow-right-3 ms-2" />
                            </a>
                        </div>
                    </div>
                </section>
                {/* /Article Section */}
                {/* Info Section */} {/*
                <section className="info-section">
                    <div className="container">
                        <div className="contact-info">
                            <div className="d-lg-flex align-items-center justify-content-between w-100 gap-4">
                                <div className="mb-4 mb-lg-0 aos" data-reveal>
                                    <h6 className="display-6 text-white">
                                        Working for Your Better Health.
                                    </h6>
                                </div>
                                <div
                                    className="d-sm-flex align-items-center justify-content-lg-end gap-4 aos"
                                    data-reveal
                                >
                                    <div className="con-info d-flex align-items-center mb-3 mb-sm-0">
                                        <span className="con-icon">
                                            <i className="isax isax-headphone" />
                                        </span>
                                        <div className="ms-2">
                                            <p className="text-white mb-1">Customer Support</p>
                                            <p className="text-white fw-medium mb-0">+20 10 55164595</p>
                                        </div>
                                    </div>
                                    <div className="con-info d-flex align-items-center">
                                        <span className="con-icon">
                                            <i className="isax isax-message-2" />
                                        </span>
                                        <div className="ms-2">
                                            <p className="text-white mb-1">Drop Us an Email</p>
                                            <p className="text-white fw-medium mb-0">
                                                info@aneeshealth.com
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section> */}
                {/* /Info Section */}
            </>

        </div>
    )
}

export default SectionArtical


