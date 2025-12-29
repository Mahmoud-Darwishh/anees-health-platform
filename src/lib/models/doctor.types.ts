/**
 * Strict type definitions for Doctor domain entities
 * Health-tech platform requirements
 */

export interface DoctorClinicDetails {
  name: string;
  location: string;
  address: string;
  hours: string;
  slots: string;
  mapUrl?: string;
}

export interface DoctorEducation {
  degree: string;
  university: string;
  year: string;
}

export interface DoctorTestimonial {
  name: string;
  rating: number;
  text: string;
}

export interface DoctorPricing {
  telemedicine: string;
  homeVisit: string;
  clinicVisit: string;
}

/**
 * Core Doctor entity with bilingual support
 * Represents a healthcare provider in the platform
 */
export interface Doctor {
  id: number;
  image: string;
  rating: number;
  speciality: string;
  specialityColorClass: string;
  specialityTextClass: string;
  availabilityStatus: string;
  availabilityBadgeClass: string;
  doctorName: string;
  location: string;
  duration: string;
  consultationFee: string;
  maxConsultationFee: string;
  professionalTitle: string;
  profileLink: string;
  bookingLink: string;
  gender: string;
  channels: string[];
  languages: string[];
  clinics: string[];
  experienceYears: number;
  bio: string;
  certifications: string[];
  education: DoctorEducation[];
  pricing: DoctorPricing;
  successRate: string;
  avgWaitTime: string;
  totalPatients: string;
  areaCoverage: string[];
  clinicDetails: DoctorClinicDetails[];
  testimonials: DoctorTestimonial[];
}

/**
 * Localized doctor data container
 */
export interface LocalizedDoctorData {
  en: Doctor[];
  ar: Doctor[];
}

/**
 * Doctor profile view model optimized for SEO and rendering
 */
export interface DoctorProfileData {
  doctor: Doctor;
  locale: 'en' | 'ar';
  slug: string;
  alternateLocales: {
    en: string;
    ar: string;
  };
}

/**
 * Schema.org Physician structured data
 */
export interface PhysicianSchema {
  '@context': 'https://schema.org';
  '@type': 'Physician';
  name: string;
  description?: string;
  medicalSpecialty: string;
  address?: {
    '@type': 'PostalAddress';
    addressLocality: string;
    addressCountry: string;
  };
  image?: string;
  url: string;
}
