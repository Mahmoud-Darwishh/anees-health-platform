'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface CoveredZone {
  name: string;
  name_ar: string;
  governorate: string;
  governorate_ar: string;
}

interface CoverageZonesListProps {
  locale: string;
}

export default function CoverageZonesList({ locale }: CoverageZonesListProps) {
  const t = useTranslations('coveragePage');
  const [zones, setZones] = useState<CoveredZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('/api/coverage?action=list');
        const data = await response.json();

        if (data.success) {
          setZones(data.zones);
        } else {
          setError(t('zones_load_error'));
        }
      } catch (err) {
        setError(t('zones_load_error'));
        console.error('Error loading zones:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, [t]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  // Group zones by governorate
  const groupedZones = zones.reduce((acc, zone) => {
    const gov = locale === 'ar' ? zone.governorate_ar : zone.governorate;
    if (!acc[gov]) {
      acc[gov] = [];
    }
    acc[gov].push(zone);
    return acc;
  }, {} as Record<string, CoveredZone[]>);

  return (
    <div className="coverage-zones-list">
      <h3 className="mb-4">{t('covered_zones_title')}</h3>
      
      {Object.entries(groupedZones).map(([governorate, govZones]) => (
        <div key={governorate} className="governorate-group mb-4" data-reveal>
          <h4 className="governorate-title mb-3">
            <i className="fas fa-map-marker-alt me-2 text-primary" aria-hidden="true"></i>
            {governorate}
          </h4>
          <div className="row g-3">
            {govZones.map((zone, index) => (
              <div key={index} className="col-md-6 col-lg-4">
                <div className="zone-card card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="zone-icon me-3">
                        <i className="fas fa-location-dot text-primary fs-4" aria-hidden="true"></i>
                      </div>
                      <div className="zone-info">
                        <h5 className="zone-name mb-0">
                          {locale === 'ar' ? zone.name_ar : zone.name}
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {zones.length === 0 && (
        <p className="text-muted text-center">{t('no_zones_available')}</p>
      )}
    </div>
  );
}
