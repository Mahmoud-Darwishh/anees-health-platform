'use client';

import React from 'react'
import CountUp from "react-countup";
import Slider from "react-slick";
import { useTranslations } from 'next-intl';


const SectionTestimonial: React.FC = () => {
    const t = useTranslations();
    const TestimonialSlider = {
        slidesToShow:8,
        slidesToScroll: 1,
        dots: false,
        arrows: false,
        infinite: true,
        focusOnSelect: true,
        responsive: [
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 8,
                },
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 4,
                },
            },
            {
                breakpoint: 580,
                settings: {
                    slidesToShow: 2,
                },
            },
            {
                breakpoint: 0,
                settings: {
                    vertical: false,
                    slidesToShow: 1,
                },
            },
        ],
    };
    

    return (
        <div>
            {/* Testimonial Section */}
            <section className="testimonial-section-one">
                <div className="container">
                    <div className="section-header sec-header-one text-center aos" data-aos="fade-up">
                        <span className="badge badge-primary">{t('home.testimonials.title')}</span>
                        <h2>{t('home.testimonials.subtitle')}</h2>
                    </div>
                                        
                    {/* /Testimonial Slider */}
                    {/* Counter */}
                    <div className="testimonial-counter">
                        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 row-gap-4">
                            <div className="counter-item text-center aos" data-aos="fade-up">
                                <h6 className="display-6 main-count">
                                    <CountUp
                                        end={100}
                                        duration={5}
                                        className="counter animated fadeInDownBig"
                                    />+</h6>
                                <p>{t('home.testimonials.doctors_available')}</p>
                            </div>
                            <div className="counter-item text-center aos" data-aos="fade-up" >
                                <h6 className="display-6 main-count">
                                    <CountUp
                                        end={10}
                                        duration={5}
                                        className="counter animated fadeInDownBig"
                                    />+</h6>
                                <p>{t('home.testimonials.specialities')}</p>
                            </div>
                            <div className="counter-item text-center aos" data-aos="fade-up">
                                <h6 className="display-6 main-count">
                                    <CountUp
                                        end={30}
                                        duration={5}
                                        className="counter animated fadeInDownBig"
                                    />+</h6>
                                <p>{t('home.testimonials.bookings_done')}</p>
                            </div>
                            <div className="counter-item text-center aos" data-aos="fade-up">
                                <h6 className="display-6 main-count">
                                    <CountUp
                                        end={20}
                                        duration={5}
                                        className="counter animated fadeInDownBig"
                                    />+</h6>
                                <p>{t('home.testimonials.hospitals_clinics')}</p>
                            </div>
                            <div className="counter-item text-center  aos" data-aos="fade-up">
                                <h6 className="display-6 main-count">
                                    <CountUp
                                        end={35}
                                        duration={5}
                                        className="counter animated fadeInDownBig"
                                    />+</h6>
                                <p>{t('home.testimonials.services_available')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* /Counter */}
            </section>
            {/* /Testimonial Section */}

            <section className="company-section bg-deer aos" data-aos="fade-up">
                <div className="container">
                    <div className="section-header sec-header-one text-center">
                        <h6 className="text-light">
                            {t('home.testimonials.experience_title')}
                        </h6>
                    </div>
                    <div className=" company-slider slick-margins">
                        <Slider {...TestimonialSlider}>
                            <div>
                                <img src="assets/img/company/saudi-german-hospital.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/cleopatra.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/as-salam.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/dar-elfouad.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/andalusia.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/57357.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/Ganzouri.png" alt="img" />
                            </div>
                            <div>
                                <img src="assets/img/company/Shifa.png" alt="img" />
                            </div>
                        </Slider>

                    </div>
                </div>
            </section>

        </div >
    )
}

export default SectionTestimonial


