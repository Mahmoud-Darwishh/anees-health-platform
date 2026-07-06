'use client';

/**
 * Booking Form — single, scalable catalog-driven flow.
 *
 * Telemedicine and Packages are unified in one SERVICE list, so adding a
 * future product = one entry in the catalog. No code branching per service.
 *
 *   Step 1 — Pick a service card
 *   Step 2 — Pick a duration  (only if the entry exposes >1 durations)
 *   Step 3 — Contact info     (revealed after the service is fully chosen)
 */

import { useTranslations, useLocale } from 'next-intl';
import { useMemo, useState, useCallback } from 'react';
import {
  BookingFormState,
  BookingPriceMap,
  PackageType,
  PackageDuration,
  VisitType,
  PACKAGE_CATALOG,
  calculateBookingPrice,
  validateBookingForm,
  getPackageEntry,
} from '@/lib/models/booking.types';
import type { SpecialtyOption } from '@/lib/api/specialties';
import { Badge, BottomActionBar, Button, Input, Select, StatusPill } from '@/components/ui';
import BookingSummary from './booking-summary';
import styles from '@/assets/scss/components/booking-form.module.scss';

// ── Unified catalog (telemedicine + packages) ────────────────────────────────
// Adding a new service in the future = one new entry below.
interface ServiceEntry {
  id: string;
  visitType: VisitType;
  packageType: PackageType | null;
  titleKey: string;
  subtitleKey: string;
  featureKeys: [string, string];
  featured?: boolean;
  durations: Array<{
    value: PackageDuration | null;
    priceKey: keyof BookingPriceMap;
    labelKey: string | null;
  }>;
}

const SERVICE_CATALOG: ServiceEntry[] = [
  {
    id: 'telemedicine',
    visitType: 'telemedicine',
    packageType: null,
    titleKey: 'booking.form.telemedicine',
    subtitleKey: 'booking.form.telemedicineDescription',
    featureKeys: ['booking.form.telemedicineFeature1', 'booking.form.telemedicineFeature2'],
    durations: [{ value: null, priceKey: 'telemedicine', labelKey: null }],
  },
  ...PACKAGE_CATALOG.map<ServiceEntry>((p) => ({
    id: `package:${p.value}`,
    visitType: 'package',
    packageType: p.value,
    titleKey: p.titleKey,
    subtitleKey: p.subtitleKey,
    featureKeys: [
      `booking.packages.${p.value}.feature1`,
      `booking.packages.${p.value}.feature2`,
    ],
    featured: p.featured,
    durations: p.durations.map((d) => ({
      value: d.value,
      priceKey: d.priceKey,
      labelKey: d.labelKey,
    })),
  })),
];

const INITIAL_FORM_STATE: BookingFormState = {
  fullName: '',
  countryCode: '20',
  phoneNumber: '',
  visitType: null,
  packageType: null,
  packageDuration: null,
  promocode: null,
  governorate: null,
  // Legacy fields — kept null for type compatibility.
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
  onSubmit?: (formData: BookingFormState) => void | Promise<void>;
  preSelectedPackage?: PackageType | null;
  prices: BookingPriceMap;
  specialties: SpecialtyOption[];
}

function createInitialFormState(preSelectedPackage?: PackageType | null): BookingFormState {
  if (!preSelectedPackage) return INITIAL_FORM_STATE;
  const entry = getPackageEntry(preSelectedPackage);
  return {
    ...INITIAL_FORM_STATE,
    visitType: 'package',
    packageType: preSelectedPackage,
    packageDuration: entry && entry.durations.length === 1 ? entry.durations[0].value : null,
  };
}

