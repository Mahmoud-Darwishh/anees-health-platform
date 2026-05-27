import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import LucideIcon from '@/components/common/LucideIcon';

const HomeBanner: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();

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

                    {/* Clear CTA hierarchy: chat first, services second */}
                    <div className="banner-cta-row animate-slide-up" data-delay="0.4">
                        <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-banner-primary"
                        >
                            <LucideIcon iconClass="fa-solid fa-comment-dots" aria-hidden="true" />
                            <span>{t('home.banner.chatWithDoctor')}</span>
                            <LucideIcon iconClass="fa-solid fa-arrow-right btn-banner-primary__arrow" aria-hidden="true" />
                        </a>
                        <a href={`/${locale}/services`} className="btn-banner-secondary">
                            <LucideIcon iconClass="fa-solid fa-user-doctor" aria-hidden="true" />
                            <span>{t('home.banner.servicesCta')}</span>
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
                            <LucideIcon iconClass="fa-solid fa-shield-halved" aria-hidden="true" />
                            {t('home.banner.licensed_verified')}
                        </span>
                        <span className="banner-trust-strip__divider" aria-hidden="true" />
                        <span className="banner-trust-strip__item">
                            <LucideIcon iconClass="fa-solid fa-user-group" aria-hidden="true" />
                            {t('home.banner.dedicated_team')}
                        </span>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default HomeBanner;

