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

/**
 * Authoritative, non-social entity references for Organization/LocalBusiness
 * `sameAs`. For Google's Knowledge Graph (and a correct, complete brand
 * knowledge panel) these do more than social links alone. Add each URL ONLY
 * once the real, live page exists — never point `sameAs` at a 404:
 *   - Wikidata item                          (strongest Knowledge Graph signal)
 *   - Google Business Profile / Maps place URL (once GBP is created + verified)
 *   - Crunchbase / other authoritative directory listings
 */
export const ENTITY_PROFILES: readonly string[] = [
  // 'https://www.wikidata.org/wiki/Q000000',                  // Wikidata (create first)
  // 'https://www.google.com/maps?cid=0000000000000000000',    // Google Business Profile
];

/** Full `sameAs` set emitted in JSON-LD = social profiles + entity references. */
export const SAME_AS_PROFILES: readonly string[] = [
  ...SOCIAL_PROFILES,
  ...ENTITY_PROFILES,
];
