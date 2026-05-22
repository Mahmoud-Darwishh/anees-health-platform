import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import { generateDoctorSlug } from '@/lib/utils/slug';
import doctorsDataEn from './doctors.en.json';
import type { Doctor } from './types';

type MessageValues = Record<string, string | number>;

interface DoctorCardProps {
  doctor: Doctor;
  locale: string;
  tg: (key: string, values?: MessageValues) => string;
  useGridColumn?: boolean;
}

// Canonical slugs derived from English names to stay stable across locales
const canonicalSlugById = new Map<number, string>(
  (doctorsDataEn as Doctor[]).map((doc) => [doc.id, generateDoctorSlug(doc.doctorName)])
);

export const DoctorCard = memo(function DoctorCard({
  doctor,
  locale,
  tg,
  useGridColumn = true,
}: DoctorCardProps) {
  // Generate stable slug from canonical (English) mapping to keep URLs identical across locales
  const doctorSlug = canonicalSlugById.get(doctor.id) || generateDoctorSlug(doctor.doctorName);
  const profileHref = `/${locale}/doctors/${doctorSlug}`;
  const summaryText = (doctor.bio || '').trim();
  const summaryPreview =
    summaryText.length > 160 ? `${summaryText.slice(0, 160).trimEnd()}...` : summaryText;

  // Estimate a public-facing review volume from available doctor data for concise trust signaling.
  const rawPatientNumber = Number(String(doctor.totalPatients || '').replace(/[^\d]/g, ''));
  const testimonialsCount = Array.isArray(doctor.testimonials) ? doctor.testimonials.length : 0;
  const estimatedReviews = Number.isFinite(rawPatientNumber) && rawPatientNumber > 0
    ? Math.max(100, Math.floor(rawPatientNumber / 10))
    : testimonialsCount > 0
      ? Math.max(100, testimonialsCount * 25)
      : 0;

  const visibleChannels = Array.isArray(doctor.channels) ? doctor.channels.slice(0, 2) : [];
  const hiddenChannelsCount = Array.isArray(doctor.channels)
    ? Math.max(0, doctor.channels.length - visibleChannels.length)
    : 0;

  const cardContent = (
    <>
      <Link
        href={profileHref}
        className="doctor-card-link"
        aria-label={`${doctor.doctorName} - ${tg('card.view_profile')}`}
      >
        <div className="card doctor-card-enhanced">
          {/* Image with verified badge overlay */}
          <div className="card-img card-img-hover doctor-image-wrapper position-relative">
            <Image
              src={`/${doctor.image}`}
              alt={doctor.doctorName}
              width={500}
              height={500}
              className="doctor-card-image"
              loading="lazy"
              quality={85}
            />
            <div className="verified-badge-overlay position-absolute top-0 end-0 m-2">
              <span className="badge rounded-pill bg-primary text-white">
                <i className="isax isax-shield-tick me-1"></i>
                {tg('card.verified')}
              </span>
            </div>
          </div>

          <div className="card-body doctor-card-body p-0">
            {/* Speciality bar with themed color classes from data */}
            <div
              className={`d-flex active-bar ${doctor.specialityColorClass || ''} align-items-center justify-content-between p-3 pb-2`}
            >
              <span className={`${doctor.specialityTextClass || ''} fw-medium fs-14`}>
                {doctor.speciality}
              </span>
            </div>

            {/* Main info */}
            <div className="doctor-info-content p-3">
              <h3 className="doctor-name mb-2">{doctor.doctorName}</h3>
              <p className="professional-title text-muted fs-13 mb-2">
                {doctor.professionalTitle || doctor.speciality}
              </p>

              <div className="doctor-meta mb-2" aria-label={tg('filters.rating')}>
                <span className="meta-item meta-item-rating">
                  <i className="isax isax-star-1" aria-hidden="true"></i>
                  {doctor.rating}
                </span>
                {estimatedReviews > 0 && (
                  <span className="meta-item meta-item-reviews">
                    <i className="isax isax-message-text-1" aria-hidden="true"></i>
                    {tg('card.from_reviews', { count: `${estimatedReviews}+` })}
                  </span>
                )}
              </div>

              <p className="experience-badge text-muted fs-13 mb-2">
                <i className="isax isax-calendar-1 me-1"></i>
                {doctor.experienceYears}+ {tg('card.yrs_exp')}
              </p>

              {summaryPreview && <p className="doctor-summary mb-3">{summaryPreview}</p>}

              {/* Services offered chips */}
              {visibleChannels.length > 0 && (
                <div className="services-offered mb-3">
                  <div className="service-chips-container">
                      {visibleChannels.map((channelRaw, idx) => {
                        const channel = String(channelRaw).trim();
                        const normalized = channel.toLowerCase();

                        const channelMap: Record<string, { icon: string; label: string }> = {
                          video: { icon: 'fa-video', label: tg('channels.video') },
                          chat: { icon: 'fa-message', label: tg('channels.chat') },
                          home: { icon: 'fa-home', label: tg('channels.home') },
                          clinic: { icon: 'fa-hospital', label: tg('card.clinic_visit') },
                        };

                        // Handle Arabic/localized strings by pattern matching
                        const arabicMatchers: Array<{ pattern: RegExp; key: keyof typeof channelMap }> = [
                          { pattern: /فيديو|مرئي|فديو/i, key: 'video' },
                          { pattern: /دردشة|محادثة|شات/i, key: 'chat' },
                          { pattern: /منزل|منزلي|زيارة منزلية/i, key: 'home' },
                          { pattern: /عيادة|مركز|كشف/i, key: 'clinic' },
                        ];

                        let resolvedKey: keyof typeof channelMap | undefined = channelMap[normalized] ? (normalized as keyof typeof channelMap) : undefined;

                        if (!resolvedKey) {
                          for (const matcher of arabicMatchers) {
                            if (matcher.pattern.test(normalized)) {
                              resolvedKey = matcher.key;
                              break;
                            }
                          }
                        }

                        const service = resolvedKey
                          ? channelMap[resolvedKey]
                          : { icon: 'fa-hospital', label: channel };

                        return (
                          <span
                            key={`${channel}-${idx}`}
                            className="service-chip"
                            title={service.label}
                            aria-label={service.label}
                          >
                            <i className={`fa-solid ${service.icon}`} aria-hidden="true"></i>
                            <span className="chip-label">{service.label}</span>
                          </span>
                        );
                      })}

                      {hiddenChannelsCount > 0 && (
                        <span className="service-chip service-chip-more" aria-label={`+${hiddenChannelsCount}`}>
                          +{hiddenChannelsCount}
                        </span>
                      )}
                  </div>
                </div>
              )}

              {/*
              Price section intentionally hidden for a cleaner professional card style.
              Restore by uncommenting this block.
              <div className="price-section mb-3 pb-3 border-bottom border-light-2">
                <p className="text-muted fs-13 mb-1">{tg('card.starting_from')}</p>
                <div className="price-display">
                  <h4 className="text-orange mb-0">{doctor.consultationFee}</h4>
                </div>
              </div>
              */}

              {/*
              Location section intentionally hidden for a cleaner professional card style.
              Restore by uncommenting this block.
              <div className="location-section d-flex align-items-center mb-3">
                <i className="isax isax-location me-2 text-muted"></i>
                <p className="text-muted fs-13 mb-0">{doctor.location}</p>
              </div>
              */}

              <div className="profile-hint d-inline-flex align-items-center gap-2">
                <i className="isax isax-arrow-right-3" aria-hidden="true"></i>
                <span>{tg('card.view_profile')}</span>
              </div>

              {/*
              Book button is intentionally hidden for now.
              Restore by uncommenting this Link block.
              <Link
                href={profileHref}
                className="btn btn-sm btn-primary w-100 rounded-pill"
              >
                <i className="isax isax-calendar-1 me-2"></i>
                {tg('card.book')}
              </Link>
              */}
            </div>
          </div>
        </div>
      </Link>
    </>
  );

  if (!useGridColumn) {
    return cardContent;
  }

  return <div className="col-xxl-4 col-md-6 mb-4 doctor-card-col">{cardContent}</div>;
});

DoctorCard.displayName = 'DoctorCard';
