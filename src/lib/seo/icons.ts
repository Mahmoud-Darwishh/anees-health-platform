/**
 * Icon mapping for content cards. Only uses fa-* classes that LucideIcon
 * actually maps (others render as a generic circle).
 */
const SERVICE_ICONS: Record<string, string> = {
  'doctor-at-home': 'fa-user-doctor',
  'home-nursing': 'fa-heart-pulse',
  'physiotherapy-at-home': 'fa-dumbbell',
  'lab-tests-at-home': 'fa-droplet',
  'elderly-care-at-home': 'fa-user-group',
  'post-operative-care': 'fa-hospital',
  'palliative-chronic-care': 'fa-heart',
};

const CONDITION_ICONS: Record<string, string> = {
  'stroke-rehab-at-home': 'fa-dumbbell',
  'post-surgery-wound-care': 'fa-hospital',
  'diabetic-foot-care': 'fa-droplet',
  'elderly-fall-prevention': 'fa-shield-halved',
};

export function serviceIcon(slug: string): string {
  return SERVICE_ICONS[slug] || 'fa-heart-pulse';
}

export function conditionIcon(slug: string): string {
  return CONDITION_ICONS[slug] || 'fa-heart-pulse';
}
