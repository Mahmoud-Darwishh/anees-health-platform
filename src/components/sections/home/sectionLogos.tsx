import React from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionLogos.module.scss';

interface ClientLogo {
    id: number;
    image: string;
    alt: string;
    width: number;
    height: number;
}

const clientLogos: ClientLogo[] = [
    { id: 1, image: '/logos/andalusia.jpeg',       alt: 'Andalusia Hospital',         width: 160, height: 80 },
    { id: 2, image: '/logos/alahly.png',           alt: 'Al Ahly SC',                 width: 160, height: 80 },
    { id: 3, image: '/logos/saudi-german.png',     alt: 'Saudi German Hospital',      width: 160, height: 80 },
    { id: 4, image: '/logos/cleopatra.jpg',        alt: 'Cleopatra Hospitals Group',  width: 160, height: 80 },
    { id: 5, image: '/logos/cairo-university.png', alt: 'Cairo University',           width: 160, height: 80 },
    { id: 6, image: '/logos/almehwar.png',         alt: 'Almehwar',                   width: 160, height: 80 },
    { id: 7, image: '/logos/dar-foaud.png',        alt: 'Dar Fouad',                  width: 160, height: 80 },
    { id: 8, image: '/logos/shifa.png',            alt: 'Shifa',                      width: 160, height: 80 },
];

const SectionLogos: React.FC = () => {
    const t = useTranslations();

    return (
        <Reveal as="section" className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.badge}>
                        {t('home.testimonials.hub_title')}
                    </span>
                    <h2 className={styles.heading}>
                        {t('home.testimonials.experience_title')}
                    </h2>
                </div>

                <div className={styles.grid}>
                    {clientLogos.map((logo) => (
                        <div key={logo.id} className={styles.tile}>
                            <Image
                                src={logo.image}
                                alt={logo.alt}
                                width={logo.width}
                                height={logo.height}
                                className={styles.logo}
                                sizes="(max-width: 575px) 45vw, (max-width: 991px) 28vw, 180px"
                                priority={logo.id <= 4}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </Reveal>
    );
};

export default SectionLogos;
