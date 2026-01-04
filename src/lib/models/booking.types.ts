/**
 * Booking Form Types & Constants
 * Defines data models, pricing rules, and form state for the booking system
 */

import { BOOKING_PRICING } from '@/lib/config/booking-pricing';

// ============================================================================
// BOOKING TYPES
// ============================================================================

export type VisitType = 'homeVisit' | 'telemedicine' | 'package';
export type ServiceType = 'doctorVisit' | 'physiotherapy' | 'nursing';
export type PackageType = 'haraka' | 'wai' | 'amal';
export type Specialty = 'generalMedicine' | 'pediatrics' | 'orthopedics' | 'cardiology' | 'dermatology';
export type TimePreference = 'morning' | 'evening' | 'doesntMatter';
export type PhysiotherapySessions = '1' | '12';
export type PhysiotherapyCaseType = 'postoperative' | 'fracture' | 'neuro' | 'other';
export type NursingType = 'nurse' | 'nursingAssistant';
export type NursingHours = '8hrs' | '12hrs' | '24hrs';
export type NursingDuration = '1week' | '2weeks' | '1month';

// ============================================================================
// BOOKING FORM STATE
// ============================================================================

export interface BookingFormState {
  // Personal Info
  fullName: string;
  countryCode: string; // e.g., '20' for Egypt
  phoneNumber: string; // 10 digits for Egypt

  // Visit Selection
  visitType: VisitType | null;

  // Package Selection (for package visitType)
  packageType: PackageType | null;

  // Service Type (Home Visit only)
  serviceType: ServiceType | null;

  // Doctor Visit (Home Visit)
  specialty: Specialty | null;
  preferredDate: string; // ISO date string
  timePreference: TimePreference | null;

  // Physiotherapy (Home Visit)
  sessionCount: PhysiotherapySessions | null;
  caseType: PhysiotherapyCaseType | null;

  // Nursing (Home Visit)
  nursingType: NursingType | null;
  nursingHoursPerDay: NursingHours | null;
  nursingDuration: NursingDuration | null;
}

// ============================================================================
// BOOKING SUMMARY
// ============================================================================

export interface BookingSummary extends BookingFormState {
  totalPrice: number;
  currency: 'EGP';
}

// ============================================================================
// API REQUEST/RESPONSE
// ============================================================================

export interface CreateBookingIntentRequest {
  fullName: string;
  countryCode: string;
  phoneNumber: string;
  visitType: VisitType;
  packageType?: PackageType;
  serviceType?: ServiceType;
  specialty?: Specialty;
  preferredDate?: string;
  timePreference?: TimePreference;
  sessionCount?: PhysiotherapySessions;
  caseType?: PhysiotherapyCaseType;
  nursingType?: NursingType;
  nursingHoursPerDay?: NursingHours;
  nursingDuration?: NursingDuration;
}

export interface CreateBookingIntentResponse {
  success: boolean;
  bookingId: string;
  amount: number;
  currency: 'EGP';
  message?: string;
}

export interface BookingValidationError {
  field: string;
  message: string;
}

// ============================================================================
// OPTION LISTS
// ============================================================================

export const SPECIALTIES = [
  // Priority specialties at top
  { value: 'geriatrics', label: 'specialty.geriatrics' },
  { value: 'orthopedics', label: 'specialty.orthopedics' },
  { value: 'neurology', label: 'specialty.neurology' },
  { value: 'cardiology', label: 'specialty.cardiology' },
  
  // Most common specialties
  { value: 'generalMedicine', label: 'specialty.generalMedicine' },
  { value: 'pediatrics', label: 'specialty.pediatrics' },
  { value: 'dermatology', label: 'specialty.dermatology' },
  { value: 'gynecology', label: 'specialty.gynecology' },
  { value: 'ophthalmology', label: 'specialty.ophthalmology' },
  { value: 'otolaryngology', label: 'specialty.otolaryngology' },
  { value: 'psychiatry', label: 'specialty.psychiatry' },
  { value: 'urology', label: 'specialty.urology' },
  { value: 'gastroenterology', label: 'specialty.gastroenterology' },
  { value: 'pulmonology', label: 'specialty.pulmonology' },
  { value: 'rheumatology', label: 'specialty.rheumatology' },
  { value: 'endocrinology', label: 'specialty.endocrinology' },
  { value: 'nephrology', label: 'specialty.nephrology' },
  { value: 'oncology', label: 'specialty.oncology' },
  { value: 'hematology', label: 'specialty.hematology' },
  { value: 'immunology', label: 'specialty.immunology' },
] as const;

