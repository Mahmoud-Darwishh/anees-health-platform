export const BOOKING_PRICING = {
  telemedicine: 250,
  homeVisit: {
    doctorVisit: 1500,
    physiotherapy: {
      single: 900,
      twelve: 9500,
    },
    nursing: {
      nurse: 150, // Professional/Registered Nurse
      nurseAssistant: 100, // 33% less than Nurse
      hourMultipliers: {
        '8hrs': 8,
        '12hrs': 12,
        '24hrs': 24,
      },
      durationMultipliers: {
        '1week': 1,
        '2weeks': 0.95, // 5% discount
        '1month': 0.85, // 15% discount
      },
    },
  },
} as const;

export type BookingPricing = typeof BOOKING_PRICING;
