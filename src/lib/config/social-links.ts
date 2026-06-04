export type SocialBrand = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube';

export type SocialLink = {
  brand: SocialBrand;
  href: string;
};

export type FooterSocialLink = SocialLink & {
  labelKey: `footer.social_${string}`;
};

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { brand: 'facebook', href: 'https://www.facebook.com/aneeshealthcare/' },
  { brand: 'instagram', href: 'https://www.instagram.com/aneeshealth/' },
  { brand: 'linkedin', href: 'https://www.linkedin.com/company/aneeshealth' },
  { brand: 'tiktok', href: 'https://www.tiktok.com/@aneeshealth' },
  { brand: 'youtube', href: 'https://www.youtube.com/@aneeshealth' },
];

export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  {
    brand: 'facebook',
    href: 'https://www.facebook.com/aneeshealthcare/',
    labelKey: 'footer.social_facebook',
  },
  {
    brand: 'instagram',
    href: 'https://www.instagram.com/aneeshealth/',
    labelKey: 'footer.social_instagram',
  },
  {
    brand: 'tiktok',
    href: 'https://www.tiktok.com/@aneeshealth',
    labelKey: 'footer.social_tiktok',
  },
  {
    brand: 'linkedin',
    href: 'https://www.linkedin.com/company/aneeshealth',
    labelKey: 'footer.social_linkedin',
  },
];

export const SOCIAL_PROFILES = SOCIAL_LINKS.map((item) => item.href);
