// Global type definitions for the Anees Health Platform

export interface Locale {
  code: 'en' | 'ar';
  name: string;
  dir: 'ltr' | 'rtl';
}

export interface NavItem {
  label: string;
  href: string;
}

export interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
}

// Future types for telemedicine features

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  languages: string[];
  rating: number;
  available: boolean;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredLanguage: 'en' | 'ar';
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  type: 'video' | 'chat' | 'in-person';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}
