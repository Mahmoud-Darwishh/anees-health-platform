export const uniqueSorted = (items: string[]): string[] =>
  Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));
