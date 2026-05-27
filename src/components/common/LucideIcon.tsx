import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentPropsWithoutRef, ComponentType } from 'react';

const FALLBACK_ICON = 'Circle';

const iconMap: Record<string, string> = {
  'fa-arrow-down': 'ArrowDown',
  'fa-arrow-left': 'ArrowLeft',
  'fa-arrow-right': 'ArrowRight',
  'fa-award': 'Award',
  'fa-bolt': 'Zap',
  'fa-box-open': 'PackageOpen',
  'fa-briefcase': 'Briefcase',
  'fa-calendar-check': 'CalendarCheck',
  'fa-calendar-days': 'CalendarDays',
  'fa-check-circle': 'CircleCheck',
  'fa-chevron-down': 'ChevronDown',
  'fa-chevron-left': 'ChevronLeft',
  'fa-chevron-right': 'ChevronRight',
  'fa-circle-check': 'CircleCheck',
  'fa-circle-exclamation': 'CircleAlert',
  'fa-circle-info': 'Info',
  'fa-circle-question': 'CircleHelp',
  'fa-clock': 'Clock',
  'fa-comment-dots': 'MessageCircle',
  'fa-comments': 'MessageCircle',
  'fa-credit-card': 'CreditCard',
  'fa-download': 'Download',
  'fa-dumbbell': 'Dumbbell',
  'fa-droplet': 'Droplets',
  'fa-envelope': 'Mail',
  'fa-exclamation-circle': 'CircleAlert',
  'fa-exclamation-triangle': 'TriangleAlert',
  'fa-facebook-f': 'Globe',
  'fa-file-lines': 'FileText',
  'fa-globe': 'Globe',
  'fa-grip': 'Grip',
  'fa-heart': 'Heart',
  'fa-heart-pulse': 'HeartPulse',
  'fa-home': 'House',
  'fa-hospital': 'Building2',
  'fa-house': 'House',
  'fa-info-circle': 'Info',
  'fa-instagram': 'Globe',
  'fa-keyboard': 'Keyboard',
  'fa-layer-group': 'Layers',
  'fa-linkedin-in': 'Globe',
  'fa-location-crosshairs': 'Crosshair',
  'fa-location-dot': 'MapPin',
  'fa-lock': 'Lock',
  'fa-magnifying-glass': 'Search',
  'fa-map-location-dot': 'MapPin',
  'fa-message': 'MessageCircle',
  'fa-message-1': 'MessageCircle',
  'fa-message-question': 'MessageCircle',
  'fa-phone': 'Phone',
  'fa-plus': 'Plus',
  'fa-right-from-bracket': 'LogOut',
  'fa-search': 'Search',
  'fa-shield-halved': 'Shield',
  'fa-sliders-h': 'SlidersHorizontal',
  'fa-star': 'Star',
  'fa-table-cells-large': 'LayoutGrid',
  'fa-tiktok': 'Globe',
  'fa-times': 'X',
  'fa-times-circle': 'X',
  'fa-up-right-from-square': 'ExternalLink',
  'fa-user': 'UserRound',
  'fa-user-doctor': 'Stethoscope',
  'fa-user-group': 'UsersRound',
  'fa-users': 'UsersRound',
  'fa-video': 'Video',
  'fa-whatsapp': 'MessageCircle',
  'fa-xmark': 'X',
};

const legacyTokenMap: Record<string, string> = {
  'feather-users': 'UsersRound',
  'feather-message-circle': 'MessageCircle',
  'feather-check-circle': 'CircleCheck',
  'feather-home': 'House',
  'isax-clipboard-text': 'FileText',
  'isax-hospital': 'Building2',
  'isax-heart': 'HeartPulse',
  'isax-activity': 'Dumbbell',
};

function resolveIconName(iconClass?: string): string {
  if (!iconClass) return FALLBACK_ICON;

  const tokens = iconClass.split(/\s+/).filter(Boolean);
  const faToken = tokens.find(
    (token) =>
      token.startsWith('fa-') &&
      token !== 'fa-solid' &&
      token !== 'fa-regular' &&
      token !== 'fa-brands',
  );

  if (faToken && iconMap[faToken]) {
    return iconMap[faToken];
  }

  const legacyToken = tokens.find((token) => legacyTokenMap[token]);
  if (legacyToken) {
    return legacyTokenMap[legacyToken];
  }

  return FALLBACK_ICON;
}

function getPassthroughClassName(iconClass?: string): string {
  if (!iconClass) return '';
  return iconClass
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !token.startsWith('fa-') && token !== 'fas' && token !== 'far' && token !== 'fab')
    .join(' ');
}

type Props = Omit<ComponentPropsWithoutRef<'i'>, 'className'> & {
  iconClass?: string;
};

export default function LucideIcon({ iconClass, ...rest }: Props) {
  const iconName = resolveIconName(iconClass);
  const Icon = (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[iconName] || LucideIcons.Circle;
  const passthroughClassName = getPassthroughClassName(iconClass);

  return (
    <i className={passthroughClassName || undefined} {...rest}>
      <Icon size="1em" strokeWidth={1.9} aria-hidden="true" focusable="false" />
    </i>
  );
}
