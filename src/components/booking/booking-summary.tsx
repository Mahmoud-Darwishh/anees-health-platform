'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import {
  BookingFormState,
  SPECIALTIES,
  PHYSIOTHERAPY_CASE_TYPES,
  NURSING_TYPES,
  NURSING_HOURS,
  NURSING_DURATIONS,
} from '@/lib/models/booking.types';
import { generateBookingMessage } from '@/lib/utils/booking-utils';
import styles from '@/assets/scss/components/booking-summary.module.scss';

interface BookingSummaryProps {
  formState: BookingFormState;
  totalPrice: number;
  isSubmitting: boolean;
  onPayNow?: (formData: BookingFormState) => void;
}

export default function BookingSummary({
  formState,
  totalPrice,
  isSubmitting,
  onPayNow,
}: BookingSummaryProps) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);

  const getVisitTypeLabel = () => {
    if (!formState.visitType) return '';
    return formState.visitType === 'homeVisit'
      ? t('form.homeVisit')
      : t('form.telemedicine');
  };

  const getServiceTypeLabel = () => {
    if (!formState.serviceType) return '';
    const labels: Record<string, string> = {
      doctorVisit: 'form.doctorVisit',
      physiotherapy: 'form.physiotherapy.label',
      nursing: 'form.nursing.label',
    };
    return t(labels[formState.serviceType] || '');
  };

  const getSpecialtyLabel = () => {
    if (!formState.specialty) return '';
    const spec = SPECIALTIES.find((s) => s.value === formState.specialty);
    return spec ? t(`form.${spec.label}`) : '';
  };

  const getTimePreferenceLabel = () => {
    if (!formState.timePreference) return '';
    const labels: Record<string, string> = {
      morning: 'form.morning',
      evening: 'form.evening',
      doesntMatter: 'form.doesntMatter',
    };
    return t(labels[formState.timePreference] || '');
  };

  const getSessionCountLabel = () => {
    if (!formState.sessionCount) return '';
    const labels: Record<string, string> = {
      '1': 'form.sessions1',
      '12': 'form.sessions12',
    };
    return t(labels[formState.sessionCount] || '');
  };

  const getCaseTypeLabel = () => {
    if (!formState.caseType) return '';
    const caseType = PHYSIOTHERAPY_CASE_TYPES.find(
      (c) => c.value === formState.caseType
    );
    return caseType ? t(`form.${caseType.label}`) : '';
  };

  const getNursingTypeLabel = () => {
    if (!formState.nursingType) return '';
    const type = NURSING_TYPES.find((n) => n.value === formState.nursingType);
    return type ? t(`form.${type.label}`) : '';
  };

  const getNursingHoursLabel = () => {
    if (!formState.nursingHoursPerDay) return '';
    const hours = NURSING_HOURS.find((h) => h.value === formState.nursingHoursPerDay);
    return hours ? t(`form.${hours.label}`) : '';
  };

  const getNursingDurationLabel = () => {
    if (!formState.nursingDuration) return '';
    const duration = NURSING_DURATIONS.find(
      (d) => d.value === formState.nursingDuration
    );
    return duration ? t(`form.${duration.label}`) : '';
  };

  const hasServiceSelection = !!formState.visitType;

  const handlePaymentClick = () => {
    // Triggered by parent component via callback/state
    console.log('🚀 Pay Now clicked from summary');
    if (onPayNow) {
      console.log('✅ onPayNow callback exists, calling it');
      onPayNow(formState);
    } else {
      console.log('❌ onPayNow callback not provided');
    }
  };

  const handleWhatsAppClick = () => {
    const message = generateBookingMessage(formState, totalPrice, locale);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className={styles.summaryContainer}>
      {/* Mobile Toggle Button */}
      <button
        className={styles.summaryToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={
          isExpanded ? t('actions.collapseSummary') : t('actions.expandSummary')
        }
      >
        <span className={styles.toggleLabel}>
          {t('summary.title')}
          {hasServiceSelection && totalPrice > 0 && (
            <span className={styles.totalBadge}>
              {totalPrice} {t('summary.currency')}
            </span>
          )}
        </span>
        <svg
          className={`${styles.toggleIcon} ${isExpanded ? styles.expanded : ''}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Summary Content */}
      <div className={`${styles.summaryContent} ${isExpanded ? styles.show : ''}`}>
        {!hasServiceSelection ? (
          <p className={styles.emptyState}>{t('summary.empty')}</p>
        ) : (
          <>
            {/* Your Details */}
            <div className={styles.summarySection}>
              <h3 className={styles.sectionTitle}>{t('summary.yourDetails')}</h3>
              <ul className={styles.detailsList}>
                {formState.fullName && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.fullName')}</span>
                    <span className={styles.detailsValue}>{formState.fullName}</span>
                  </li>
                )}
                {formState.phoneNumber && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.phoneNumber')}</span>
                    <span className={styles.detailsValue}>{formState.phoneNumber}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Service Details */}
            <div className={styles.summarySection}>
              <h3 className={styles.sectionTitle}>{t('summary.serviceDetails')}</h3>
              <ul className={styles.detailsList}>
                <li className={styles.detailsItem}>
                  <span className={styles.detailsLabel}>{t('form.visitType')}</span>
                  <span className={styles.detailsValue}>{getVisitTypeLabel()}</span>
                </li>

                {formState.serviceType && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.serviceType')}</span>
                    <span className={styles.detailsValue}>{getServiceTypeLabel()}</span>
                  </li>
                )}

                {formState.specialty && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.specialty.label')}</span>
                    <span className={styles.detailsValue}>{getSpecialtyLabel()}</span>
                  </li>
                )}

                {formState.preferredDate && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.preferredDate')}</span>
                    <span className={styles.detailsValue}>
                      {new Date(formState.preferredDate).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </span>
                  </li>
                )}

                {formState.timePreference && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.timePreference')}</span>
                    <span className={styles.detailsValue}>{getTimePreferenceLabel()}</span>
                  </li>
                )}

                {formState.sessionCount && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.sessions')}</span>
                    <span className={styles.detailsValue}>{getSessionCountLabel()}</span>
                  </li>
                )}

                {formState.caseType && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.caseType')}</span>
                    <span className={styles.detailsValue}>{getCaseTypeLabel()}</span>
                  </li>
                )}

                {formState.nursingType && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.nursingType')}</span>
                    <span className={styles.detailsValue}>{getNursingTypeLabel()}</span>
                  </li>
                )}

                {formState.nursingHoursPerDay && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.hoursPerDay')}</span>
                    <span className={styles.detailsValue}>{getNursingHoursLabel()}</span>
                  </li>
                )}

                {formState.nursingDuration && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('form.duration')}</span>
                    <span className={styles.detailsValue}>{getNursingDurationLabel()}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Pricing */}
            <div className={styles.summarySection}>
              <h3 className={styles.sectionTitle}>{t('summary.pricing')}</h3>
              <div className={styles.priceBox}>
                <span className={styles.priceLabel}>{t('summary.totalPrice')}</span>
                <span className={styles.priceValue}>
                  {totalPrice}
                  <span className={styles.currency}>{t('summary.currency')}</span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button
                className={styles.payButton}
                onClick={handlePaymentClick}
                disabled={isSubmitting || totalPrice === 0}
                type="button"
              >
                {t('actions.payNow')}
              </button>

              <button
                className={styles.whatsappButton}
                onClick={handleWhatsAppClick}
                disabled={isSubmitting}
                type="button"
              >
                {t('actions.chatWithTeam')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
