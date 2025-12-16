'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

const SectionLogos: React.FC = () => {
    const t = useTranslations();

    const clientLogos = [
        { id: 1, image: '/assets/img/clients/Andalusia.jpeg', alt: 'Andalusia Hospital' },
        { id: 2, image: '/assets/img/clients/AlAhly.png', alt: 'Al Ahly SC' },
        { id: 3, image: '/assets/img/clients/cairo university.png', alt: 'Cairo University' },
        { id: 4, image: '/assets/img/clients/cleopatra.jpg', alt: 'Cleopatra Hospitals Group' },
        { id: 5, image: '/assets/img/clients/saudi german hospital.png', alt: 'Saudi German Hospital' },
        { id: 6, image: '/assets/img/clients/Almehwar.png', alt: 'Almehwar' },
        { id: 7, image: '/assets/img/clients/dar-foaud.png', alt: 'Dar Fouad' },
        { id: 8, image: '/assets/img/clients/shifa.png', alt: 'Shifa' },
        
        
    ];

    return (
        <>
            {/* Logos Section */}
            <section className="logo-section py-5">
                <div className="container">
                    <div className="section-header sec-header-one text-center aos">
                        <span className="badge badge-primary">{t('home.testimonials.hub_title')}</span>
                        <h2>{t('home.testimonials.experience_title')}</h2>
                    </div>
                    <div className="row justify-content-center mt-5">
                        {clientLogos.map((logo) => (
                            <div key={logo.id} className="col-lg-2 col-md-3 col-sm-4 col-4 mb-5 aos">
                                <div 
                                    className="logo-item p-3" 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        minHeight: '120px'
                                    }}
                                >
                                    <img 
                                        src={logo.image} 
                                        alt={logo.alt || 'partner-logo'} 
                                        className="img-fluid"
                                        style={{ maxHeight: '80px', objectFit: 'contain' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {/* /Logos Section */}
        </>
    );
};

export default SectionLogos;
