'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookingFormState,
  getPackageEntry,
} from '@/lib/models/booking.types';
import type { SpecialtyOption } from '@/lib/api/specialties';
import { generateBookingMessage } from '@/lib/utils/booking-utils';
import styles from '@/assets/scss/components/booking-summary.module.scss';

interface BookingSummaryProps {
  formState: BookingFormState;
  totalPrice: number;
  isSubmitting: boolean;
  specialties: SpecialtyOption[];
  /** Called when a promocode is applied or cleared. */
  onPromocodeChange?: (code: string | null, discount: number, finalAmount: number) => void;
}

interface PromoState {
  status: 'idle' | 'loading' | 'applied' | 'error';
  code: string | null;
  discount: number;
  finalAmount: number;
  errorKey: string | null;
}

const INITIAL_PROMO: PromoState = {
  status: 'idle',
  code: null,
  discount: 0,
  finalAmount: 0,
  errorKey: null,
};

export default function BookingSummary({
  formState,
  totalPrice,
  isSubmitting,
  specialties,
  onPromocodeChange,
}: BookingSummaryProps) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoState>(INITIAL_PROMO);
  const lastBaseRef = useRef<number>(totalPrice);

  const getVisitTypeLabel = () => {
    if (!formState.visitType) return '';
    if (formState.visitType === 'telemedicine') return t('form.telemedicine');
    return t('packages.label');
  };

  const getPackageLabel = () => {
    const entry = getPackageEntry(formState.packageType);
    return entry ? t(entry.titleKey.replace(/^booking\./, '')) : '';
  };

  const getPackageDurationLabel = () => {
    const entry = getPackageEntry(formState.packageType);
    if (!entry || !formState.packageDuration) return '';
    const d = entry.durations.find((x) => x.value === formState.packageDuration);
    return d ? t(d.labelKey.replace(/^booking\./, '')) : '';
  };

  const hasServiceSelection = !!formState.visitType;

  // Auto-clear applied promo when totalPrice changes (form edits invalidate it)
  useEffect(() => {
    if (promo.status === 'applied' && lastBaseRef.current !== totalPrice) {
      setPromo(INITIAL_PROMO);
      onPromocodeChange?.(null, 0, totalPrice);
    }
    lastBaseRef.current = totalPrice;
  }, [totalPrice, promo.status, onPromocodeChange]);

  const applyPromocode = useCallback(async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || totalPrice <= 0) return;
    setPromo({ status: 'loading', code: null, discount: 0, finalAmount: 0, errorKey: null });
    try {
      const res = await fetch('/api/bookings/promocode/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, baseAmount: totalPrice }),
      });
      const data = await res.json();
      if (data?.ok) {
        const next: PromoState = {
          status: 'applied',
          code: data.code,
          discount: Number(data.discount) || 0,
          finalAmount: Number(data.finalAmount) || totalPrice,
          errorKey: null,
        };
        setPromo(next);
        setPromoInput(data.code);
        onPromocodeChange?.(next.code, next.discount, next.finalAmount);
      } else {
        setPromo({
          status: 'error',
          code: null,
          discount: 0,
          finalAmount: 0,
          errorKey: data?.error || 'invalid',
        });
        onPromocodeChange?.(null, 0, totalPrice);
      }
    } catch {
      setPromo({ status: 'error', code: null, discount: 0, finalAmount: 0, errorKey: 'invalid' });
      onPromocodeChange?.(null, 0, totalPrice);
    }
  }, [promoInput, totalPrice, onPromocodeChange]);

  const removePromocode = useCallback(() => {
    setPromo(INITIAL_PROMO);
    setPromoInput('');
    onPromocodeChange?.(null, 0, totalPrice);
  }, [onPromocodeChange, totalPrice]);

  const finalTotal = promo.status === 'applied' ? promo.finalAmount : totalPrice;

  const handleWhatsAppClick = () => {
    const message = generateBookingMessage(formState, finalTotal, locale);
    const whatsappNumber = '201055164595'; // Anees Health WhatsApp number
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
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
              {finalTotal} {t('summary.currency')}
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
                    <span className={styles.detailsValue}>+{formState.countryCode} {formState.phoneNumber}</span>
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

                {formState.visitType === 'package' && formState.packageType && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('packages.label')}</span>
                    <span className={styles.detailsValue}>{getPackageLabel()}</span>
                  </li>
                )}

                {formState.visitType === 'package' && formState.packageDuration && (
                  <li className={styles.detailsItem}>
                    <span className={styles.detailsLabel}>{t('packages.duration.label')}</span>
                    <span className={styles.detailsValue}>{getPackageDurationLabel()}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Pricing */}
            <div className={styles.summarySection}>
              <h3 className={styles.sectionTitle}>{t('summary.pricing')}</h3>

              {/* Service Price */}
              <div className={styles.pricingRow}>
                <span className={styles.pricingLabel}>{t('summary.servicePrice')}</span>
                <span className={styles.pricingValue}>
                  {totalPrice}
                  <span className={styles.currency}>{t('summary.currency')}</span>
                </span>
              </div>

              {/* Promocode input */}
              {totalPrice > 0 && (
                <div className={styles.promoSection}>
                  <label htmlFor="promocode" className={styles.promoLabel}>
                    🎟️ {t('promocode.label')}
                  </label>
                  {promo.status === 'applied' ? (
                    <div className={styles.promoInputWrapper}>
                      <span className={styles.promoChip}>✓ {promo.code}</span>
                      <button
                        type="button"
                        className={styles.promoRemove}
                        onClick={removePromocode}
                        disabled={isSubmitting}
                      >
                        {t('promocode.remove')}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.promoInputWrapper}>
                      <input
                        id="promocode"
                        type="text"
                        className={styles.promoInput}
                        placeholder={t('promocode.placeholder')}
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void applyPromocode();
                          }
                        }}
                        disabled={isSubmitting || promo.status === 'loading'}
                        autoComplete="off"
                        spellCheck={false}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        className={styles.promoApply}
                        onClick={() => void applyPromocode()}
                        disabled={isSubmitting || promo.status === 'loading' || !promoInput.trim()}
                      >
                        {promo.status === 'loading' ? '…' : t('promocode.apply')}
                      </button>
                    </div>
                  )}
                  {promo.status === 'applied' && (
                    <span className={`${styles.promoStatus} ${styles.promoStatusOk}`}>
                      {t('promocode.applied', { code: promo.code ?? '' })}
                    </span>
                  )}
                  {promo.status === 'error' && promo.errorKey && (
                    <span className={`${styles.promoStatus} ${styles.promoStatusError}`}>
                      {t(`promocode.errors.${promo.errorKey}`)}
                    </span>
                  )}
                </div>
              )}

              {/* Discount line */}
              {promo.status === 'applied' && promo.discount > 0 && (
                <div className={`${styles.pricingRow} ${styles.discountRow}`}>
                  <span className={styles.pricingLabel}>
                    {t('promocode.discount')} ({promo.code})
                  </span>
                  <span className={styles.pricingValue}>
                    −{promo.discount}
                    <span className={styles.currency}>{t('summary.currency')}</span>
                  </span>
                </div>
              )}

              {/* Total Price */}
              <div className={styles.priceBox}>
                <span className={styles.priceLabel}>{t('summary.totalPrice')}</span>
                <span className={styles.priceValue}>
                  {promo.status === 'applied' && promo.discount > 0 && (
                    <span className={styles.strikethrough}>{totalPrice}</span>
                  )}
                  {finalTotal}
                  <span className={styles.currency}>{t('summary.currency')}</span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
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
