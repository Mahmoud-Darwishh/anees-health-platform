'use client';

import React from 'react';
import Link from 'next/link';
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

    // WhatsApp shortcut — matches src/components/common/WhatsAppButton.tsx
    const whatsappPhone = '201055164595';
    const whatsappMessage = encodeURIComponent(t('home.banner.chatWithDoctorIntro'));
    const whatsappHref = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

    return (
        <section className="banner-section banner-sec-one" aria-labelledby="home-hero-title">
            <div className="container">
                <div className="banner-content banner-content--centered banner-animate-in">

                    {/* Operator positioning eyebrow */}
                    <span className="banner-eyebrow animate-slide-up" data-delay="0.1">
                        <span className="banner-eyebrow__dot" aria-hidden="true" />
                        {t('home.banner.operator_badge')}
                    </span>

                    <h1 id="home-hero-title" className="banner-title animate-slide-up" data-delay="0.2">
                        <span className="banner-title__line banner-title__highlight">{t('home.banner.title_highlight')}</span>
                        <span className="banner-title__line">{t('home.banner.title_rest').trim()}</span>
                    </h1>

                    <p className="banner-subtitle animate-slide-up" data-delay="0.3">
                        {t('home.banner.professional_subtitle')}
                    </p>

                    {/* CTAs: primary low-friction chat + secondary high-intent booking */}
                    <div className="banner-cta-row animate-slide-up" data-delay="0.4">
                        <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-banner-primary"
                        >
                            <i className="feather-message-circle" aria-hidden="true" />
                            <span>{t('home.banner.chatWithDoctor')}</span>
                            <i className="feather-arrow-right btn-banner-primary__arrow" aria-hidden="true" />
                        </a>
                        <a href="#packages" className="btn-banner-secondary">
                            <i className="feather-package" aria-hidden="true" />
                            <span>{t('home.banner.viewPackages')}</span>
                        </a>
                    </div>

                    {/* Compact trust strip — keep ★ rating for SEO/AggregateRating */}
                    <div className="banner-trust-strip animate-slide-up" data-delay="0.5">
                        <span
                            className="banner-trust-strip__item"
                            aria-label={`${t('home.banner.trust_score')}: 4.8 ${t('home.banner.out_of')} 5`}
                        >
                            <span className="banner-trust-strip__stars" aria-hidden="true">★★★★★</span>
                            <strong>4.8</strong>
                            <span className="banner-trust-strip__muted">
                                · {t('home.banner.trusted_by')} <strong>1,000+</strong> {t('home.banner.patients')}
                            </span>
                        </span>
                        <span className="banner-trust-strip__divider" aria-hidden="true" />
                        <span className="banner-trust-strip__item">
                            <i className="isax isax-shield-tick" aria-hidden="true" />
                            {t('home.banner.licensed_verified')}
                        </span>
                        <span className="banner-trust-strip__divider" aria-hidden="true" />
                        <span className="banner-trust-strip__item">
                            <i className="isax isax-profile-2user" aria-hidden="true" />
                            {t('home.banner.dedicated_team')}
                        </span>
                    </div>

                    {/* Quick Service Pills */}
                    <div className="service-pills-section animate-slide-up" data-delay="0.6">
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
        </section>
    );
};

export default HomeBanner;
