import type { Doctor as ModelDoctor } from '@/lib/models/doctor.types';

export type Doctor = ModelDoctor;
export type DoctorChannel = string;
export type DoctorLanguage = string;
export type SortOrder = 'none' | 'experience';

export interface FilterState {
  selectedSpecialities: string[];
  selectedGenders: string[];
  selectedLanguages: string[];
  selectedExperience: number[];
  searchText: string;
}
