'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Slider from "react-slick";
import { useTranslations, useLocale } from 'next-intl';

const SectionSpeciality: React.FC = () => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar';
    const [slider, setSlider] = useState<any>(null);
    const [slidesToShow, setSlidesToShow] = useState<number>(2);
    
    const resolveSlides = useMemo(() => {
        const resolver = (width: number) => {
            if (width >= 1440) return 8;
            if (width >= 1200) return 6;
            if (width >= 992) return 5;
            if (width >= 768) return 4;
            if (width >= 640) return 3;
            return 2;
        };
        return resolver;
    }, []);

    useEffect(() => {
        const handleResize = () => setSlidesToShow(resolveSlides(window.innerWidth));
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [resolveSlides]);

    useEffect(() => {
        // Re-initialize slider when language changes
        if (slider) {
            slider.slickGoTo(0);
        }
    }, [locale, slider, slidesToShow]);
    
    interface ArrowProps {
        onClick?: React.MouseEventHandler<HTMLButtonElement>;
    }

    const CustomNextArrow: React.FC<ArrowProps> = ({ onClick }) => (
        <div className="spciality-nav nav-bottom owl-nav">
            <button type="button" role="presentation" className="owl-next" onClick={onClick}>
                <i className="fa-solid fa-chevron-right" />
            </button>
        </div>
    );

    const CustomPrevArrow: React.FC<ArrowProps> = ({ onClick }) => (
        <div className="spciality-nav nav-bottom owl-nav">
            <button type="button" role="presentation" className="owl-prev" onClick={onClick}>
                <i className="fa-solid fa-chevron-left" />
            </button>
        </div>
    );

    const SpecialitySlider = {
        slidesToShow,
        slidesToScroll: 1,
        dots: false,
        arrows: true,
        nextArrow: <CustomNextArrow />,
        prevArrow: <CustomPrevArrow />,
        infinite: true,
        rtl: isRTL,
        initialSlide: 0,
        speed: 500,
        cssEase: 'ease-in-out',
        focusOnSelect: false,
        lazyLoad: 'ondemand' as const,
        swipe: true,
        swipeToSlide: true,
        touchThreshold: 10,
        touchMove: true,
        responsive: [
            {
                breakpoint: 1440,
                settings: {
                    slidesToShow: 8,
                    rtl: isRTL,
                    swipe: true,
                    touchMove: true,
                },
            },
            {
                breakpoint: 1200,
                settings: {
                    slidesToShow: 6,
                    rtl: isRTL,
                    swipe: true,
                    touchMove: true,
                },
            },
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 5,
                    rtl: isRTL,
                    swipe: true,
                    touchMove: true,
                },
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 4,
                    rtl: isRTL,
                    swipe: true,
                    touchMove: true,
                },
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 3,
                    rtl: isRTL,
                    arrows: false,
                    swipe: true,
                    touchMove: true,
                },
            },
        ],
    };

    return (
        <>
            {/* Speciality Section */}
            <section className="speciality-section">
                <div className="container">
                    <div
                        className="section-header sec-header-one text-center aos"
                        data-reveal
                    >
                        <span className="badge badge-primary">{t('home.specialities.title')}</span>
                        <h2>{t('home.specialities.subtitle')}</h2>
                    </div>
                    <div className="spciality-slider slick-margins slick-arrow-center aos" data-reveal>
                        <Slider ref={setSlider} {...SpecialitySlider}>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/cardio.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-01.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.cardiology')}</Link>
                                </h6>
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/Ortho.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-02.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.orthopedics')}</Link>
                                </h6>
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/GIT.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-033.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.gastroenterology')}</Link>
                                </h6>
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/geriatrics.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/geriatrics.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.geriatrics')}</Link>
                                </h6>
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/psychiatry.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-05.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.psychiatry')}</Link>
                                </h6>
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/Endocrine.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-06.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.endocrinology')}</Link>
                                </h6>
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/Pulmonology.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-07.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.pulmonology')}</Link>
                                </h6>
                            </div>
                            
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/Nephro.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-08.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.nephrology')}</Link>
                                </h6>
                                
                            
                            </div>
                            <div className="spaciality-item">
                                <div className="spaciality-img">
                                    <img src="assets/img/specialities/Neuro.png" alt="img" />
                                    <span className="spaciality-icon">
                                        <img
                                            src="assets/img/specialities/speciality-icon-03.svg"
                                            alt="img"
                                        />
                                    </span>
                                </div>
                                <h6>
                                    <Link href={`/${locale}/doctors`}>{t('home.specialities.neurology')}</Link>
                                </h6>

                            </div>
                        </Slider>

                    </div>
                    <div className="spciality-nav nav-bottom owl-nav" />
                </div>
            </section>
            {/* /Speciality Section */}
        </>

    )
}

export default SectionSpeciality




