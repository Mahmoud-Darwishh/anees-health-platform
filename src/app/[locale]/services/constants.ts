/**
 * Services Page Constants
 * Centralized service definitions with translation keys
 */

export interface ServiceItem {
  id: string;
  icon: string;
  translationKeys: {
    title: string;
    shortDesc: string;
    description: string;
    features: string;
  };
}

export const SERVICES: ServiceItem[] = [
  {
    id: 'doctorVisits',
    icon: 'isax isax-health',
    translationKeys: {
      title: 'home.servicesPage.items.doctorVisits.title',
      shortDesc: 'home.servicesPage.items.doctorVisits.shortDesc',
      description: 'home.servicesPage.items.doctorVisits.description',
      features: 'home.servicesPage.items.doctorVisits.features',
    },
  },
  {
    id: 'elderlyCare',
    icon: 'isax isax-heart-add',
    translationKeys: {
      title: 'home.servicesPage.items.elderlyCare.title',
      shortDesc: 'home.servicesPage.items.elderlyCare.shortDesc',
      description: 'home.servicesPage.items.elderlyCare.description',
      features: 'home.servicesPage.items.elderlyCare.features',
    },
  },
  {
    id: 'telemedicine',
    icon: 'isax isax-video',
    translationKeys: {
      title: 'home.servicesPage.items.telemedicine.title',
      shortDesc: 'home.servicesPage.items.telemedicine.shortDesc',
      description: 'home.servicesPage.items.telemedicine.description',
      features: 'home.servicesPage.items.telemedicine.features',
    },
  },
  {
    id: 'nursingCare',
    icon: 'isax isax-hospital',
    translationKeys: {
      title: 'home.servicesPage.items.nursingCare.title',
      shortDesc: 'home.servicesPage.items.nursingCare.shortDesc',
      description: 'home.servicesPage.items.nursingCare.description',
      features: 'home.servicesPage.items.nursingCare.features',
    },
  },
  {
    id: 'physiotherapy',
    icon: 'isax isax-activity',
    translationKeys: {
      title: 'home.servicesPage.items.physiotherapy.title',
      shortDesc: 'home.servicesPage.items.physiotherapy.shortDesc',
      description: 'home.servicesPage.items.physiotherapy.description',
      features: 'home.servicesPage.items.physiotherapy.features',
    },
  },
  {
    id: 'labTests',
    icon: 'isax isax-clipboard-text',
    translationKeys: {
      title: 'home.servicesPage.items.labTests.title',
      shortDesc: 'home.servicesPage.items.labTests.shortDesc',
      description: 'home.servicesPage.items.labTests.description',
      features: 'home.servicesPage.items.labTests.features',
    },
  },
  {
    id: 'medications',
    icon: 'isax isax-box-time',
    translationKeys: {
      title: 'home.servicesPage.items.medications.title',
      shortDesc: 'home.servicesPage.items.medications.shortDesc',
      description: 'home.servicesPage.items.medications.description',
      features: 'home.servicesPage.items.medications.features',
    },
  },
  {
    id: 'postOperative',
    icon: 'isax isax-security-user',
    translationKeys: {
      title: 'home.servicesPage.items.postOperative.title',
      shortDesc: 'home.servicesPage.items.postOperative.shortDesc',
      description: 'home.servicesPage.items.postOperative.description',
      features: 'home.servicesPage.items.postOperative.features',
    },
  },
  {
    id: 'remoteMonitoring',
    icon: 'isax isax-monitor',
    translationKeys: {
      title: 'home.servicesPage.items.remoteMonitoring.title',
      shortDesc: 'home.servicesPage.items.remoteMonitoring.shortDesc',
      description: 'home.servicesPage.items.remoteMonitoring.description',
      features: 'home.servicesPage.items.remoteMonitoring.features',
    },
  },
  {
    id: 'homeRadiology',
    icon: 'isax isax-scan',
    translationKeys: {
      title: 'home.servicesPage.items.homeRadiology.title',
      shortDesc: 'home.servicesPage.items.homeRadiology.shortDesc',
      description: 'home.servicesPage.items.homeRadiology.description',
      features: 'home.servicesPage.items.homeRadiology.features',
    },
  },
  {
    id: 'palliativeCare',
    icon: 'isax isax-heart',
    translationKeys: {
      title: 'home.servicesPage.items.palliativeCare.title',
      shortDesc: 'home.servicesPage.items.palliativeCare.shortDesc',
      description: 'home.servicesPage.items.palliativeCare.description',
      features: 'home.servicesPage.items.palliativeCare.features',
    },
  },
];

export const STATS = [
  {
    value: '10,000+',
    labelKey: 'home.servicesPage.stats.patients',
  },
  {
    value: '500+',
    labelKey: 'home.servicesPage.stats.doctors',
  },
  {
    value: '98%',
    labelKey: 'home.servicesPage.stats.satisfaction',
  },
  {
    value: '24/7',
    labelKey: 'home.servicesPage.stats.availability',
  },
];
