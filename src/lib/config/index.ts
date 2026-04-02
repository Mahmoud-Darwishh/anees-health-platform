// Configuration for API endpoints and environment variables
// This file will be expanded as new features are added

export const config = {
  // API Configuration
  api: {
    baseUrl:
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000',
    timeout: 30000,
  },

  // Localization
  locales: {
    default: 'en',
    supported: ['en', 'ar'],
  },

  // Future features configuration
  features: {
    videoCall: {
      enabled: false, // To be enabled when implementing video call feature
      provider: 'webrtc',
    },
    chat: {
      enabled: false, // To be enabled when implementing chat feature
      realtime: true,
    },
    booking: {
      enabled: false, // To be enabled when implementing booking feature
      advanceBookingDays: 30,
    },
  },

  // Pagination
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100,
  },

  // Brand and social profiles used for SEO/GEO consistency
  brand: {
    socialProfiles: [
      'https://www.facebook.com/aneeshealthcare/',
      'https://www.instagram.com/aneeshealth/',
      'https://www.linkedin.com/company/aneeshealth',
      'https://www.tiktok.com/@aneeshealth',
      'https://www.youtube.com/@aneeshealth',
    ],
  },
};

export default config;
