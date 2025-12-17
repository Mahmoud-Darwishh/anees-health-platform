import Image from 'next/image';
import Link from 'next/link';
import type { Doctor } from './types';

type MessageValues = Record<string, string | number>;

interface DoctorCardProps {
  doctor: Doctor;
  locale: string;
  tg: (key: string, values?: MessageValues) => string;
}

export const DoctorCard = ({ doctor, locale, tg }: DoctorCardProps) => {
  return (
    <div className="col-xxl-4 col-md-6 mb-4">
      <div className="card doctor-card-enhanced">
        {/* Image with verified badge overlay */}
        <div className="card-img card-img-hover doctor-image-wrapper position-relative">
          <Link href={`/${locale}/doctors/${doctor.id}`}>
            <Image
              src={`/${doctor.image}`}
              alt={doctor.doctorName}
              width={500}
              height={500}
              className="doctor-card-image"
            />
          </Link>
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
            <Link href="#" className={`${doctor.specialityTextClass || ''} fw-medium fs-14`}>
              {doctor.speciality}
            </Link>
          </div>

          {/* Main info */}
          <div className="doctor-info-content p-3">
            <h3 className="doctor-name mb-2">
              <Link href={`/${locale}/doctors/${doctor.id}`}>{doctor.doctorName}</Link>
            </h3>
            <p className="professional-title text-muted fs-13 mb-2">
              {doctor.professionalTitle || doctor.speciality}
            </p>
            <p className="experience-badge text-muted fs-13 mb-3">
              <i className="isax isax-calendar-1 me-1"></i>
              {doctor.experienceYears}+ {tg('card.yrs_exp')}
            </p>

            {/* Services offered chips */}
            {doctor.channels && doctor.channels.length > 0 && (
              <div className="services-offered mb-3">
                <div className="service-chips-container">
                    {doctor.channels.map((channel) => {
                      const channelMap: Record<string, { icon: string; label: string }> = {
                        video: { icon: 'fa-video', label: tg('channels.video') },
                        chat: { icon: 'fa-message', label: tg('channels.chat') },
                        Home: { icon: 'fa-home', label: tg('channels.home') },
                        clinic: { icon: 'fa-hospital', label: tg('card.clinic_visit') },
                      };
                      const service = channelMap[channel] || { icon: 'fa-hospital', label: channel };
                    return (
                      <span key={channel} className="service-chip" title={service.label} aria-label={service.label}>
                        <i className={`fa-solid ${service.icon}`} aria-hidden="true"></i>
                        <span className="chip-label">{service.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price section */}
            <div className="price-section mb-3 pb-3 border-bottom border-light-2">
              <p className="text-muted fs-13 mb-1">{tg('card.starting_from')}</p>
              <div className="price-display">
                <h4 className="text-orange mb-0">{doctor.consultationFee}</h4>
                {doctor.maxConsultationFee && (
                  <p className="text-muted fs-12 mb-0">
                    {tg('card.to')} {doctor.maxConsultationFee}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="location-section d-flex align-items-center mb-3">
              <i className="isax isax-location me-2 text-muted"></i>
              <p className="text-muted fs-13 mb-0">{doctor.location}</p>
            </div>

            {/* Book button */}
            <Link
              href={`/${locale}/booking?doctor=${doctor.id}`}
              className="btn btn-sm btn-primary w-100 rounded-pill"
            >
              <i className="isax isax-calendar-1 me-2"></i>
              {tg('card.book')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
