'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const SectionLogos: React.FC = () => {
    const t = useTranslations();

    const clientLogos = [
        { id: 1, image: '/logos/andalusia.jpeg', alt: 'Andalusia Hospital', width: 150, height: 80 },
        { id: 2, image: '/logos/alahly.png', alt: 'Al Ahly SC', width: 150, height: 80 },
        { id: 3, image: '/logos/saudi-german.png', alt: 'Saudi German Hospital', width: 150, height: 80 },
        { id: 4, image: '/logos/cleopatra.jpg', alt: 'Cleopatra Hospitals Group', width: 150, height: 80 },
        { id: 5, image: '/logos/cairo-university.png', alt: 'Cairo University', width: 150, height: 80 },
        { id: 6, image: '/logos/almehwar.png', alt: 'Almehwar', width: 150, height: 80 },
        { id: 7, image: '/logos/dar-foaud.png', alt: 'Dar Fouad', width: 150, height: 80 },
        { id: 8, image: '/logos/shifa.png', alt: 'Shifa', width: 150, height: 80 },
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
                                        minHeight: '120px',
                                        position: 'relative'
                                    }}
                                >
                                    <Image 
                                        src={logo.image}
                                        alt={logo.alt}
                                        width={logo.width}
                                        height={logo.height}
                                        style={{ 
                                            height: 'auto', 
                                            maxHeight: '80px', 
                                            width: 'auto', 
                                            maxWidth: '100%',
                                            objectFit: 'contain' 
                                        }}
                                        priority={logo.id <= 4}
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
