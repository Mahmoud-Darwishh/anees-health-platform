'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface CoverageCheckFormProps {
  locale: string;
}

interface CoverageResult {
  covered: boolean;
  area?: {
    name: string;
    name_ar: string;
    governorate: string;
    governorate_ar: string;
  };
  message: string;
}

export default function CoverageCheckForm({ locale }: CoverageCheckFormProps) {
  const t = useTranslations('coveragePage');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoverageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t('geolocation_not_supported'));
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLoading(false);
      },
      (err) => {
        setError(t('geolocation_error'));
        setLoading(false);
        console.error('Geolocation error:', err);
      }
    );
  };

  const handleCheckCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!latitude || !longitude) {
        setError(t('coordinates_required'));
        setLoading(false);
        return;
      }

      const url = `/api/coverage?action=check-coordinates&lat=${encodeURIComponent(
        latitude
      )}&lng=${encodeURIComponent(longitude)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || t('check_failed'));
        setLoading(false);
        return;
      }

      setResult({
        covered: data.covered,
        area: data.area,
        message: data.message,
      });
    } catch (err) {
      setError(t('network_error'));
      console.error('Coverage check error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coverage-check-form">
      <form onSubmit={handleCheckCoverage} className="coverage-form">
        <div className="coordinates-input">
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-secondary w-100 mb-3"
              onClick={handleGetCurrentLocation}
              disabled={loading}
              aria-label={t('get_current_location')}
            >
              <i className="fas fa-location-crosshairs me-2" aria-hidden="true"></i>
              {t('get_current_location')}
            </button>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="latitude" className="form-label">
                {t('latitude')}
              </label>
              <input
                type="number"
                step="any"
                className="form-control"
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder={t('latitude_placeholder')}
                required
                aria-required="true"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="longitude" className="form-label">
                {t('longitude')}
              </label>
              <input
                type="number"
                step="any"
                className="form-control"
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder={t('longitude_placeholder')}
                required
                aria-required="true"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              {t('checking')}
            </>
          ) : (
            <>
              <i className="fas fa-search me-2" aria-hidden="true"></i>
              {t('check_coverage')}
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="alert alert-danger mt-4" role="alert">
          <i className="fas fa-exclamation-circle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      {result && (
        <div
          className={`alert ${
            result.covered ? 'alert-success' : 'alert-warning'
          } mt-4`}
          role="alert"
        >
          <div className="d-flex align-items-start">
            <i
              className={`fas ${
                result.covered ? 'fa-check-circle' : 'fa-times-circle'
              } me-3 mt-1 fs-4`}
              aria-hidden="true"
            ></i>
            <div>
              <h5 className="alert-heading mb-2">
                {result.covered ? t('covered_title') : t('not_covered_title')}
              </h5>
              {result.covered && result.area && (
                <div className="mb-2">
                  <strong>{t('area_label')}:</strong>{' '}
                  {locale === 'ar' ? result.area.name_ar : result.area.name}
                  <br />
                  <strong>{t('governorate_label')}:</strong>{' '}
                  {locale === 'ar'
                    ? result.area.governorate_ar
                    : result.area.governorate}
                </div>
              )}
              <p className="mb-0">{result.covered ? t('covered_message') : t('not_covered_message')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
