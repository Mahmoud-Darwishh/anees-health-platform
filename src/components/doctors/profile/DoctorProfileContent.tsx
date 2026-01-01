/**
 * Doctor Profile Content Component
 * Beautiful, production-grade UI with modern design
 * Fully responsive and bilingual
 */

import Image from 'next/image';
import Link from 'next/link';
import type { Doctor } from '@/lib/models/doctor.types';

interface DoctorProfileContentProps {
  doctor: Doctor;
  locale: 'en' | 'ar';
}

export default function DoctorProfileContent({
  doctor,
  locale,
}: DoctorProfileContentProps) {
  const isArabic = locale === 'ar';

  // Always render numerals in English for consistency across locales
  const formatNumberEn = (value: number | string) =>
    typeof value === 'number' ? value.toLocaleString('en-US') : value;

  const labels = {
    about: isArabic ? 'نبذة عن الطبيب' : 'About',
    experience: isArabic ? 'الخبرة' : 'Experience',
    yearsExp: isArabic ? 'سنوات خبرة' : 'Years Experience',
    patients: isArabic ? 'مرضى' : 'Patients',
    successRate: isArabic ? 'نسبة النجاح' : 'Success Rate',
    services: isArabic ? 'الخدمات والأسعار' : 'Services & Pricing',
    telemedicine: isArabic ? 'استشارة عن بُعد' : 'Telemedicine',
    homeVisit: isArabic ? 'زيارة منزلية' : 'Home Visit',
    clinicVisit: isArabic ? 'زيارة العيادة' : 'Clinic Visit',
    education: isArabic ? 'التعليم والشهادات' : 'Education & Certifications',
    educationHeading: isArabic ? 'التعليم' : 'Education',
    certifications: isArabic ? 'الشهادات' : 'Certifications',
    clinics: isArabic ? 'العيادات' : 'Clinics',
    reviews: isArabic ? 'آراء المرضى' : 'Patient Reviews',
    availability: isArabic ? 'التوفر' : 'Availability',
    bookNow: isArabic ? 'احجز الآن' : 'Book Now',
    languages: isArabic ? 'اللغات' : 'Languages',
    areas: isArabic ? 'مناطق التغطية' : 'Coverage Areas',
  };

  return (
    <div className="doctor-profile-container">
      {/* ======= HERO SECTION ======= */}
      <section className="doctor-profile-hero">
        <div className="container-fluid">
          <div className="hero-bg-gradient"></div>
          <div className="container">
            <div className="row align-items-center py-3">
              {/* Doctor Image */}
              <div className="col-lg-4 col-md-5 mb-4 mb-lg-0 text-center text-lg-start">
                <div className="doctor-image-card">
                  <div className="image-wrapper">
                    <Image
                      src={`/${doctor.image}`}
                      alt={doctor.doctorName}
                      width={450}
                      height={450}
                      className="doctor-avatar"
                      priority
                      quality={90}
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="col-lg-8 col-md-7">
                <div className="doctor-hero-info">
                  <h1 className="doctor-name-display">{doctor.doctorName}</h1>

                  <div className="doctor-titles">
                    <p className="professional-title">{doctor.professionalTitle}</p>
                    <p className="specialty-badge">{doctor.speciality}</p>
                  </div>

                  {/* Inline meta row: verified + availability + location + languages */}
                  <div className="info-inline">
                    <span className="status-pill verified">
                      <i className="isax isax-shield-tick" aria-hidden="true"></i>
                      {isArabic ? 'موثق' : 'Verified'}
                    </span>
                    <span className="status-pill availability">
                      <i className="isax isax-activity" aria-hidden="true"></i>
                      {doctor.availabilityStatus}
                    </span>
                    <div className="location-chip">
                      <i className="isax isax-location"></i>
                      <span>{doctor.location}</span>
                    </div>
                    {doctor.languages.length > 0 && (
                      <div className="languages-list">
                        <i className="isax isax-global"></i>
                        <span>{doctor.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Key Stats */}
                  <div className="stats-row">
                    <div className="stat-box">
                      <div className="stat-value">{formatNumberEn(doctor.rating)}</div>
                      <div className="stat-label">⭐ {isArabic ? 'تقييم' : 'Rating'}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{formatNumberEn(doctor.experienceYears)}+</div>
                      <div className="stat-label">{labels.yearsExp}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{doctor.totalPatients}</div>
                      <div className="stat-label">{labels.patients}</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{doctor.successRate}</div>
                      <div className="stat-label">{labels.successRate}</div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="cta-buttons">
                    <Link href={`/${locale}/booking`} className="btn btn-primary btn-lg">
                      <i className="isax isax-calendar-1"></i>
                      {labels.bookNow}
                    </Link>
                    <button className="btn btn-outline-primary btn-lg">
                      <i className="isax isax-message"></i>
                      {isArabic ? 'تواصل' : 'Contact'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= ABOUT SECTION ======= */}
      {doctor.bio && (
        <section className="doctor-about py-4">
          <div className="container">
            <h2 className="section-title">{labels.about}</h2>
            <div className="about-content">
              <p className="bio-text">{doctor.bio}</p>
            </div>
          </div>
        </section>
      )}

      {/* ======= SERVICES & PRICING ======= */}
      <section className="doctor-services py-4">
        <div className="container">
          <h2 className="section-title">{labels.services}</h2>
          <div className="services-grid">
            {/* Telemedicine */}
            <div className="service-card">
              <div className="service-icon">
                <i className="isax isax-video"></i>
              </div>
              <h3>{labels.telemedicine}</h3>
              <p className="service-price">{doctor.pricing.telemedicine}</p>
              <p className="service-desc">
                {isArabic ? 'استشارة آمنة من المنزل' : 'Secure online consultation'}
              </p>
            </div>

            {/* Home Visit */}
            <div className="service-card">
              <div className="service-icon">
                <i className="isax isax-home-1"></i>
              </div>
              <h3>{labels.homeVisit}</h3>
              <p className="service-price">{doctor.pricing.homeVisit}</p>
              <p className="service-desc">
                {isArabic ? 'زيارة منزلية مريحة' : 'Convenient home visit'}
              </p>
            </div>

            {/* Clinic Visit */}
            <div className="service-card">
              <div className="service-icon">
                <i className="isax isax-hospital"></i>
              </div>
              <h3>{labels.clinicVisit}</h3>
              <p className="service-price">{doctor.pricing.clinicVisit}</p>
              <p className="service-desc">
                {isArabic ? 'زيارة متخصصة في العيادة' : 'Specialized clinic visit'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= EDUCATION & CERTIFICATIONS ======= */}
      <section className="doctor-education py-4">
        <div className="container">
          <h2 className="section-title">{labels.education}</h2>

          <div className="row">
            {/* Education Column */}
            <div className="col-lg-6 mb-4">
              <div className="education-block">
                <h3 className="block-title">{labels.educationHeading}</h3>
                <div className="education-items">
                  {doctor.education.map((edu, idx) => (
                    <div key={idx} className="education-item">
                      <div className="edu-marker">
                        <i className="isax isax-award"></i>
                      </div>
                      <div className="edu-content">
                        <h4 className="degree">{edu.degree}</h4>
                        <p className="university">{edu.university}</p>
                        <span className="year">{edu.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Certifications Column */}
            <div className="col-lg-6 mb-4">
              <div className="education-block">
                <h3 className="block-title">{labels.certifications}</h3>
                <div className="certifications-items">
                  {doctor.certifications.map((cert, idx) => (
                    <div key={idx} className="certification-item">
                      <i className="isax isax-shield-tick"></i>
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CLINICS ======= */}
      {doctor.clinicDetails.length > 0 && (
        <section className="doctor-clinics py-3">
          <div className="container">
            <h2 className="section-title">{labels.clinics}</h2>
            <div className="clinics-grid">
              {doctor.clinicDetails.map((clinic, idx) => (
                <div key={idx} className="clinic-card">
                  <div className="clinic-header">
                    <h3>{clinic.name}</h3>
                    <span className="slots-badge">{clinic.slots}</span>
                  </div>
                  <div className="clinic-details">
                    <p className="clinic-location">
                      <i className="isax isax-location"></i>
                      {clinic.address}
                    </p>
                    <p className="clinic-hours">
                      <i className="isax isax-clock"></i>
                      {clinic.hours}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======= COVERAGE AREAS ======= */}
      {doctor.areaCoverage.length > 0 && (
        <section className="doctor-coverage py-3">
          <div className="container">
            <h2 className="section-title">{labels.areas}</h2>
            <div className="coverage-areas">
              {doctor.areaCoverage.map((area, idx) => (
                <span key={idx} className="area-badge">
                  <i className="isax isax-location"></i>
                  {area}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======= TESTIMONIALS ======= */}
      {doctor.testimonials.length > 0 && (
        <section className="doctor-testimonials py-3">
          <div className="container">
            <h2 className="section-title">{labels.reviews}</h2>
            <div className="testimonials-grid">
              {doctor.testimonials.map((testimonial, idx) => (
                <div key={idx} className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="stars">
                      {Array.from({ length: Math.floor(testimonial.rating) }).map((_, i) => (
                        <i key={i} className="isax isax-star-1"></i>
                      ))}
                    </div>
                    <span className="rating-number">{testimonial.rating}/5</span>
                  </div>
                  <p className="testimonial-text">&quot;{testimonial.text}&quot;</p>
                  <p className="testimonial-author">— {testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======= CHAT COMING SOON ======= */}
      <section className="doctor-chat py-3">
        <div className="container">
          <div className="chat-coming-soon">
            <div className="chat-icon">
              <i className="isax isax-message-text"></i>
            </div>
            <div>
              <h3>{isArabic ? 'الدردشة قادمة قريباً' : 'Chat Coming Soon'}</h3>
              <p>
                {isArabic
                  ? 'نعمل على إطلاق دردشة آمنة مع الأطباء قريباً.'
                  : 'We are launching secure chat with doctors soon.'}
              </p>
            </div>
            <span className="status-pill muted">
              {isArabic ? 'قيد التطوير' : 'In development'}
            </span>
          </div>
        </div>
      </section>

      {/* Final CTA removed per request */}
    </div>
  );
}
