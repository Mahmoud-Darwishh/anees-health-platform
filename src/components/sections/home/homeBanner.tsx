'use client';

import React from 'react'
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

const HomeBanner: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();

    const services = [
        {
            key: 'geriatrics',
            icon: 'feather-heart',
            label: t('home.specialities.geriatrics'),
            href: `/${locale}/booking?service=geriatrics`,
            featured: true,
            badge: t('home.banner.featuredBadge'),
        },
        {
            key: 'nursing',
            icon: 'feather-activity',
            label: t('home.list.nursing'),
            href: `/${locale}/booking?service=nursing`,
        },
        {
            key: 'physiotherapy',
            icon: 'feather-zap',
            label: t('home.list.physiotherapy'),
            href: `/${locale}/booking?service=physiotherapy`,
        },
        {
            key: 'doctor_visit',
            icon: 'feather-user',
            label: t('home.list.doctor_visit'),
            href: `/${locale}/booking?service=doctor_visit`,
        },
        {
            key: 'lab_testing',
            icon: 'feather-droplet',
            label: t('home.list.lab_testing'),
            href: `/${locale}/booking?service=lab_testing`,
        },
        {
            key: 'telemedicine',
            icon: 'feather-video',
            label: t('home.list.telemedicine'),
            href: `/${locale}/booking?service=telemedicine`,
        },
    ];

    return (
        <>
            {/* Home Banner */}
            <section className="banner-section banner-sec-one">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-7 order-2 order-lg-1">
                            <div className="banner-content banner-animate-in">

                                {/* Trust Score Badge */}
                                <div className="trust-block animate-slide-up" data-delay="0.1">
                                    <div className="trust-badge mb-2">
                                        <div className="trust-badge__rating">
                                            <div className="trust-stars" aria-label={`${t('home.banner.trust_score')}: 4.8 ${t('home.banner.out_of')} 5`}>
                                                {[1, 2, 3, 4, 5].map((star, index) => (
                                                    <span key={star} className="star-icon" data-delay={`${0.2 + index * 0.1}`}>
                                                        {star <= 4 ? '★' : '☆'}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="trust-score trust-score-pulse">4.8</span>
                                        </div>
                                        <span className="trust-divider">|</span>
                                        <span className="trust-stats">
                                            {t('home.banner.trusted_by')} <strong className="stat-number-animate">1,000+</strong> {t('home.banner.patients')}
                                        </span>
                                    </div>
                                    <div className="credentials-chips">
                                        <span className="credential-chip credential-animate" data-delay="0.6">
                                            <i className="isax isax-shield-tick" aria-hidden="true" />
                                            {t('home.banner.licensed_verified')}
                                        </span>
                                        <span className="credential-chip credential-animate" data-delay="0.7">
                                            <i className="isax isax-clock" aria-hidden="true" />
                                            {t('home.banner.available_24_7')}
                                        </span>
                                        <span className="credential-chip credential-animate" data-delay="0.8">
                                            <i className="isax isax-call-calling" aria-hidden="true" />
                                            {t('home.banner.instant_booking')}
                                        </span>
                                    </div>
                                </div>

                                <h1 className="banner-title animate-slide-up" data-delay="0.3">
                                    <span className="banner-title__highlight title-underline-animate">{t('home.banner.title_highlight')}</span>
                                    <span>{t('home.banner.title_rest')}</span>
                                </h1>

                                {/* Professional Subtitle */}
                                <p className="banner-subtitle animate-slide-up" data-delay="0.4">
                                    {t('home.banner.professional_subtitle')}
                                </p>

                                {/* Primary CTAs */}
                                <div className="banner-cta-row animate-slide-up">
                                    <Link href={`/${locale}/booking`} className="btn-banner-primary">
                                        <i className="feather-calendar" aria-hidden="true" />
                                        <span>{t('home.banner.bookHomeVisit')}</span>
                                    </Link>
                                    <a href="#packages" className="btn-banner-secondary">
                                        <i className="feather-package" aria-hidden="true" />
                                        <span>{t('home.banner.viewPackages')}</span>
                                    </a>
                                </div>

                                {/* Quick Service Pills */}
                                <div className="service-pills-section animate-slide-up" data-delay="0.9">
                                    <p className="service-pills-label">{t('home.banner.bookByService')}</p>
                                    <div className="service-pills" role="list">
                                        {services.map((service) => (
                                            <Link
                                                key={service.key}
                                                href={service.href}
                                                className={`service-pill${service.featured ? ' service-pill--featured' : ''}`}
                                                role="listitem"
                                            >
                                                <i className={service.icon} aria-hidden="true" />
                                                <span>{service.label}</span>
                                                {service.badge && (
                                                    <span className="pill-badge" aria-label={service.badge}>
                                                        {service.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="col-lg-5 order-1 order-lg-2">
                            <div className="banner-img">
                                <Image
                                    src="/assets/img/optimized/banner-012.webp"
                                    alt="Home healthcare professional visiting patient"
                                    width={600}
                                    height={600}
                                    className="img-fluid"
                                    priority
                                    quality={85}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* /Home Banner */}
        </>
    );
};

export default HomeBanner;
