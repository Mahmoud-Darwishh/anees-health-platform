'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Neighborhood {
  name: string;
  nameAr: string;
}

interface CityData {
  name: string;
  nameAr: string;
  neighborhoods: Neighborhood[];
  heroImage: string;
  description: string;
  descriptionAr: string;
  stats: {
    doctors: number;
    patients: number;
    neighborhoods: number;
  };
}

interface CityPageContentProps {
  cityData: CityData;
  locale: string;
}

const CityPageContent: React.FC<CityPageContentProps> = ({ cityData, locale }) => {
  const t = useTranslations();
  const isArabic = locale === 'ar';

  return (
    <>
      {/* City Hero Section */}
      <section className="city-hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 aos" data-reveal>
              <div className="city-hero-content">
                <h1 className="display-4 fw-bold mb-4">
                  {isArabic ? (
                    <>
                      أنيس هيلث في <span className="text-primary">{cityData.nameAr}</span>
                    </>
                  ) : (
                    <>
                      Anees Health in <span className="text-primary">{cityData.name}</span>
                    </>
                  )}
                </h1>
                <p className="lead mb-4">
                  {isArabic ? cityData.descriptionAr : cityData.description}
                </p>
                <div className="city-stats d-flex flex-wrap gap-4 mb-4">
                  <div className="stat-item">
                    <h3 className="text-primary mb-0">{cityData.stats.doctors}+</h3>
                    <p className="text-muted mb-0">
                      {isArabic ? 'طبيب' : 'Doctors'}
                    </p>
                  </div>
                  <div className="stat-item">
                    <h3 className="text-primary mb-0">{cityData.stats.patients}+</h3>
                    <p className="text-muted mb-0">
                      {isArabic ? 'مريض راضٍ' : 'Satisfied Patients'}
                    </p>
                  </div>
                  <div className="stat-item">
                    <h3 className="text-primary mb-0">{cityData.stats.neighborhoods}+</h3>
                    <p className="text-muted mb-0">
                      {isArabic ? 'حي' : 'Neighborhoods'}
                    </p>
                  </div>
                </div>
                <div className="hero-cta">
                  <Link href={`/${locale}/booking`} className="btn btn-primary btn-lg me-3">
                    {isArabic ? 'احجز الآن' : 'Book Now'}
                  </Link>
                  <Link href={`/${locale}/doctors`} className="btn btn-outline-primary btn-lg">
                    {isArabic ? 'شاهد الأطباء' : 'View Doctors'}
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-6 aos" data-reveal>
              <div className="city-hero-image">
                <Image
                  src={cityData.heroImage}
                  alt={`${isArabic ? 'رعاية صحية منزلية في' : 'Home healthcare in'} ${isArabic ? cityData.nameAr : cityData.name} - Anees Health`}
                  width={600}
                  height={450}
                  className="img-fluid rounded-4 shadow-lg"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Neighborhoods Coverage Section */}
      <section className="neighborhoods-section py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5 aos" data-reveal>
            <h2 className="fw-bold mb-3">
              {isArabic ? 'الأحياء التي نخدمها' : 'Neighborhoods We Serve'}
            </h2>
            <p className="text-muted">
              {isArabic
                ? `نقدم خدماتنا الطبية في جميع أنحاء ${cityData.nameAr}`
                : `We provide medical services across all ${cityData.name}`}
            </p>
          </div>
          <div className="row g-3">
            {cityData.neighborhoods.map((neighborhood, index) => (
              <div key={index} className="col-lg-3 col-md-4 col-sm-6 aos" data-reveal>
                <div className="neighborhood-card card h-100 border-0 shadow-sm hover-lift">
                  <div className="card-body text-center">
                    <i className="fas fa-map-marker-alt text-primary fs-3 mb-3"></i>
                    <h6 className="mb-0">
                      {isArabic ? neighborhood.nameAr : neighborhood.name}
                    </h6>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Highlight */}
      <section className="city-services-section py-5">
        <div className="container">
          <div className="text-center mb-5 aos" data-reveal>
            <h2 className="fw-bold mb-3">
              {isArabic ? 'خدماتنا في' : 'Our Services in'} {isArabic ? cityData.nameAr : cityData.name}
            </h2>
          </div>
          <div className="row g-4">
            {[
              {
                icon: 'fa-user-md',
                titleEn: 'Doctor Home Visits',
                titleAr: 'زيارات الطبيب المنزلية',
                descEn: 'Qualified doctors visit you at home',
                descAr: 'أطباء مؤهلون يزورونك في منزلك',
              },
              {
                icon: 'fa-heartbeat',
                titleEn: 'Home Nursing',
                titleAr: 'التمريض المنزلي',
                descEn: 'Professional nursing care at home',
                descAr: 'رعاية تمريضية احترافية في المنزل',
              },
              {
                icon: 'fa-dumbbell',
                titleEn: 'Physiotherapy',
                titleAr: 'العلاج الطبيعي',
                descEn: 'Physical therapy sessions at home',
                descAr: 'جلسات علاج طبيعي في المنزل',
              },
              {
                icon: 'fa-vial',
                titleEn: 'Lab Tests at Home',
                titleAr: 'التحاليل المنزلية',
                descEn: 'Blood tests and lab services',
                descAr: 'فحوصات الدم والخدمات المعملية',
              },
            ].map((service, index) => (
              <div key={index} className="col-lg-3 col-md-6 aos" data-reveal>
                <div className="service-card card h-100 border-0 shadow-sm hover-lift">
                  <div className="card-body text-center">
                    <div className="service-icon mb-3">
                      <i className={`fas ${service.icon} text-primary fs-1`}></i>
                    </div>
                    <h5 className="mb-3">{isArabic ? service.titleAr : service.titleEn}</h5>
                    <p className="text-muted mb-0">
                      {isArabic ? service.descAr : service.descEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-5 aos" data-reveal>
            <Link href={`/${locale}/services`} className="btn btn-primary btn-lg">
              {isArabic ? 'شاهد جميع الخدمات' : 'View All Services'}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="city-cta-section py-5 bg-primary text-white">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8 aos" data-reveal>
              <h2 className="fw-bold mb-3">
                {isArabic
                  ? `جاهزون لخدمتك في ${cityData.nameAr}`
                  : `Ready to Serve You in ${cityData.name}`}
              </h2>
              <p className="mb-0 fs-5">
                {isArabic
                  ? 'احجز موعدك الآن واستمتع بخدمات رعاية صحية احترافية في منزلك'
                  : 'Book your appointment now and enjoy professional healthcare services at your home'}
              </p>
            </div>
            <div className="col-lg-4 text-lg-end aos" data-reveal>
              <Link href={`/${locale}/booking`} className="btn btn-light btn-lg px-5">
                {isArabic ? 'احجز الآن' : 'Book Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .city-hero-section {
          padding: 100px 0 80px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .neighborhoods-section {
          padding: 80px 0;
        }

        .city-services-section {
          padding: 80px 0;
        }

        .city-cta-section {
          padding: 60px 0;
        }

        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
        }

        .stat-item h3 {
          font-size: 2.5rem;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .city-hero-section {
            padding: 60px 0 40px;
          }
          
          .stat-item h3 {
            font-size: 2rem;
          }
        }
      `}</style>
    </>
  );
};

export default CityPageContent;
