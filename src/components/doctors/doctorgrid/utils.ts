import type { Doctor, DoctorChannel, DoctorLanguage } from './types';

const digitMap: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export const normalizeDigits = (value: string): string =>
  value.replace(/[٠-٩]/g, (digit) => digitMap[digit] || digit);

export const priceToNumber = (price: string): number => {
  const normalized = normalizeDigits(price);
  const match = normalized.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?/);
  return match ? Number(match[0].replace(/,/g, '')) : 0;
};

export const uniqueSorted = (items: string[]): string[] =>
  Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));

export const getChannels = (doctor: Doctor): DoctorChannel[] =>
  Array.isArray(doctor.channels) ? doctor.channels : [];

export const getLanguages = (doctor: Doctor): DoctorLanguage[] =>
  Array.isArray(doctor.languages) ? doctor.languages : [];

export const getExperienceYears = (doctor: Doctor): number =>
  typeof doctor.experienceYears === 'number' ? doctor.experienceYears : 0;
