import Link from 'next/link';
import type { DoctorSearchCard } from '@/lib/seo/search-discovery';

interface DoctorMiniGridProps {
  doctors: DoctorSearchCard[];
  locale: 'en' | 'ar';
  heading?: string;
  emptyText?: string;
}

/**
 * Lightweight, server-rendered grid of doctor cards used by the service and
 * specialty landing pages. Each card links to the doctor's profile, so these
 * pages funnel internal-link equity to the (already-ranking) doctor pages —
 * the core reason landing pages help doctors surface in search.
 */
export default function DoctorMiniGrid({ doctors, locale, heading, emptyText }: DoctorMiniGridProps) {
  return (
    <section className="py-5" aria-label={heading}>
      <div className="container">
        {heading ? <h2 className="h3 mb-4">{heading}</h2> : null}

        {doctors.length === 0 ? (
          <p className="text-muted mb-0">{emptyText}</p>
        ) : (
          <div className="row g-4">
            {doctors.map((doctor) => (
              <div key={`${doctor.id}-${doctor.slug}`} className="col-12 col-sm-6 col-lg-4">
                <Link
                  href={`/${locale}/doctors/${doctor.slug}`}
                  className="card h-100 border-0 shadow-sm text-decoration-none"
                >
                  <div className="card-body d-flex align-items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doctor.image || '/assets/img/anees-logo.png'}
                      alt={doctor.doctorName}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="rounded-circle flex-shrink-0"
                      style={{ width: 64, height: 64, objectFit: 'cover' }}
                    />
                    <span>
                      <span className="d-block fw-semibold text-body">{doctor.doctorName}</span>
                      <span className="d-block text-muted small">
                        {doctor.professionalTitle || doctor.speciality}
                      </span>
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
