import doctorsDataEn from './doctors.en.json';

export type Doctor = (typeof doctorsDataEn)[number];
export type DoctorChannel = Doctor['channels'] extends (infer U)[] ? U : string;
export type DoctorLanguage = Doctor['languages'] extends (infer U)[] ? U : string;
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