const COUNTRIES = [
  { code: '20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '971', flag: '🇦🇪', name: 'UAE' },
  { code: '965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '974', flag: '🇶🇦', name: 'Qatar' },
];

export default function BookingForm({ onSubmit, preSelectedPackage, prices, specialties }: BookingFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const [formState, setFormState] = useState<BookingFormState>(() => createInitialFormState(preSelectedPackage));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payableAmount, setPayableAmount] = useState<number>(0);

  const basePrice = useMemo(() => calculateBookingPrice(formState, prices), [formState, prices]);
  const effectivePrice = formState.promocode && payableAmount > 0 ? payableAmount : basePrice;

  // Currently selected catalog entry (drives the duration step + summary).
  const selectedEntry = useMemo<ServiceEntry | null>(() => {
    if (!formState.visitType) return null;
    return (
      SERVICE_CATALOG.find(
        (s) => s.visitType === formState.visitType && s.packageType === formState.packageType,
      ) ?? null
    );
  }, [formState.visitType, formState.packageType]);

  const needsDuration = !!selectedEntry && selectedEntry.durations.length > 1;
  const durationChosen = !needsDuration || formState.packageDuration !== null;
  const showContactStep = !!selectedEntry && durationChosen;
  const contactStepNumber = needsDuration ? 3 : 2;

  const stepItems = [
    { id: 'service', label: t('booking.form.stepService'), number: 1, done: !!selectedEntry },
    ...(needsDuration
      ? [{ id: 'duration', label: t('booking.form.stepDuration'), number: 2, done: durationChosen }]
      : []),
    {
      id: 'contact',
      label: t('booking.form.stepContact'),
      number: contactStepNumber,
      done: !!formState.fullName && !!formState.phoneNumber,
    },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────
  const cleanPhoneNumber = (value: string, countryCode: string): string => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith(countryCode)) digits = digits.slice(countryCode.length);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  };

  const selectService = (entry: ServiceEntry) => {
    setFormState((prev) => ({
      ...prev,
      visitType: entry.visitType,
      packageType: entry.packageType,
      // Auto-pick the only duration when there's no choice to make.
      packageDuration: entry.durations.length === 1 ? entry.durations[0].value : null,
    }));
    setErrors((prev) => ({ ...prev, visitType: '', packageType: '', packageDuration: '' }));
  };

  const selectDuration = (duration: PackageDuration) => {
    setFormState((prev) => ({ ...prev, packageDuration: duration }));
    setErrors((prev) => ({ ...prev, packageDuration: '' }));
  };

  const handleField = (field: 'fullName' | 'phoneNumber' | 'countryCode' | 'governorate', value: string) => {
    setFormState((prev) => {
      let next = value;
      if (field === 'phoneNumber') next = cleanPhoneNumber(value, prev.countryCode);
      return { ...prev, [field]: next };
    });
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // In-home (package) care is coverage-gated to Greater Cairo; telemedicine is remote.
  const requiresGovernorate = selectedEntry?.visitType === 'package';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateBookingForm(formState);
    if (validationErrors.length > 0) {
      const map: Record<string, string> = {};
      validationErrors.forEach((err) => { map[err.field] = err.message; });
      setErrors(map);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit?.(formState);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromocodeChange = useCallback((code: string | null, _discount: number, finalAmount: number) => {
    setFormState((prev) => ({ ...prev, promocode: code }));
    setPayableAmount(finalAmount > 0 ? finalAmount : 0);
  }, []);

  const formatPrice = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  const currency = t('booking.summary.currency');

  // Smallest price for a service entry — drives the card label.
  const minPriceOf = (entry: ServiceEntry) =>
    Math.min(...entry.durations.map((d) => prices[d.priceKey]));

  return (
    <div className={styles.bookingContainer}>
      <div className={styles.bookingWrapper}>
        <form className={styles.bookingForm} onSubmit={handleSubmit} dir={dir} noValidate>
          <div className={styles.formContent}>

            <section className={styles.formIntro} aria-label={t('booking.form.visitType')}>
              <p className={styles.formIntroKicker}>{t('booking.form.chooseTrack')}</p>
              <h1 className={styles.formIntroTitle}>{t('booking.form.eliteTitle')}</h1>
              <p className={styles.formIntroSubtitle}>{t('booking.form.eliteSubtitle')}</p>
            </section>

            <div className={styles.progressRail} aria-label={t('booking.form.step')}>
              {stepItems.map((step) => (
                <StatusPill
                  key={step.id}
                  tone={step.done ? 'success' : 'neutral'}
                  withDot={false}
                  className={`${styles.progressItem} ${step.done ? styles.progressItemDone : ''}`}
                >
                  <span className={styles.progressNumber}>{step.number}</span>
                  <span className={styles.progressLabel}>{step.label}</span>
                </StatusPill>
              ))}
            </div>

            {/* ── Step 1 — Choose a service ───────────────────────────── */}
            <section className={styles.formSection} aria-labelledby="step-service">
              <h2 id="step-service" className={styles.sectionTitle}>
                <span className={styles.stepNumber}>1</span>
                {t('booking.form.visitType')}
              </h2>

              <div className={styles.svcGrid}>
                {SERVICE_CATALOG.map((entry) => {
                  const isActive =
                    formState.visitType === entry.visitType &&
                    formState.packageType === entry.packageType;
                  const price = minPriceOf(entry);
                  const showFrom = entry.durations.length > 1;
                  const classes = [
                    styles.svcCard,
                    isActive ? styles.svcCardActive : '',
                    entry.featured ? styles.svcCardFeatured : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={classes}
                      onClick={() => selectService(entry)}
                      aria-pressed={isActive}
                    >
                      {entry.featured && (
                        <Badge tone="brand" className={styles.svcBadge}>{t('booking.packages.mostPopular')}</Badge>
                      )}
                      <span className={styles.svcBody}>
                        <span className={styles.svcTitle}>{t(entry.titleKey)}</span>
                        <span className={styles.svcSubtitle}>{t(entry.subtitleKey)}</span>
                        <span className={styles.svcHighlights}>
                          {entry.featureKeys.map((featureKey) => (
                            <span key={featureKey} className={styles.svcHighlight}>
                              {t(featureKey)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className={styles.svcPrice}>
                        {showFrom && (
                          <span className={styles.svcPriceFrom}>{t('booking.form.priceFrom')}</span>
                        )}
                        <span className={styles.svcPriceValue}>
                          {formatPrice(price)} <span className={styles.svcPriceUnit}>{currency}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {errors.visitType && <p className={styles.errorText}>{t(errors.visitType)}</p>}
              {errors.packageType && <p className={styles.errorText}>{t(errors.packageType)}</p>}
            </section>

            {/* ── Step 2 — Duration (only if the entry has >1 options) ── */}
            {selectedEntry && needsDuration && (
              <section className={`${styles.formSection} ${styles.expandingSection}`} aria-labelledby="step-duration">
                <h2 id="step-duration" className={styles.sectionTitle}>
                  <span className={styles.stepNumber}>2</span>
                  {t('booking.packages.duration.label')}
                </h2>

                <div className={styles.durationRow} role="radiogroup" aria-label={t('booking.packages.duration.label')}>
                  {selectedEntry.durations.map((d) => {
                    const isActive = formState.packageDuration === d.value;
                    return (
                      <button
                        key={d.value ?? 'default'}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        className={`${styles.durationPill} ${isActive ? styles.durationPillActive : ''}`}
                        onClick={() => d.value && selectDuration(d.value)}
                      >
                        {d.labelKey && <span className={styles.durationLabel}>{t(d.labelKey)}</span>}
                        <span className={styles.durationPrice}>
                          {formatPrice(prices[d.priceKey])} {currency}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {errors.packageDuration && <p className={styles.errorText}>{t(errors.packageDuration)}</p>}
              </section>
            )}

            {/* ── Step 3 — Contact ────────────────────────────────────── */}
            {showContactStep && (
              <section className={`${styles.formSection} ${styles.expandingSection}`} aria-labelledby="step-contact">
                <h2 id="step-contact" className={styles.sectionTitle}>
                  <span className={styles.stepNumber}>{contactStepNumber}</span>
                  {t('booking.form.personalInfo')}
                </h2>

                <div className={styles.contactGrid}>
                  <Input
                    id="fullName"
                    type="text"
                    label={<>{t('booking.form.fullName')} <span className={styles.required}>*</span></>}
                    placeholder={t('booking.form.fullNamePlaceholder')}
                    value={formState.fullName}
                    onChange={(e) => handleField('fullName', e.target.value)}
                    autoComplete="name"
                    dir="auto"
                    experience="clinical"
                    className={styles.formGroup}
                    error={errors.fullName ? t(errors.fullName) : undefined}
                  />

                  <div className={styles.phoneFieldGroup} dir="ltr">
                    <Select
                      id="countryCode"
                      label={t('booking.form.countryCode')}
                      value={formState.countryCode}
                      onChange={(e) => handleField('countryCode', e.target.value)}
                      experience="clinical"
                      className={styles.countryCodeField}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} +{c.code}</option>
                      ))}
                    </Select>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      inputMode="numeric"
                      label={<>{t('booking.form.phoneNumber')} <span className={styles.required}>*</span></>}
                      placeholder={t('booking.form.phoneNumberPlaceholder')}
                      value={formState.phoneNumber}
                      onChange={(e) => handleField('phoneNumber', e.target.value)}
                      autoComplete="tel-national"
                      maxLength={11}
                      experience="clinical"
                      error={errors.phoneNumber ? t(errors.phoneNumber) : undefined}
                    />
                  </div>

                  {requiresGovernorate && (
                    <Select
                      id="governorate"
                      label={<>{t('booking.form.governorate')} <span className={styles.required}>*</span></>}
                      value={formState.governorate ?? ''}
                      onChange={(e) => handleField('governorate', e.target.value)}
                      experience="clinical"
                      className={styles.formGroup}
                      error={
                        errors.governorate
                          ? t(errors.governorate)
                          : formState.governorate === 'other'
                            ? t('booking.form.outOfCoverage')
                            : undefined
                      }
                    >
                      <option value="">{t('booking.form.governoratePlaceholder')}</option>
                      <option value="cairo">{t('booking.form.governorateCairo')}</option>
                      <option value="giza">{t('booking.form.governorateGiza')}</option>
                      <option value="other">{t('booking.form.governorateOther')}</option>
                    </Select>
                  )}
                </div>
              </section>
            )}

            {/* ── Desktop submit ──────────────────────────────────────── */}
            <Button
              type="submit"
              experience="clinical"
              size="lg"
              fullWidth
              className={styles.submitButton}
              disabled={isSubmitting || basePrice <= 0 || !showContactStep}
            >
              {isSubmitting ? t('booking.actions.processing') : t('booking.actions.submitBooking')}
            </Button>
          </div>
        </form>

        {/* Sticky desktop summary */}
        <aside className={styles.summarySection}>
          <BookingSummary
            formState={formState}
            totalPrice={basePrice}
            isSubmitting={isSubmitting}
            specialties={specialties}
            onPromocodeChange={handlePromocodeChange}
          />
        </aside>
      </div>

      {/* Mobile sticky action bar — total + CTA */}
      {basePrice > 0 && (
        <BottomActionBar
          className={styles.mobileBar}
          mobileOnly={false}
          summary={
            <div className={styles.mobileBarPrice}>
              <span className={styles.mobileBarLabel}>{t('booking.summary.totalPrice')}</span>
              <span className={styles.mobileBarValue}>
                {formatPrice(effectivePrice)} <span className={styles.mobileBarUnit}>{currency}</span>
              </span>
            </div>
          }
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                experience="mobile"
                className={styles.mobileBarPromo}
                onClick={() => {
                  const promoInput = document.getElementById('promocode');
                  promoInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  if (promoInput instanceof HTMLInputElement) {
                    window.setTimeout(() => promoInput.focus(), 220);
                  }
                }}
              >
                {t('booking.promocode.label')}
              </Button>
              <Button
                type="button"
                experience="mobile"
                className={styles.mobileBarCta}
                onClick={() => {
                  const submitBtn = document.querySelector<HTMLButtonElement>(`form button[type="submit"]`);
                  if (showContactStep) {
                    submitBtn?.click();
                  } else {
                    const target = document.getElementById(
                      needsDuration && formState.packageDuration === null ? 'step-duration' : 'step-contact',
                    );
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                disabled={isSubmitting}
              >
                {showContactStep
                  ? isSubmitting
                    ? t('booking.actions.processing')
                    : t('booking.actions.submitBooking')
                  : t('booking.actions.continue')}
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
