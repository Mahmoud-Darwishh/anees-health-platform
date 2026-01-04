'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useCallback, useState, useEffect } from 'react';
import {
  BookingFormState,
  calculateBookingPrice,
  validateBookingForm,
  SPECIALTIES,
  PHYSIOTHERAPY_CASE_TYPES,
  NURSING_TYPES,
  NURSING_HOURS,
  NURSING_DURATIONS,
  PackageType,
} from '@/lib/models/booking.types';
import BookingSummary from './booking-summary';
import styles from '@/assets/scss/components/booking-form.module.scss';

const INITIAL_FORM_STATE: BookingFormState = {
  fullName: '',
  countryCode: '20', // Egypt by default
  phoneNumber: '',
  visitType: 'homeVisit',
  packageType: null,
  serviceType: null,
  specialty: null,
  preferredDate: '',
  timePreference: null,
  sessionCount: null,
  caseType: null,
  nursingType: null,
  nursingHoursPerDay: null,
  nursingDuration: null,
};

interface BookingFormProps {
  onSubmit?: (formData: BookingFormState) => void;
  onPayNow?: (formData: BookingFormState) => void;
  preSelectedPackage?: PackageType | null;
}

export default function BookingForm({ onSubmit, onPayNow, preSelectedPackage }: BookingFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const [formState, setFormState] = useState<BookingFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle pre-selected package from URL
  useEffect(() => {
    if (preSelectedPackage) {
      setFormState(prev => ({
        ...prev,
        visitType: 'package',
        packageType: preSelectedPackage,
      }));
    }
  }, [preSelectedPackage]);

  // Clean phone number - remove country code and leading 0
  const cleanPhoneNumber = (value: string, countryCode: string): string => {
    let digits = value.replace(/\D/g, ''); // Remove all non-digits
    
    // Remove country code if it's at the start
    if (digits.startsWith(countryCode)) {
      digits = digits.slice(countryCode.length);
    }
    
    // Remove leading 0 if present
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    
    return digits;
  };

  // Update form field
  const handleFieldChange = useCallback(
    (field: keyof BookingFormState, value: any) => {
      // Clean phone number - remove leading 0 or country code
      if (field === 'phoneNumber') {
        value = cleanPhoneNumber(value, formState.countryCode);
      }

      setFormState((prev) => {
        const updated = { ...prev, [field]: value };

        // Reset dependent fields when parent selection changes
        if (field === 'visitType') {
          updated.packageType = null;
          updated.serviceType = null;
          updated.specialty = null;
          updated.preferredDate = '';
          updated.timePreference = null;
          updated.sessionCount = null;
          updated.caseType = null;
          updated.nursingType = null;
          updated.nursingHoursPerDay = null;
          updated.nursingDuration = null;
        }

        if (field === 'serviceType') {
          updated.specialty = null;
          updated.preferredDate = '';
          updated.timePreference = null;
          updated.sessionCount = null;
          updated.caseType = null;
          updated.nursingType = null;
          updated.nursingHoursPerDay = null;
          updated.nursingDuration = null;
        }

        return updated;
      });

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
      }
    },
    [errors]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission is now handled by the onClick handler of the button
    // This is kept for backward compatibility
  };

  const totalPrice = calculateBookingPrice(formState);

  return (
    <div className={styles.bookingContainer} dir={dir}>
      <div className={styles.bookingWrapper}>
        {/* Main Form */}
        <form onSubmit={handleSubmit} className={styles.bookingForm}>
          <div className={styles.formContent}>
            {/* Section 1: Visit Type Selection */}
            <fieldset className={styles.formSection}>
              <legend className={styles.sectionTitle}>
                {t('booking.form.visitType')}
              </legend>

              <div className={`${styles.radioGroup} ${styles.visitTypeCompact}`}>
                <div className={styles.radioOption}>
                  <input
                    id="homeVisit"
                    type="radio"
                    name="visitType"
                    value="homeVisit"
                    checked={formState.visitType === 'homeVisit'}
                    onChange={() => handleFieldChange('visitType', 'homeVisit')}
                    disabled={isSubmitting}
                    aria-label={t('booking.form.homeVisit')}
                  />
                  <label htmlFor="homeVisit" className={styles.optionContent}>
                    <div>
                      <span className={styles.optionTitle}>{t('booking.form.homeVisit')}</span>
                      <span className={styles.optionSubtitle}>{t('booking.form.homeVisitDescription')}</span>
                    </div>
                  </label>
                </div>

                <div className={styles.radioOption}>
                  <input
                    id="telemedicine"
                    type="radio"
                    name="visitType"
                    value="telemedicine"
                    checked={formState.visitType === 'telemedicine'}
                    onChange={() =>
                      handleFieldChange('visitType', 'telemedicine')
                    }
                    disabled={isSubmitting}
                    aria-label={t('booking.form.telemedicine')}
                  />
                  <label htmlFor="telemedicine" className={styles.optionContent}>
                    <div>
                      <span className={styles.optionTitle}>{t('booking.form.telemedicine')}</span>
                      <span className={styles.optionSubtitle}>{t('booking.form.telemedicineDescription')}</span>
                    </div>
                  </label>
                </div>

                <div className={styles.radioOption}>
                  <input
                    id="package"
                    type="radio"
                    name="visitType"
                    value="package"
                    checked={formState.visitType === 'package'}
                    onChange={() =>
                      handleFieldChange('visitType', 'package')
                    }
                    disabled={isSubmitting}
                    aria-label={locale === 'ar' ? 'باقات الرعاية' : 'Care Packages'}
                  />
                  <label htmlFor="package" className={styles.optionContent}>
                    <div>
                      <span className={styles.optionTitle}>{locale === 'ar' ? 'باقات' : 'Packages'}</span>
                      <span className={styles.optionSubtitle}>{locale === 'ar' ? 'برامج رعاية شاملة' : 'Care programs'}</span>
                    </div>
                  </label>
                </div>
              </div>

              {errors.visitType && (
                <span
                  id="visitType-error"
                  className={styles.errorText}
                  role="alert"
                >
                  {errors.visitType}
                </span>
              )}
            </fieldset>

            {/* Section 2: Personal Information */}
            <fieldset className={styles.formSection}>
              <legend className={styles.sectionTitle}>
                {t('booking.form.personalInfo')}
              </legend>

              <div className={styles.inlineFieldGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="fullName" className={styles.label}>
                    {t('booking.form.fullName')}
                    <span className={styles.required} aria-label="required">
                      *
                    </span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    className={`${styles.input} ${
                      errors.fullName ? styles.inputError : ''
                    }`}
                    placeholder={t('booking.form.fullNamePlaceholder')}
                    value={formState.fullName}
                    onChange={(e) =>
                      handleFieldChange('fullName', e.target.value)
                    }
                    disabled={isSubmitting}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  />
                  {errors.fullName && (
                    <span
                      id="fullName-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.fullName}
                    </span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phoneNumber" className={styles.label}>
                    {t('booking.form.phoneNumber')}
                    <span className={styles.required} aria-label="required">
                      *
                    </span>
                  </label>
                  <div className={styles.phoneInputWrapper}>
                    <select
                      className={`${styles.countryCodeSelect} ${
                        errors.countryCode ? styles.inputError : ''
                      }`}
                      value={formState.countryCode}
                      onChange={(e) =>
                        handleFieldChange('countryCode', e.target.value)
                      }
                      disabled={isSubmitting}
                      aria-label="Country code"
                    >
                      <option value="20">🇪🇬 +20</option>
                      <option value="966">🇸🇦 +966</option>
                      <option value="971">🇦🇪 +971</option>
                      <option value="965">🇰🇼 +965</option>
                      <option value="974">🇶🇦 +974</option>
                    </select>
                    <input
                      id="phoneNumber"
                      type="tel"
                      className={`${styles.phoneNumberInput} ${
                        errors.phoneNumber ? styles.inputError : ''
                      }`}
                      placeholder={t('booking.form.phoneNumberPlaceholder')}
                      value={formState.phoneNumber}
                      onChange={(e) =>
                        handleFieldChange('phoneNumber', e.target.value)
                      }
                      disabled={isSubmitting}
                      aria-invalid={!!errors.phoneNumber}
                      aria-describedby={
                        errors.phoneNumber ? 'phoneNumber-error' : undefined
                      }
                    />
                  </div>
                  {(errors.countryCode || errors.phoneNumber) && (
                    <span
                      id="phoneNumber-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.phoneNumber || errors.countryCode}
                    </span>
                  )}
                </div>
              </div>

              </fieldset>

              {/* Package Selection - Only show if visitType is 'package' */}
              {formState.visitType === 'package' && (
                <fieldset className={styles.formSection}>
                  <legend className={styles.sectionTitle}>
                    {locale === 'ar' ? 'اختر الباقة' : 'Select Package'}
                  </legend>

                  <div className={`${styles.radioGroup} ${styles.packageGrid}`}>
                    <div className={styles.radioOption}>
                      <input
                        id="haraka"
                        type="radio"
                        name="packageType"
                        value="haraka"
                        checked={formState.packageType === 'haraka'}
                        onChange={() => handleFieldChange('packageType', 'haraka')}
                        disabled={isSubmitting}
                        aria-label="Harakā - حَرَكَة"
                      />
                      <label htmlFor="haraka" className={styles.optionContent}>
                        <div>
                          <span className={styles.optionTitle}>Harakā - حَرَكَة</span>
                          <span className={styles.optionSubtitle}>
                            {locale === 'ar' 
                              ? 'خشونة المفاصل والروماتويد - 5,000 جنيه' 
                              : 'Joint & Arthritis Care - 5,000 EGP'}
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className={styles.radioOption}>
                      <input
                        id="wai"
                        type="radio"
                        name="packageType"
                        value="wai"
                        checked={formState.packageType === 'wai'}
                        onChange={() => handleFieldChange('packageType', 'wai')}
                        disabled={isSubmitting}
                        aria-label="Wa'i - وَعْي"
                      />
                      <label htmlFor="wai" className={styles.optionContent}>
                        <div>
                          <span className={styles.optionTitle}>Wa'i - وَعْي</span>
                          <span className={styles.optionSubtitle}>
                            {locale === 'ar' 
                              ? 'الزهايمر والخرف - 8,000 جنيه' 
                              : 'Cognitive & Dementia Care - 8,000 EGP'}
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className={styles.radioOption}>
                      <input
                        id="amal"
                        type="radio"
                        name="packageType"
                        value="amal"
                        checked={formState.packageType === 'amal'}
                        onChange={() => handleFieldChange('packageType', 'amal')}
                        disabled={isSubmitting}
                        aria-label="Amal - أَمَل"
                      />
                      <label htmlFor="amal" className={styles.optionContent}>
                        <div>
                          <span className={styles.optionTitle}>Amal - أَمَل</span>
                          <span className={styles.optionSubtitle}>
                            {locale === 'ar' 
                              ? 'التعافي من الجلطات - 6,000 جنيه' 
                              : 'Stroke Recovery - 6,000 EGP'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {errors.packageType && (
                    <span
                      id="packageType-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.packageType}
                    </span>
                  )}
                </fieldset>
              )}

              {/* Section 3: Service Type (Home Visit Only) */}
              {formState.visitType === 'homeVisit' && (
                <fieldset className={`${styles.formSection} ${styles.expandingSection}`}>
                  <legend className={styles.sectionTitle}>
                    {t('booking.form.serviceType')}
                  </legend>

                  <div className={`${styles.radioGroup} ${styles.sessionCountGroup}`}>
                    <div className={styles.radioOption}>
                      <input
                        id="doctorVisit"
                        type="radio"
                        name="serviceType"
                        value="doctorVisit"
                        checked={formState.serviceType === 'doctorVisit'}
                        onChange={() =>
                          handleFieldChange('serviceType', 'doctorVisit')
                        }
                        disabled={isSubmitting}
                        aria-label={t('booking.form.doctorVisit')}
                      />
                      <label htmlFor="doctorVisit">
                        {t('booking.form.doctorVisit')}
                      </label>
                    </div>

                    <div className={styles.radioOption}>
                      <input
                        id="physiotherapy"
                        type="radio"
                        name="serviceType"
                        value="physiotherapy"
                        checked={formState.serviceType === 'physiotherapy'}
                        onChange={() =>
                          handleFieldChange('serviceType', 'physiotherapy')
                        }
                        disabled={isSubmitting}
                        aria-label={t('booking.form.physiotherapy.label')}
                      />
                      <label htmlFor="physiotherapy">
                        {t('booking.form.physiotherapy.label')}
                      </label>
                    </div>

                    <div className={styles.radioOption}>
                      <input
                        id="nursing"
                        type="radio"
                        name="serviceType"
                        value="nursing"
                        checked={formState.serviceType === 'nursing'}
                        onChange={() =>
                          handleFieldChange('serviceType', 'nursing')
                        }
                        disabled={isSubmitting}
                        aria-label={t('booking.form.nursing.label')}
                      />
                      <label htmlFor="nursing">
                        {t('booking.form.nursing.label')}
                      </label>
                    </div>
                  </div>

                  {errors.serviceType && (
                    <span
                      id="serviceType-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.serviceType}
                    </span>
                  )}
                </fieldset>
              )}

              {/* Section 4: Doctor Visit (Home Visit) */}
              {formState.serviceType === 'doctorVisit' && (
              <fieldset className={`${styles.formSection} ${styles.expandingSection}`}>
                <legend className={styles.sectionTitle}>
                  {t('booking.form.doctorVisit')} {t('booking.form.details')}
                </legend>

                <div className={styles.inlineFieldGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="specialty" className={styles.label}>
                      {t('booking.form.specialty.label')}
                      <span className={styles.required} aria-label="required">
                        *
                      </span>
                    </label>
                    <select
                      id="specialty"
                      className={`${styles.select} ${
                        errors.specialty ? styles.inputError : ''
                      }`}
                      value={formState.specialty || ''}
                      onChange={(e) =>
                        handleFieldChange('specialty', e.target.value || null)
                      }
                      disabled={isSubmitting}
                      aria-invalid={!!errors.specialty}
                      aria-describedby={
                        errors.specialty ? 'specialty-error' : undefined
                      }
                    >
                      <option value="">
                        {t('booking.form.specialtySelect')}
                      </option>
                      {SPECIALTIES.map((spec) => (
                        <option key={spec.value} value={spec.value}>
                          {t(`booking.form.${spec.label}`)}
                        </option>
                      ))}
                    </select>
                    {errors.specialty && (
                      <span
                        id="specialty-error"
                        className={styles.errorText}
                        role="alert"
                      >
                        {errors.specialty}
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="preferredDate" className={styles.label}>
                      {t('booking.form.preferredDate')}
                      <span className={styles.required} aria-label="required">
                        *
                      </span>
                    </label>
                    <input
                      id="preferredDate"
                      type="date"
                      className={`${styles.input} ${
                        errors.preferredDate ? styles.inputError : ''
                      }`}
                      value={formState.preferredDate}
                      onChange={(e) =>
                        handleFieldChange('preferredDate', e.target.value)
                      }
                      disabled={isSubmitting}
                      aria-invalid={!!errors.preferredDate}
                      aria-describedby={
                        errors.preferredDate ? 'preferredDate-error' : undefined
                      }
                    />
                    {errors.preferredDate && (
                      <span
                        id="preferredDate-error"
                        className={styles.errorText}
                        role="alert"
                      >
                        {errors.preferredDate}
                      </span>
                    )}
                  </div>
                </div>

                <fieldset className={styles.subFieldset}>
                  <legend className={styles.subLegend}>
                    {t('booking.form.timePreference')}
                  </legend>
                  <div className={`${styles.radioGroup} ${styles.timePreferenceGroup}`}>
                    {[
                      { value: 'morning', label: 'booking.form.morning' },
                      { value: 'evening', label: 'booking.form.evening' },
                      {
                        value: 'doesntMatter',
                        label: 'booking.form.doesntMatter',
                      },
                    ].map((option) => (
                      <div key={option.value} className={styles.radioOption}>
                        <input
                          id={`timePreference-${option.value}`}
                          type="radio"
                          name="timePreference"
                          value={option.value}
                          checked={formState.timePreference === option.value}
                          onChange={() =>
                            handleFieldChange('timePreference', option.value)
                          }
                          disabled={isSubmitting}
                          aria-label={t(option.label)}
                        />
                        <label htmlFor={`timePreference-${option.value}`}>
                          {t(option.label)}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.timePreference && (
                    <span
                      id="timePreference-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.timePreference}
                    </span>
                  )}
                </fieldset>
              </fieldset>
            )}

            {/* Section 5: Physiotherapy (Home Visit) */}
            {formState.serviceType === 'physiotherapy' && (
              <fieldset className={`${styles.formSection} ${styles.expandingSection}`}>
                <legend className={styles.sectionTitle}>
                  {t('booking.form.physiotherapy.label')} {t('booking.form.details')}
                </legend>

                <fieldset className={styles.subFieldset}>
                  <legend className={styles.subLegend}>
                    {t('booking.form.sessions')}
                  </legend>
                  <div className={`${styles.radioGroup} ${styles.sessionCountGroup}`}>
                    <div className={styles.radioOption}>
                      <input
                        id="sessions1"
                        type="radio"
                        name="sessionCount"
                        value="1"
                        checked={formState.sessionCount === '1'}
                        onChange={() =>
                          handleFieldChange('sessionCount', '1')
                        }
                        disabled={isSubmitting}
                        aria-label={t('booking.form.sessions1')}
                      />
                      <label htmlFor="sessions1">
                        {t('booking.form.sessions1')}
                      </label>
                    </div>

                    <div className={styles.radioOption}>
                      <input
                        id="sessions12"
                        type="radio"
                        name="sessionCount"
                        value="12"
                        checked={formState.sessionCount === '12'}
                        onChange={() =>
                          handleFieldChange('sessionCount', '12')
                        }
                        disabled={isSubmitting}
                        aria-label={t('booking.form.sessions12')}
                      />
                      <label htmlFor="sessions12">
                        {t('booking.form.sessions12')}
                      </label>
                    </div>
                  </div>
                  {errors.sessionCount && (
                    <span
                      id="sessionCount-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.sessionCount}
                    </span>
                  )}
                </fieldset>

                <div className={styles.formGroup}>
                  <label htmlFor="caseType" className={styles.label}>
                    {t('booking.form.caseType')}
                    <span className={styles.required} aria-label="required">
                      *
                    </span>
                  </label>
                  <select
                    id="caseType"
                    className={`${styles.select} ${
                      errors.caseType ? styles.inputError : ''
                    }`}
                    value={formState.caseType || ''}
                    onChange={(e) =>
                      handleFieldChange('caseType', e.target.value || null)
                    }
                    disabled={isSubmitting}
                    aria-invalid={!!errors.caseType}
                    aria-describedby={
                      errors.caseType ? 'caseType-error' : undefined
                    }
                  >
                    <option value="">
                      {t('booking.form.caseTypeSelect')}
                    </option>
                    {PHYSIOTHERAPY_CASE_TYPES.map((caseType) => (
                      <option key={caseType.value} value={caseType.value}>
                        {t(`booking.form.${caseType.label}`)}
                      </option>
                    ))}
                  </select>
                  {errors.caseType && (
                    <span
                      id="caseType-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.caseType}
                    </span>
                  )}
                </div>
              </fieldset>
            )}

            {/* Section 6: Nursing (Home Visit) */}
            {formState.serviceType === 'nursing' && (
              <fieldset className={`${styles.formSection} ${styles.expandingSection}`}>
                <legend className={styles.sectionTitle}>
                  {t('booking.form.nursing.label')} {t('booking.form.details')}
                </legend>

                <div className={styles.formGroup}>
                  <label htmlFor="nursingType" className={styles.label}>
                    {t('booking.form.nursingType')}
                    <span className={styles.required} aria-label="required">
                      *
                    </span>
                  </label>
                  <select
                    id="nursingType"
                    className={`${styles.select} ${
                      errors.nursingType ? styles.inputError : ''
                    }`}
                    value={formState.nursingType || ''}
                    onChange={(e) =>
                      handleFieldChange('nursingType', e.target.value || null)
                    }
                    disabled={isSubmitting}
                    aria-invalid={!!errors.nursingType}
                    aria-describedby={
                      errors.nursingType ? 'nursingType-error' : undefined
                    }
                  >
                    <option value="">
                      {t('booking.form.nursingTypeSelect')}
                    </option>
                    {NURSING_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {t(`booking.form.${type.label}`)}
                      </option>
                    ))}
                  </select>
                  {errors.nursingType && (
                    <span
                      id="nursingType-error"
                      className={styles.errorText}
                      role="alert"
                    >
                      {errors.nursingType}
                    </span>
                  )}
                </div>

                <div className={styles.inlineFieldGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="nursingHours" className={styles.label}>
                      {t('booking.form.hoursPerDay')}
                      <span className={styles.required} aria-label="required">
                        *
                      </span>
                    </label>
                    <select
                      id="nursingHours"
                      className={`${styles.select} ${
                        errors.nursingHoursPerDay ? styles.inputError : ''
                      }`}
                      value={formState.nursingHoursPerDay || ''}
                      onChange={(e) =>
                        handleFieldChange('nursingHoursPerDay', e.target.value || null)
                      }
                      disabled={isSubmitting}
                      aria-invalid={!!errors.nursingHoursPerDay}
                      aria-describedby={
                        errors.nursingHoursPerDay ? 'nursingHours-error' : undefined
                      }
                    >
                      <option value="">
                        {t('booking.form.hoursPerDaySelect')}
                      </option>
                      {NURSING_HOURS.map((hours) => (
                        <option key={hours.value} value={hours.value}>
                          {t(`booking.form.${hours.label}`)}
                        </option>
                      ))}
                    </select>
                    {errors.nursingHoursPerDay && (
                      <span
                        id="nursingHours-error"
                        className={styles.errorText}
                        role="alert"
                      >
                        {errors.nursingHoursPerDay}
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="nursingDuration" className={styles.label}>
                      {t('booking.form.duration')}
                      <span className={styles.required} aria-label="required">
                        *
                      </span>
                    </label>
                    <select
                      id="nursingDuration"
                      className={`${styles.select} ${
                        errors.nursingDuration ? styles.inputError : ''
                      }`}
                      value={formState.nursingDuration || ''}
                      onChange={(e) =>
                        handleFieldChange('nursingDuration', e.target.value || null)
                      }
                      disabled={isSubmitting}
                      aria-invalid={!!errors.nursingDuration}
                      aria-describedby={
                        errors.nursingDuration ? 'nursingDuration-error' : undefined
                      }
                    >
                      <option value="">
                        {t('booking.form.durationSelect')}
                      </option>
                      {NURSING_DURATIONS.map((duration) => (
                        <option key={duration.value} value={duration.value}>
                          {t(`booking.form.${duration.label}`)}
                        </option>
                      ))}
                    </select>
                    {errors.nursingDuration && (
                      <span
                        id="nursingDuration-error"
                        className={styles.errorText}
                        role="alert"
                      >
                        {errors.nursingDuration}
                      </span>
                    )}
                  </div>
                </div>
              </fieldset>
            )}

            {/* Submit Button - Now "Pay Now" that triggers payment directly */}
            <button
              type="button"
              className={styles.submitButton}
              disabled={isSubmitting}
              onClick={() => {
                console.log('🔵 Pay Now button clicked');
                console.log('Form state:', formState);
                
                // Validate form first
                const validationErrors = validateBookingForm(formState);
                console.log('Validation errors:', validationErrors);
                
                if (validationErrors.length > 0) {
                  const errorMap: Record<string, string> = {};
                  validationErrors.forEach((error) => {
                    errorMap[error.field] = t(error.message);
                  });
                  setErrors(errorMap);
                  console.log('❌ Form validation failed');
                  return;
                }

                console.log('✅ Form validation passed');

                // Store booking data
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('pendingBooking', JSON.stringify({
                    ...formState,
                    createdAt: new Date().toISOString()
                  }));
                }

                // Trigger payment directly
                console.log('🚀 Triggering payment with onPayNow callback');
                if (onPayNow) {
                  console.log('✅ onPayNow callback exists, calling it');
                  onPayNow(formState);
                } else {
                  console.log('❌ onPayNow callback not provided');
                }
              }}
            >
              {isSubmitting
                ? t('booking.actions.processing')
                : '💳 ' + t('booking.actions.proceedToPayment')}
            </button>
          </div>
        </form>

        {/* Booking Summary (Sticky on Desktop, Collapsible on Mobile) */}
        <aside className={styles.summarySection}>
          <BookingSummary
            formState={formState}
            totalPrice={totalPrice}
            isSubmitting={isSubmitting}
            onPayNow={onPayNow}
          />
        </aside>
      </div>
    </div>
  );
}
