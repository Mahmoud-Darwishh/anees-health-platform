/**
 * Blood-glucose profile clinical logic — pure, framework-free, fully unit-tested.
 *
 * The defining idea of a glucose *profile* (vs a single reading) is that the meaning
 * of a number depends on WHEN it was taken relative to meals. 140 mg/dL is excellent
 * 2h after a meal and too high fasting. So classification is timing-aware, and the
 * "logbook" arranges readings into the clinician's 7-point daily grid.
 *
 * Targets follow ADA standards (mg/dL):
 *   pre-meal / fasting / overnight : 80–130
 *   bedtime                        : 90–140
 *   2h post-meal / random          : < 180
 *   hypoglycemia                   : < 70 (level 1), < 54 (level 2, urgent)
 *   critical hyper                 : >= 250
 */

import { mgDlToMmolL } from './glucose-units';

export const GLUCOSE_TIMING_VALUES = [
  'fasting',
  'pre_meal',
  'post_meal',
  'bedtime',
  'overnight',
  'random',
] as const;
export type GlucoseTiming = (typeof GLUCOSE_TIMING_VALUES)[number];

export const GLUCOSE_MEAL_VALUES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type GlucoseMeal = (typeof GLUCOSE_MEAL_VALUES)[number];

export const GLUCOSE_TIMINGS: Array<{ value: GlucoseTiming; label: string }> = [
  { value: 'fasting', label: 'Fasting (pre-breakfast)' },
  { value: 'pre_meal', label: 'Before a meal' },
  { value: 'post_meal', label: '2 hours after a meal' },
  { value: 'bedtime', label: 'Bedtime' },
  { value: 'overnight', label: 'Overnight (≈3 AM)' },
  { value: 'random', label: 'Random / casual' },
];