export const PHYSIOTHERAPY_CASE_TYPES = [
  { value: 'postoperative', label: 'physiotherapy.postoperative' },
  { value: 'fracture', label: 'physiotherapy.fracture' },
  { value: 'neuro', label: 'physiotherapy.neuro' },
  { value: 'other', label: 'physiotherapy.other' },
] as const;

export const NURSING_TYPES = [
  { value: 'nurse', label: 'nursing.nurse' },
  { value: 'nursingAssistant', label: 'nursing.nursingAssistant' },
] as const;

export const NURSING_HOURS = [
  { value: '8hrs', label: 'nursing.hours.8hrs' },
  { value: '12hrs', label: 'nursing.hours.12hrs' },
  { value: '24hrs', label: 'nursing.hours.24hrs' },
] as const;

export const NURSING_DURATIONS = [
  { value: '1week', label: 'nursing.duration.1week' },
  { value: '2weeks', label: 'nursing.duration.2weeks' },
  { value: '1month', label: 'nursing.duration.1month' },
] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate processing fee (2.75% rounded up)
 */
export function calculateProcessingFee(basePrice: number): number {
  const fee = basePrice * 0.0275;
  return Math.ceil(fee); // Round up
}

/**
 * Calculate total price including processing fee
 */
export function calculateTotalWithFee(basePrice: number): number {
  return basePrice + calculateProcessingFee(basePrice);
}

/**
 * Calculate total booking price based on selections
 */
export function calculateBookingPrice(state: BookingFormState): number {
  if (!state.visitType) return 0;

  // Package pricing
  if (state.visitType === 'package') {
    if (!state.packageType) return 0;
    
    const packagePrices = {
      haraka: 5000, // Joint & Arthritis Care - 3-6 months
      wai: 8000,    // Cognitive & Dementia Care - 6-12 months
      amal: 6000,   // Stroke Recovery - 3-6 months
    };
    
    return packagePrices[state.packageType] || 0;
  }

  if (state.visitType === 'telemedicine') {
    return BOOKING_PRICING.telemedicine;
  }

  // Home Visit pricing
  if (!state.serviceType) return 0;

  if (state.serviceType === 'doctorVisit') {
    return BOOKING_PRICING.homeVisit.doctorVisit;
  }

  if (state.serviceType === 'physiotherapy') {
    if (!state.sessionCount) return 0;
    return state.sessionCount === '1'
      ? BOOKING_PRICING.homeVisit.physiotherapy.single
      : BOOKING_PRICING.homeVisit.physiotherapy.twelve;
  }

  if (state.serviceType === 'nursing') {
    if (!state.nursingType || !state.nursingHoursPerDay || !state.nursingDuration) return 0;

    // Get base price (hourly rate) based on nursing type
    const basePrice = state.nursingType === 'nurse'
      ? BOOKING_PRICING.homeVisit.nursing.nurse
      : BOOKING_PRICING.homeVisit.nursing.nurseAssistant;

    const hourMultiplier =
      BOOKING_PRICING.homeVisit.nursing.hourMultipliers[state.nursingHoursPerDay];
    const durationMultiplier =
      BOOKING_PRICING.homeVisit.nursing.durationMultipliers[state.nursingDuration];

    // Calculate days in the duration
    const daysMap = { '1week': 7, '2weeks': 14, '1month': 30 };
    const days = daysMap[state.nursingDuration];

    // Calculate step by step:
    // 1. Daily rate = basePrice * hourMultiplier (e.g., 110 * 1.0 = 110 per day)
    const dailyRate = basePrice * hourMultiplier;
    
    // 2. Period total = dailyRate * days (e.g., 110 * 7 = 770 for 1 week)
    const periodTotal = dailyRate * days;
    
    // 3. Final price = periodTotal * durationMultiplier (apply discount, e.g., 770 * 0.95 = 731.50 for 2 weeks)
    const finalPrice = periodTotal * durationMultiplier;

    return Math.round(finalPrice);
  }

  return 0;
}

