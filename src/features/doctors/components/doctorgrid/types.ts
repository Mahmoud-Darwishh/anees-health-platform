import type { Doctor as ModelDoctor } from '@/lib/models/doctor.types';

export type Doctor = ModelDoctor;
export type DoctorChannel = string;
export type DoctorLanguage = string;
export type SortOrder = 'none' | 'low' | 'high';

export interface FilterState {
  selectedSpecialities: string[];
  selectedChannels: string[];
  selectedGenders: string[];
  selectedLanguages: string[];
  selectedExperience: number[];
  priceRange: [number, number];
  selectedRatings: number[];
  searchText: string;
  locationText: string;
}
