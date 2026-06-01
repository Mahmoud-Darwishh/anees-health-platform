/**
 * Doctor Profile Content Component
 * Beautiful, production-grade UI with modern design
 * Fully responsive and bilingual
 */

import Image from 'next/image';
import type { Doctor } from '@/lib/models/doctor.types';
import LucideIcon from '@/components/common/LucideIcon';
import { getDoctorSpecialityLabel } from '@/lib/utils/doctor-speciality';

interface DoctorProfileContentProps {
  doctor: Doctor;
  locale: 'en' | 'ar';
}

export default function DoctorProfileContent({
  doctor,
  locale,
}: DoctorProfileContentProps) {
  const isArabic = locale === 'ar';
  const normalizedSpeciality = getDoctorSpecialityLabel(doctor.speciality, locale);
  const city = doctor.location.split(',')[0]?.trim() || doctor.location;
  const hospitalsAndClinics =
    Array.isArray(doctor['Hospitals and Clinics']) && doctor['Hospitals and Clinics'].length > 0
      ? doctor['Hospitals and Clinics']
      : doctor.clinics;

  const teamChannels = Array.isArray(doctor.channels) ? doctor.channels : [];
  const serviceChannels = teamChannels.length > 0 ? teamChannels : ['home', 'video', 'clinic'];

  const labels = {
    about: isArabic ? 'نبذة عن الطبيب' : 'About',
    yearsExp: isArabic ? 'سنوات خبرة' : 'Years of Experience',
    services: isArabic ? 'خيارات الرعاية المتاحة' : 'Available Care Options',
    servicesNote: isArabic
      ? 'يتم تعيين الطبيب المناسب حسب الحالة، ولا يتم الحجز مع طبيب محدد.'
      : 'The most suitable clinician is assigned based on the case. Booking is not with a specific doctor.',
    telemedicine: isArabic ? 'استشارة عن بُعد' : 'Telemedicine',
    homeVisit: isArabic ? 'زيارة منزلية' : 'Home Visit',
    clinicVisit: isArabic ? 'زيارة العيادة' : 'Clinic Visit',
    education: isArabic ? 'التعليم والشهادات' : 'Education & Certifications',
    educationHeading: isArabic ? 'التعليم' : 'Education',
    certifications: isArabic ? 'الشهادات' : 'Certifications',
    clinics: isArabic ? 'المستشفيات والعيادات' : 'Hospitals and Clinics',
    areas: isArabic ? 'مناطق التغطية' : 'Coverage Areas',
    overview: isArabic ? 'الدور الطبي ضمن فريق أنيس' : 'Clinical Role in the Anees Team',
    overviewBody: isArabic
      ? `${doctor.doctorName} عضو في فريق ${normalizedSpeciality} لدى أنيس ويشارك في تقديم الرعاية المنزلية المتخصصة في ${city} والمناطق المغطاة. يتم توجيه كل حالة للعضو الأنسب من الفريق حسب الاحتياج الطبي.`
      : `${doctor.doctorName} is part of Anees ${normalizedSpeciality} team, supporting specialized home healthcare across ${city} and covered areas. Each case is matched with the most suitable team member based on clinical need.`,
    faq: isArabic ? 'أسئلة شائعة' : 'Frequently asked questions',
  };

  const faqItems = isArabic
    ? [
        {
          question: `هل يمكنني طلب ${doctor.doctorName} بالاسم؟`,
          answer:
            'لا، أنيس يعمل بنموذج فريق طبي. يتم إسناد الحالة للعضو الأنسب حسب نوع الحالة ومكانها وتوافر الفريق.',
        },
        {
          question: `ما دور ${doctor.doctorName} داخل الفريق؟`,
          answer: `${doctor.doctorName} يعمل ضمن فريق ${normalizedSpeciality} لتقديم الرعاية المنزلية المتخصصة في ${city} والمناطق المغطاة.`,
        },
        {
          question: 'كيف يتم بدء الخدمة؟',
          answer:
            'ابدأ طلب الخدمة عبر رحلة الحجز العامة في أنيس، ثم يقوم الفريق الطبي بتحديد مقدم الرعاية الأنسب لحالتك.',
        },
      ]
    : [
        {
          question: `Can I book ${doctor.doctorName} directly?`,
          answer:
            'No. Anees operates with a team-based model. Cases are assigned to the most suitable clinician based on needs, location, and availability.',
        },
        {
          question: `What is ${doctor.doctorName}'s role in ${city}?`,
          answer: `${doctor.doctorName} contributes to the Anees ${normalizedSpeciality} team serving patients across ${city} and listed coverage areas.`,
        },
        {
          question: 'How do I start care with Anees?',
          answer:
            'Use the general Anees booking journey, and the clinical team will assign the right team member for your case.',
        },
      ];

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
                    <p className="specialty-badge">{normalizedSpeciality}</p>
                  </div>

                  {/* Inline meta row: verified + availability + location + languages */}
                  <div className="info-inline">
                    <span className="status-pill verified">
                      <LucideIcon iconClass="fa-solid fa-shield-halved" aria-hidden="true"></LucideIcon>
                      {isArabic ? 'موثق' : 'Verified'}
                    </span>
                    <span className="status-pill availability">
                      <LucideIcon iconClass="fa-solid fa-heart-pulse" aria-hidden="true"></LucideIcon>
                      {doctor.availabilityStatus}
                    </span>
                    <div className="location-chip">
                      <LucideIcon iconClass="fa-solid fa-location-dot"></LucideIcon>
                      <span>{doctor.location}</span>
                    </div>
                    {doctor.languages.length > 0 && (
                      <div className="languages-list">
                        <LucideIcon iconClass="fa-solid fa-globe"></LucideIcon>
                        <span>{doctor.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="stats-row">
                    <div className="stat-box">
                      <div className="stat-value">{doctor.experienceYears}+</div>
                      <div className="stat-label">{labels.yearsExp}</div>
                    </div>
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

      <section className="doctor-about py-2">
        <div className="container">
          <h2 className="section-title">{labels.overview}</h2>
          <div className="about-content">
            <p className="bio-text">{labels.overviewBody}</p>
          </div>
        </div>
      </section>

      {/* ======= CARE OPTIONS ======= */}
      <section className="doctor-services py-4">
        <div className="container">
          <h2 className="section-title">{labels.services}</h2>
          <p className="section-note">{labels.servicesNote}</p>
          <div className="services-grid">
            {serviceChannels.map((channel, idx) => {
              const normalized = String(channel).trim().toLowerCase();
              const isVideo = /video|فيديو|مرئي|فديو/i.test(normalized);
              const isChat = /chat|شات|دردشة|محادثة/i.test(normalized);
              const isHome = /home|منزل|منزلي|زيارة\s*منزل/i.test(normalized);
              const isPhysio = /physio|physiotherapy|rehab|علاج\s*طبيعي|تأهيل/i.test(normalized);
              const isClinic = /clinic|عيادة|مركز|hospital|مستشفى/i.test(normalized);

              const iconClass = isVideo
                ? 'fa-solid fa-video'
                : isChat
                  ? 'fa-solid fa-message'
                  : isHome
                    ? 'fa-solid fa-house'
                    : isPhysio
                      ? 'fa-solid fa-dumbbell'
                      : isClinic
                        ? 'fa-solid fa-hospital'
                      : 'fa-solid fa-hospital';

              const label = isVideo
                ? labels.telemedicine
                : isHome
                  ? labels.homeVisit
                  : isPhysio
                    ? (isArabic ? 'العلاج الطبيعي والتأهيل' : 'Physio and Rehab')
                    : isClinic
                      ? labels.clinicVisit
                    : isChat
                      ? (isArabic ? 'متابعة رقمية' : 'Digital Follow-up')
                      : String(channel);

              return (
                <div key={`${channel}-${idx}`} className="service-card">
                  <div className="service-icon">
                    <LucideIcon iconClass={iconClass}></LucideIcon>
                  </div>
                  <h3>{label}</h3>
                  <p className="service-desc">
                    {isArabic
                      ? 'ضمن نموذج الرعاية المنزلية المعتمد في أنيس'
                      : 'Provided as part of Anees home healthcare model'}
                  </p>
                </div>
              );
            })}
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
                        <LucideIcon iconClass="fa-solid fa-award"></LucideIcon>
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
                      <LucideIcon iconClass="fa-solid fa-shield-halved"></LucideIcon>
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
      {(doctor.clinicDetails.length > 0 || hospitalsAndClinics.length > 0) && (
        <section className="doctor-clinics py-3">
          <div className="container">
            <h2 className="section-title">{labels.clinics}</h2>
            {hospitalsAndClinics.length > 0 && (
              <div className="network-list" aria-label={labels.clinics}>
                {hospitalsAndClinics.map((item) => (
                  <span key={item} className="network-item">
                    <LucideIcon iconClass="fa-solid fa-hospital"></LucideIcon>
                    {item}
                  </span>
                ))}
              </div>
            )}
            {doctor.clinicDetails.length > 0 && (
              <div className="clinics-grid">
                {doctor.clinicDetails.map((clinic, idx) => (
                <div key={idx} className="clinic-card">
                  <div className="clinic-header">
                    <h3>{clinic.name}</h3>
                    <span className="slots-badge">{clinic.slots}</span>
                  </div>
                  <div className="clinic-details">
                    <p className="clinic-location">
                      <LucideIcon iconClass="fa-solid fa-location-dot"></LucideIcon>
                      {clinic.address}
                    </p>
                    <p className="clinic-hours">
                      <LucideIcon iconClass="fa-solid fa-clock"></LucideIcon>
                      {clinic.hours}
                    </p>
                  </div>
                </div>
                ))}
              </div>
            )}
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
                  <LucideIcon iconClass="fa-solid fa-location-dot"></LucideIcon>
                  {area}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="doctor-faq py-3">
        <div className="container">
          <h2 className="section-title">{labels.faq}</h2>
          <div className="faq-grid">
            {faqItems.map((item) => (
              <div key={item.question} className="faq-card">
                <div className="faq-question-row">
                  <h3 className="faq-question">{item.question}</h3>
                  <span className="faq-icon" aria-hidden="true">
                    <LucideIcon iconClass="fa-solid fa-message-question"></LucideIcon>
                  </span>
                </div>
                <p className="faq-answer">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA removed per request */}
    </div>
  );
}