/**
 * Validate booking form data
 */
export function validateBookingForm(
  state: BookingFormState
): BookingValidationError[] {
  const errors: BookingValidationError[] = [];

  if (!state.fullName?.trim()) {
    errors.push({ field: 'fullName', message: 'booking.validation.fullNameRequired' });
  }

  if (!state.countryCode?.trim()) {
    errors.push({
      field: 'countryCode',
      message: 'booking.validation.countryCodeRequired',
    });
  }

  if (!state.phoneNumber?.trim()) {
    errors.push({
      field: 'phoneNumber',
      message: 'booking.validation.phoneNumberRequired',
    });
  }

  // Simple phone validation (10 digits for Egyptian phone)
  if (state.phoneNumber && !/^[0-9]{10}$/.test(state.phoneNumber.replace(/\s/g, ''))) {
    errors.push({
      field: 'phoneNumber',
      message: 'booking.validation.invalidPhoneNumber',
    });
  }

  if (!state.visitType) {
    errors.push({
      field: 'visitType',
      message: 'booking.validation.visitTypeRequired',
    });
  }

  // Package validation
  if (state.visitType === 'package') {
    if (!state.packageType) {
      errors.push({
        field: 'packageType',
        message: 'booking.validation.packageTypeRequired',
      });
    }
    // For packages, we only need personal info, no other validations needed
    return errors;
  }

  if (state.visitType === 'homeVisit') {
    if (!state.serviceType) {
      errors.push({
        field: 'serviceType',
        message: 'booking.validation.serviceTypeRequired',
      });
    }

    if (state.serviceType === 'doctorVisit') {
      if (!state.specialty) {
        errors.push({
          field: 'specialty',
          message: 'booking.validation.specialtyRequired',
        });
      }
      if (!state.preferredDate) {
        errors.push({
          field: 'preferredDate',
          message: 'booking.validation.preferredDateRequired',
        });
      }
      if (!state.timePreference) {
        errors.push({
          field: 'timePreference',
          message: 'booking.validation.timePreferenceRequired',
        });
      }
    }

    if (state.serviceType === 'physiotherapy') {
      if (!state.sessionCount) {
        errors.push({
          field: 'sessionCount',
          message: 'booking.validation.sessionCountRequired',
        });
      }
      if (!state.caseType) {
        errors.push({
          field: 'caseType',
          message: 'booking.validation.caseTypeRequired',
        });
      }
    }

    if (state.serviceType === 'nursing') {
      if (!state.nursingType) {
        errors.push({
          field: 'nursingType',
          message: 'booking.validation.nursingTypeRequired',
        });
      }
      if (!state.nursingHoursPerDay) {
        errors.push({
          field: 'nursingHoursPerDay',
          message: 'booking.validation.nursingHoursRequired',
        });
      }
      if (!state.nursingDuration) {
        errors.push({
          field: 'nursingDuration',
          message: 'booking.validation.nursingDurationRequired',
        });
      }
    }
  }

  return errors;
}

/**
 * Get service type display name (for summary)
 */
export function getServiceLabel(
  serviceType: ServiceType | null,
  specialty?: Specialty | null
): string {
  if (!serviceType) return '';
  if (serviceType === 'doctorVisit' && specialty) {
    const spec = SPECIALTIES.find((s) => s.value === specialty);
    return spec ? spec.label : '';
  }
  return `serviceType.${serviceType}`;
}
