'use client';

import { useMemo, useState } from 'react';
import { DistributionCard, MiniSparkline, RingProgressCard, SparklineCard } from './EhrCharts';
import styles from './PatientTimelineInsights.module.scss';

type TimelineEventInput = {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  subtitle: string;
  detail?: string;
};

type VitalPointInput = {
  measuredAt: string;
  systolicBp: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
};

type Props = {
  events: TimelineEventInput[];
  vitals: VitalPointInput[];
};

type WindowOption = 7 | 30 | 90;

const WINDOW_OPTIONS: WindowOption[] = [7, 30, 90];

const TONE_CYCLE = ['navy', 'gold', 'teal', 'slate'] as const;

function formatShortDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function startOfDay(value: Date): Date {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function typeLabel(type: string): string {
  return type.replace(/-/g, ' ');
}

function buildWindowSeries(
  events: Array<{ timestamp: Date }>,
  latestDay: Date,
  windowDays: WindowOption,
): Array<{ label: string; value: number }> {
  const dayMs = 1000 * 60 * 60 * 24;
  const buckets = windowDays === 7 ? 7 : windowDays === 30 ? 10 : 12;
  const bucketSpanDays = Math.ceil(windowDays / buckets);

  const latestStart = startOfDay(latestDay);
  const rangeStart = new Date(latestStart.getTime() - dayMs * (windowDays - 1));

  return Array.from({ length: buckets }, (_, index) => {
    const bucketStart = new Date(rangeStart.getTime() + dayMs * bucketSpanDays * index);
    const bucketEnd = new Date(bucketStart.getTime() + dayMs * bucketSpanDays);

    const value = events.filter((event) => event.timestamp >= bucketStart && event.timestamp < bucketEnd).length;

    return {
      label: windowDays === 7 ? formatShortDate(bucketStart) : `B${index + 1}`,
      value,
    };
  });
}

export default function PatientTimelineInsights({ events, vitals }: Props) {
  const [windowDays, setWindowDays] = useState<WindowOption>(30);
  const [selectedType, setSelectedType] = useState<string>('all');

  const parsedEvents = useMemo(
    () => events.map((event) => ({ ...event, timestamp: new Date(event.timestamp) })),
    [events],
  );

  const sortedEvents = useMemo(
    () => [...parsedEvents].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime()),
    [parsedEvents],
  );

  const latestEventDate = sortedEvents[0]?.timestamp ?? new Date();
  const latestEventDay = startOfDay(latestEventDate);

  const rangeStart = useMemo(
    () => new Date(latestEventDay.getTime() - 1000 * 60 * 60 * 24 * (windowDays - 1)),
    [latestEventDay, windowDays],
  );

  const eventTypes = useMemo(
    () => Array.from(new Set(sortedEvents.map((event) => event.type))).sort(),
    [sortedEvents],
  );

  const filteredEvents = useMemo(
    () => sortedEvents.filter((event) => event.timestamp >= rangeStart && (selectedType === 'all' || event.type === selectedType)),
    [rangeStart, selectedType, sortedEvents],
  );

  const trendSeries = useMemo(
    () => buildWindowSeries(filteredEvents, latestEventDay, windowDays),
    [filteredEvents, latestEventDay, windowDays],
  );

  const distributionItems = useMemo(() => {
    const counts = new Map<string, number>();

    filteredEvents.forEach((event) => {
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    });

    const ranked = Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);

    if (ranked.length === 0) {
      return [{ label: 'No events', value: 0, tone: 'slate' as const }];
    }

    return ranked.map(([type, value], index) => ({
      label: typeLabel(type),
      value,
      tone: TONE_CYCLE[index % TONE_CYCLE.length],
    }));
  }, [filteredEvents]);

  const parsedVitals = useMemo(
    () => [...vitals].map((item) => ({ ...item, measuredAt: new Date(item.measuredAt) })).sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime()).slice(-8),
    [vitals],
  );

  const systolicPoints = parsedVitals.map((item) => ({ value: safeNumber(item.systolicBp) }));
  const heartRatePoints = parsedVitals.map((item) => ({ value: safeNumber(item.heartRate) }));
  const spo2Points = parsedVitals.map((item) => ({ value: safeNumber(item.oxygenSaturation) }));

  const latestVitals = parsedVitals[parsedVitals.length - 1];

  return (
    <section className={styles.panel}>
      <div className={styles.controlsRow}>
        <div className={styles.windowGroup}>
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={windowDays === option ? styles.windowBtnActive : styles.windowBtn}
              onClick={() => setWindowDays(option)}
            >
              {option}d
            </button>
          ))}
        </div>

        <label className={styles.typeSelectWrap}>
          <span>Event type</span>
          <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
            <option value="all">All events</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>{typeLabel(type)}</option>
            ))}
          </select>
        </label>
      </div>

      <section className={styles.chartGrid}>
        <div className={styles.spanTwo}>
          <SparklineCard
            title="Timeline Density"
            subtitle="Filtered event activity over selected window"
            points={trendSeries}
            tone="navy"
          />
        </div>

        <DistributionCard
          title="Event Mix"
          subtitle="Top event categories in current filter"
          items={distributionItems}
        />

        <RingProgressCard
          title="Window Coverage"
          subtitle="Filtered events compared to full chart"
          value={filteredEvents.length}
          total={Math.max(events.length, 1)}
          detail={`${filteredEvents.length}/${events.length}`}
          tone="gold"
        />
      </section>

      <section className={styles.vitalsRow}>
        <article className={styles.vitalCard}>
          <header>
            <h4>Systolic BP</h4>
            <span>{latestVitals?.systolicBp ?? '-'} mmHg</span>
          </header>
          <MiniSparkline points={systolicPoints} ariaLabel="Systolic blood pressure trend" tone="navy" />
        </article>

        <article className={styles.vitalCard}>
          <header>
            <h4>Heart Rate</h4>
            <span>{latestVitals?.heartRate ?? '-'} bpm</span>
          </header>
          <MiniSparkline points={heartRatePoints} ariaLabel="Heart rate trend" tone="gold" />
        </article>

        <article className={styles.vitalCard}>
          <header>
            <h4>SpO2</h4>
            <span>{latestVitals?.oxygenSaturation ?? '-'}%</span>
          </header>
          <MiniSparkline points={spo2Points} ariaLabel="Oxygen saturation trend" tone="navy" />
        </article>
      </section>

      <section className={styles.eventsSection}>
        <header className={styles.eventsHeader}>
          <h3>Filtered Timeline Events</h3>
          <span>{filteredEvents.length} events • ending {formatDateTime(latestEventDate)}</span>
        </header>

        {filteredEvents.length === 0 ? (
          <p className={styles.emptyText}>No events in this filter range.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.eventsTable}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(0, 10).map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.timestamp)}</td>
                    <td>{typeLabel(event.type)}</td>
                    <td>{event.title}</td>
                    <td>{event.subtitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
