import { BookingFormState, getServiceLabel } from '@/lib/models/booking.types';

/**
 * Generate a formatted booking message for WhatsApp
 */
export function generateBookingMessage(
  formState: BookingFormState,
  totalPrice: number,
  locale: string
): string {
  const isArabic = locale === 'ar';

  if (isArabic) {
    return `مرحباً بك في أنيس هيلث! 👋

أود حجز خدمة بالتفاصيل التالية:

📋 الاسم: ${formState.fullName}
📱 الهاتف: ${formState.phoneNumber}
🏥 نوع الزيارة: ${getVisitTypeString(formState.visitType, isArabic)}
${formState.serviceType ? `💼 الخدمة: ${getServiceTypeString(formState.serviceType, isArabic)}` : ''}
${formState.specialty ? `🩺 التخصص: ${getSpecialtyString(formState.specialty)}` : ''}
${formState.preferredDate ? `📅 التاريخ المفضل: ${new Date(formState.preferredDate).toLocaleDateString('ar-EG')}` : ''}
${formState.timePreference ? `⏰ الوقت: ${getTimePreferenceString(formState.timePreference, isArabic)}` : ''}
${formState.sessionCount ? `🔢 الجلسات: ${getSessionCountString(formState.sessionCount, isArabic)}` : ''}
${formState.caseType ? `📋 نوع الحالة: ${getCaseTypeString(formState.caseType)}` : ''}
${formState.nursingType ? `👨‍⚕️ المهني: ${getNursingTypeString(formState.nursingType)}` : ''}
${formState.nursingHoursPerDay ? `⏱️ الساعات: ${getNursingHoursString(formState.nursingHoursPerDay)}` : ''}
${formState.nursingDuration ? `📆 المدة: ${getNursingDurationString(formState.nursingDuration)}` : ''}

💰 السعر الإجمالي: ${totalPrice} جنيه مصري

الرجاء تأكيد حجزي وتقديم الخطوات التالية.

شكراً لك! ❤️`;
  }

  return `Hello Anees Health! 👋

I would like to book a service with the following details:

📋 Name: ${formState.fullName}
📱 Phone: ${formState.phoneNumber}
🏥 Visit Type: ${getVisitTypeString(formState.visitType, isArabic)}
${formState.serviceType ? `💼 Service: ${getServiceTypeString(formState.serviceType, isArabic)}` : ''}
${formState.specialty ? `🩺 Specialty: ${getSpecialtyString(formState.specialty)}` : ''}
${formState.preferredDate ? `📅 Preferred Date: ${new Date(formState.preferredDate).toLocaleDateString('en-US')}` : ''}
${formState.timePreference ? `⏰ Time: ${getTimePreferenceString(formState.timePreference, isArabic)}` : ''}
${formState.sessionCount ? `🔢 Sessions: ${getSessionCountString(formState.sessionCount, isArabic)}` : ''}
${formState.caseType ? `📋 Case Type: ${getCaseTypeString(formState.caseType)}` : ''}
${formState.nursingType ? `👨‍⚕️ Professional: ${getNursingTypeString(formState.nursingType)}` : ''}
${formState.nursingHoursPerDay ? `⏱️ Hours: ${getNursingHoursString(formState.nursingHoursPerDay)}` : ''}
${formState.nursingDuration ? `📆 Duration: ${getNursingDurationString(formState.nursingDuration)}` : ''}

💰 Total Price: ${totalPrice} EGP

Please confirm my booking and provide the next steps.

Thank you! ❤️`;
}

/**
 * Encode message for URL encoding in WhatsApp links
 */
export function encodeWhatsAppMessage(message: string): string {
  return encodeURIComponent(message);
}

// Helper functions for label generation
function getVisitTypeString(visitType: string | null, isArabic: boolean): string {
  if (!visitType) return '';
  return visitType === 'homeVisit'
    ? isArabic
      ? 'زيارة منزلية'
      : 'Home Visit'
    : isArabic
      ? 'استشارة عن بُعد'
      : 'Telemedicine';
}

function getServiceTypeString(serviceType: string | null, isArabic: boolean): string {
  if (!serviceType) return '';
  const services: Record<string, { ar: string; en: string }> = {
    doctorVisit: { ar: 'زيارة طبيب', en: 'Doctor Visit' },
    physiotherapy: { ar: 'العلاج الطبيعي', en: 'Physiotherapy' },
    nursing: { ar: 'رعاية تمريضية', en: 'Nursing Care' },
  };
  return services[serviceType]?.[isArabic ? 'ar' : 'en'] || '';
}

function getSpecialtyString(specialty: string | null): string {
  if (!specialty) return '';
  const specialties: Record<string, string> = {
    generalMedicine: 'General Medicine / الطب العام',
    pediatrics: 'Pediatrics / طب الأطفال',
    orthopedics: 'Orthopedics / جراحة العظام',
    cardiology: 'Cardiology / أمراض القلب',
    dermatology: 'Dermatology / الأمراض الجلدية',
  };
  return specialties[specialty] || '';
}

function getTimePreferenceString(timePreference: string | null, isArabic: boolean): string {
  if (!timePreference) return '';
  const times: Record<string, { ar: string; en: string }> = {
    morning: { ar: 'صباحاً', en: 'Morning' },
    evening: { ar: 'مساءً', en: 'Evening' },
    doesntMatter: { ar: 'لا يهمني', en: "Doesn't Matter" },
  };
  return times[timePreference]?.[isArabic ? 'ar' : 'en'] || '';
}

function getSessionCountString(sessionCount: string | null, isArabic: boolean): string {
  if (!sessionCount) return '';
  const sessions: Record<string, { ar: string; en: string }> = {
    '1': { ar: 'جلسة واحدة', en: '1 Session' },
    '12': { ar: '12 جلسة', en: '12 Sessions' },
  };
  return sessions[sessionCount]?.[isArabic ? 'ar' : 'en'] || '';
}

function getCaseTypeString(caseType: string | null): string {
  if (!caseType) return '';
  const caseTypes: Record<string, string> = {
    postoperative: 'Postoperative Recovery / التعافي من العملية الجراحية',
    fracture: 'Fracture/Orthopedic Rehab / إعادة تأهيل الكسور',
    neuro: 'Neuro & Strokes / الأمراض العصبية',
    other: 'Other / أخرى',
  };
  return caseTypes[caseType] || '';
}

function getNursingTypeString(nursingType: string | null): string {
  if (!nursingType) return '';
  const types: Record<string, string> = {
    nurse: 'Registered Nurse / ممرضة مسجلة',
    nursingAssistant: 'Nursing Assistant / مساعد تمريض',
  };
  return types[nursingType] || '';
}

function getNursingHoursString(hours: string | null): string {
  if (!hours) return '';
  const hoursMap: Record<string, string> = {
    '8hrs': '8 Hours / 8 ساعات',
    '12hrs': '12 Hours / 12 ساعة',
    '24hrs': '24 Hours / 24 ساعة',
  };
  return hoursMap[hours] || '';
}

function getNursingDurationString(duration: string | null): string {
  if (!duration) return '';
  const durations: Record<string, string> = {
    '1week': '1 Week / أسبوع واحد',
    '2weeks': '2 Weeks / أسبوعان',
    '1month': '1 Month / شهر واحد',
  };
  return durations[duration] || '';
}
