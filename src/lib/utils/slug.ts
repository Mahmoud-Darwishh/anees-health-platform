/**
 * Slug generation utilities for URL-friendly identifiers
 * Ensures stable, SEO-friendly slugs across locales
 */

/**
 * Transliterate Arabic characters to ASCII equivalents
 * Maps common Arabic names to Latin script
 */
const arabicToAsciiMap: Record<string, string> = {
  'أ': 'a', 'إ': 'i', 'آ': 'a', 'ا': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
  'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
  'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '',
};

/**
 * Generate a stable, SEO-friendly slug from doctor's name
 * 
 * Rules:
 * - ASCII only (transliterate Arabic if needed)
 * - Lowercase
 * - Hyphenated
 * - No titles (dr, doctor, etc.)
 * - Stable across locales
 * 
 * @param name - Doctor's full name (English or Arabic)
 * @returns URL-safe slug (e.g., "mohamed-farwiez")
 */
export function generateDoctorSlug(name: string): string {
  // Remove common titles
  const withoutTitle = name
    .replace(/^(dr\.?|doctor|د\.?)\s+/gi, '')
    .trim();

  // Transliterate Arabic characters
  let transliterated = '';
  for (const char of withoutTitle) {
    if (arabicToAsciiMap[char]) {
      transliterated += arabicToAsciiMap[char];
    } else {
      transliterated += char;
    }
  }

  // Generate slug
  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from ends
}

/**
 * Validate a slug format
 * @param slug - The slug to validate
 * @returns true if valid
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
