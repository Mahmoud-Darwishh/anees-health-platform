export type DailySeriesPoint = {
  label: string;
  value: number;
};

type DayRange = {
  start: Date;
  end: Date;
  label: string;
};

function toStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatDayLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'Africa/Cairo',
  }).format(date);
}

export function buildRecentDayRanges(days = 7, locale = 'en-GB'): DayRange[] {
  const today = toStartOfDay(new Date());
  const ranges: DayRange[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const start = new Date(today);
    start.setDate(today.getDate() - index);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    ranges.push({
      start,
      end,
      label: formatDayLabel(start, locale),
    });
  }

  return ranges;
}

export async function buildDailySeries(
  countForRange: (start: Date, end: Date) => Promise<number>,
  days = 7,
  locale = 'en-GB',
): Promise<DailySeriesPoint[]> {
  const ranges = buildRecentDayRanges(days, locale);

  const values = await Promise.all(
    ranges.map((range) => countForRange(range.start, range.end)),
  );

  return ranges.map((range, index) => ({
    label: range.label,
    value: values[index],
  }));
}