export const GLUCOSE_MEALS: Array<{ value: GlucoseMeal; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export type GlucoseCategory = 'critical_low' | 'low' | 'in_range' | 'high' | 'critical_high';

export type GlucoseTargetBand = {
  criticalLow: number;
  low: number;
  high: number;
  criticalHigh: number;
};

const HYPO_LEVEL_2 = 54; // critically low — clinically significant hypoglycemia
const HYPO_LEVEL_1 = 70; // low
const CRITICAL_HIGH = 250;

const TARGET_UPPER: Record<GlucoseTiming, number> = {
  fasting: 130,
  pre_meal: 130,
  overnight: 130,
  bedtime: 140,
  post_meal: 180,
  // A casual/random reading has no meal anchor; ADA's diabetes-range threshold (200)
  // is the fair "high" cutoff rather than the stricter post-meal 180.
  random: 200,
};

export function glucoseTargetBand(timing: GlucoseTiming): GlucoseTargetBand {
  return {
    criticalLow: HYPO_LEVEL_2,
    low: HYPO_LEVEL_1,
    high: TARGET_UPPER[timing],
    criticalHigh: CRITICAL_HIGH,
  };
}

/** Context-aware classification — the heart of the profile. */
export function classifyGlucose(mgDl: number, timing: GlucoseTiming): GlucoseCategory {
  const band = glucoseTargetBand(timing);
  if (mgDl < band.criticalLow) return 'critical_low';
  if (mgDl < band.low) return 'low';
  if (mgDl >= band.criticalHigh) return 'critical_high';
  if (mgDl >= band.high) return 'high';
  return 'in_range';
}

export function isHypoglycemia(category: GlucoseCategory): boolean {
  return category === 'low' || category === 'critical_low';
}

export function isCriticalGlucose(category: GlucoseCategory): boolean {
  return category === 'critical_low' || category === 'critical_high';
}

/** Maps a category to the FHIR v3 ObservationInterpretation code stored on the reading. */
export function glucoseInterpretationCode(category: GlucoseCategory): { code: string; display: string } {
  switch (category) {
    case 'critical_low':
      return { code: 'LL', display: 'Critically low' };
    case 'low':
      return { code: 'L', display: 'Low' };
    case 'high':
      return { code: 'H', display: 'High' };
    case 'critical_high':
      return { code: 'HH', display: 'Critically high' };
    default:
      return { code: 'N', display: 'Normal' };
  }
}

export function glucoseCategoryLabel(category: GlucoseCategory): string {
  return glucoseInterpretationCode(category).display;
}

// ── Summary statistics ──────────────────────────────────────────────────────

export type GlucoseReadingLike = {
  valueMgDl: number;
  timing: GlucoseTiming;
  measuredAt: string;
  meal?: GlucoseMeal | null;
};

/** Estimated HbA1c from mean glucose (ADAG regression): A1c% = (mean + 46.7) / 28.7. */
export function estimateHbA1c(meanMgDl: number): number {
  return Math.round(((meanMgDl + 46.7) / 28.7) * 10) / 10;
}

export type GlucoseProfileSummary = {
  count: number;
  averageMgDl: number | null;
  averageMmolL: number | null;
  estimatedHbA1c: number | null;
  timeInRangePct: number | null;
  lowCount: number;
  highCount: number;
  criticalCount: number;
};

export function summarizeGlucoseReadings(readings: GlucoseReadingLike[]): GlucoseProfileSummary {
  if (readings.length === 0) {
    return {
      count: 0,
      averageMgDl: null,
      averageMmolL: null,
      estimatedHbA1c: null,
      timeInRangePct: null,
      lowCount: 0,
      highCount: 0,
      criticalCount: 0,
    };
  }

  let sum = 0;
  let inRange = 0;
  let lowCount = 0;
  let highCount = 0;
  let criticalCount = 0;

  for (const reading of readings) {
    sum += reading.valueMgDl;
    const category = classifyGlucose(reading.valueMgDl, reading.timing);
    if (category === 'in_range') inRange += 1;
    if (isHypoglycemia(category)) lowCount += 1;
    if (category === 'high' || category === 'critical_high') highCount += 1;
    if (isCriticalGlucose(category)) criticalCount += 1;
  }

  const mean = sum / readings.length;
  return {
    count: readings.length,
    averageMgDl: Math.round(mean),
    averageMmolL: mgDlToMmolL(mean),
    estimatedHbA1c: estimateHbA1c(mean),
    timeInRangePct: Math.round((inRange / readings.length) * 100),
    lowCount,
    highCount,
    criticalCount,
  };
}

// ── Logbook grid (the 7-point daily profile) ────────────────────────────────

export type LogbookSlot =
  | 'overnight'
  | 'bf_pre'
  | 'bf_post'
  | 'ln_pre'
  | 'ln_post'
  | 'dn_pre'
  | 'dn_post'
  | 'bedtime';

export const GLUCOSE_LOGBOOK_SLOTS: Array<{ slot: LogbookSlot; meal: string; label: string }> = [
  { slot: 'overnight', meal: 'Overnight', label: '~3 AM' },
  { slot: 'bf_pre', meal: 'Breakfast', label: 'Pre' },
  { slot: 'bf_post', meal: 'Breakfast', label: '2h post' },
  { slot: 'ln_pre', meal: 'Lunch', label: 'Pre' },
  { slot: 'ln_post', meal: 'Lunch', label: '2h post' },
  { slot: 'dn_pre', meal: 'Dinner', label: 'Pre' },
  { slot: 'dn_post', meal: 'Dinner', label: '2h post' },
  { slot: 'bedtime', meal: 'Bedtime', label: '—' },
];

/**
 * Time-of-day bands (24h clock) used to place a reading that carries no explicit
 * meal context — exactly how glucometers auto-tag a fingerstick by the clock.
 */
export function logbookSlotForHour(hour: number): LogbookSlot {
  if (hour < 5) return 'overnight';
  if (hour < 9) return 'bf_pre';
  if (hour < 11) return 'bf_post';
  if (hour < 13) return 'ln_pre';
  if (hour < 16) return 'ln_post';
  if (hour < 19) return 'dn_pre';
  if (hour < 21) return 'dn_post';
  return 'bedtime';
}

/**
 * Every reading lands somewhere. Explicit meal/timing context wins; otherwise the
 * reading is placed by its time of day. This is what lets "random" readings sit in
 * the logbook alongside structured ones.
 */
export function resolveLogbookSlot(
  timing: GlucoseTiming,
  meal: GlucoseMeal | null,
  hour: number,
): LogbookSlot {
  if (timing === 'overnight') return 'overnight';
  if (timing === 'bedtime') return 'bedtime';
  if (timing === 'fasting') return 'bf_pre';
  if (timing === 'pre_meal') {
    if (meal === 'breakfast') return 'bf_pre';
    if (meal === 'lunch') return 'ln_pre';
    if (meal === 'dinner') return 'dn_pre';
  }
  if (timing === 'post_meal') {
    if (meal === 'breakfast') return 'bf_post';
    if (meal === 'lunch') return 'ln_post';
    if (meal === 'dinner') return 'dn_post';
  }
  // random, or pre/post without a named meal → place by the clock.
  return logbookSlotForHour(hour);
}

export type LogbookCell = { valueMgDl: number; category: GlucoseCategory; placedByClock: boolean } | null;
export type LogbookDay = { date: string; cells: Record<LogbookSlot, LogbookCell> };

function hasExplicitSlot(timing: GlucoseTiming, meal: GlucoseMeal | null): boolean {
  if (timing === 'overnight' || timing === 'bedtime' || timing === 'fasting') return true;
  if ((timing === 'pre_meal' || timing === 'post_meal') && meal) return true;
  return false;
}

export function buildGlucoseLogbook(readings: GlucoseReadingLike[], maxDays = 7): LogbookDay[] {
  const byDate = new Map<string, Map<LogbookSlot, GlucoseReadingLike>>();

  for (const reading of readings) {
    const hour = new Date(reading.measuredAt).getUTCHours();
    const slot = resolveLogbookSlot(reading.timing, reading.meal ?? null, hour);
    const date = reading.measuredAt.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, new Map());
    const slots = byDate.get(date)!;
    const existing = slots.get(slot);
    // Keep the latest reading when a slot is filled more than once in a day.
    if (!existing || existing.measuredAt < reading.measuredAt) {
      slots.set(slot, reading);
    }
  }

  const dates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1)).slice(0, maxDays);

  return dates.map((date) => {
    const slots = byDate.get(date)!;
    const cells = {} as Record<LogbookSlot, LogbookCell>;
    for (const { slot } of GLUCOSE_LOGBOOK_SLOTS) {
      const reading = slots.get(slot);
      cells[slot] = reading
        ? {
            valueMgDl: reading.valueMgDl,
            category: classifyGlucose(reading.valueMgDl, reading.timing),
            placedByClock: !hasExplicitSlot(reading.timing, reading.meal ?? null),
          }
        : null;
    }
    return { date, cells };
  });
}
