'use client';

import React, { useState } from 'react'
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

const HomeBanner: React.FC = () => {
    const t = useTranslations();
    const router = useRouter();
    const locale = useLocale();
    const [serviceType, setServiceType] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [doctorQuery, setDoctorQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Build query string
        const params = new URLSearchParams();
        if (doctorQuery) params.append('doctor', doctorQuery);
        if (specialty) params.append('specialty', specialty);
        if (serviceType) params.append('service', serviceType);
        
        // Navigate to doctors page with query params
        router.push(`/${locale}/doctors${params.toString() ? '?' + params.toString() : ''}`);
    };

    return (

        <>
            {/* Home Banner */}
            <section className="banner-section banner-sec-one">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-7">
                            <div className="banner-content">
                                
                                <h1 className="display-5 mb-4">
                                    <span style={{ color: '#aa8642' }}>{t('home.banner.title_highlight')}</span><span>{t('home.banner.title_rest')}</span>
                                </h1>
                                <div className="search-box-one">
                                    <form onSubmit={handleSearch} className="d-flex flex-wrap gap-2 align-items-center">
                                        {/* Doctor Search Input */}
                                        <div className="search-input search-calendar-line flex-grow-1">
                                            <i className="isax isax-user-search search-icon" aria-hidden="true" />
                                            <input
                                                type="text"
                                                id="doctor-search"
                                                name="doctor-search"
                                                className="form-control"
                                                placeholder={t('home.banner.search_doctor')}
                                                value={doctorQuery}
                                                onChange={(e) => setDoctorQuery(e.target.value)}
                                                aria-label={t('home.banner.search_doctor')}
                                                autoComplete="off"
                                            />
                                        </div>
                                        
                                        {/* Specialty Dropdown */}
                                        <div className="search-input search-map-line flex-grow-1">
                                            <select
                                                id="specialty-select"
                                                name="specialty"
                                                className="form-control form-select"
                                                value={specialty}
                                                onChange={(e) => setSpecialty(e.target.value)}
                                                aria-label={t('home.banner.specialty')}
                                            >
                                                <option value="">{t('home.banner.specialty')}</option>
                                                <option value="cardiology">{t('home.specialities.cardiology')}</option>
                                                <option value="orthopedics">{t('home.specialities.orthopedics')}</option>
                                                <option value="gastroenterology">{t('home.specialities.gastroenterology')}</option>
                                                <option value="geriatrics">{t('home.specialities.geriatrics')}</option>
                                                <option value="psychiatry">{t('home.specialities.psychiatry')}</option>
                                                <option value="endocrinology">{t('home.specialities.endocrinology')}</option>
                                                <option value="pulmonology">{t('home.specialities.pulmonology')}</option>
                                                <option value="nephrology">{t('home.specialities.nephrology')}</option>
                                                <option value="neurology">{t('home.specialities.neurology')}</option>
                                            </select>
                                        </div>
                                        
                                        {/* Service Type Dropdown */}
                                        <div className="search-input search-line flex-grow-1">
                                            <select
                                                id="service-type-select"
                                                name="service-type"
                                                className="form-control form-select"
                                                value={serviceType}
                                                onChange={(e) => setServiceType(e.target.value)}
                                                aria-label={t('home.banner.service_type')}
                                            >
                                                <option value="">{t('home.banner.service_type')}</option>
                                                <option value="telemedicine">{t('home.list.telemedicine')}</option>
                                                <option value="doctor_visit">{t('home.list.doctor_visit')}</option>
                                                <option value="nursing">{t('home.list.nursing')}</option>
                                                <option value="physiotherapy">{t('home.list.physiotherapy')}</option>
                                                <option value="lab_testing">{t('home.list.lab_testing')}</option>
                                                <option value="home_radiology">{t('home.list.home_radiology')}</option>
                                            </select>
                                        </div>
                                        
                                        {/* Search Button */}
                                        <div className="form-search-btn">
                                            <button className="btn btn-primary d-flex align-items-center gap-2" type="submit">
                                                <i className="isax isax-search-normal5" aria-hidden="true" />
                                                <span>{t('common.search')}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <div className="banner-img">
                                    <Image
                                        src="/assets/img/optimized/banner-012.webp"
                                        alt="patient-image"
                                        width={600}
                                        height={600}
                                        className="img-fluid"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority
                                        quality={85}
                                    />
                                {/*
                                <div className="banner-appointment">
                                    <h6>1K</h6>
                                    <p>
                                        Appointments <span className="d-block">Completed</span>
                                    </p>
                                </div>
                                <div className="banner-patient">
                                    <div className="avatar-list-stacked avatar-group-sm">
                                        <span className="avatar avatar-rounded">
                                            <img src="assets/img/patients/patient19.jpg" alt="img" />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                            <img src="assets/img/patients/patient16.jpg" alt="img" />
                                        </span>
                                        <span className="avatar avatar-rounded">
                                            <img src="assets/img/patients/patient18.jpg" alt="img" />
                                        </span>
                                    </div>
                                    <p>15K+</p>
                                    <p>Satisfied Patients</p>
                                </div>*/}
                            </div>
                        </div>
                    </div>
                </div> 
                {/* BG Texture and Icons */}
                {/*
                <div className="banner-bg">
                    <img
                        src="assets/img/bg/banner-bg-02.png"
                        alt="img"
                        className="banner-bg-01"
                    />
                    <img
                        src="assets/img/bg/banner-bg-03.png"
                        alt="img"
                        className="banner-bg-02"
                    />
                    <img
                        src="assets/img/bg/banner-bg-04.png"
                        alt="img"
                        className="banner-bg-03"
                    />
                    <img
                        src="assets/img/bg/banner-bg-05.png"
                        alt="img"
                        className="banner-bg-04"
                    />
                    <img
                        src="assets/img/bg/banner-icon-01.svg"
                        alt="img"
                        className="banner-bg-05"
                    />
                    <img
                        src="assets/img/bg/banner-icon-01.svg"
                        alt="img"
                        className="banner-bg-06"
                    />
                </div> */}
            </section>
            {/* /Home Banner */}
        </>


    )
}

export default HomeBanner


