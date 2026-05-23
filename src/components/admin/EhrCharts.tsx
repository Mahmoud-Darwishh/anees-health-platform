import styles from './EhrCharts.module.scss';

export type ChartSeriesPoint = {
  label: string;
  value: number;
};

export type MiniSparklinePoint = {
  value: number;
};

type SparklineCardProps = {
  title: string;
  subtitle: string;
  points: ChartSeriesPoint[];
  tone?: 'navy' | 'gold';
};

type DistributionItem = {
  label: string;
  value: number;
  tone?: 'navy' | 'gold' | 'teal' | 'slate';
};

type DistributionCardProps = {
  title: string;
  subtitle: string;
  items: DistributionItem[];
};

type RingCardProps = {
  title: string;
  subtitle: string;
  value: number;
  total: number;
  detail: string;
  tone?: 'navy' | 'gold';
};

const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = 132;
const CHART_PADDING = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toChartCoordinates(points: ChartSeriesPoint[]): { x: number; y: number; value: number; label: string }[] {
  if (points.length === 0) {
    return [];
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = VIEWBOX_WIDTH - CHART_PADDING * 2;
  const chartHeight = VIEWBOX_HEIGHT - CHART_PADDING * 2;
  const step = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  return points.map((point, index) => {
    const ratio = clamp(point.value / maxValue, 0, 1);
    const x = CHART_PADDING + step * index;
    const y = CHART_PADDING + chartHeight - ratio * chartHeight;

    return {
      x,
      y,
      value: point.value,
      label: point.label,
    };
  });
}

function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function buildAreaPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const baseline = VIEWBOX_HEIGHT - CHART_PADDING;

  return `${linePath} L${last.x.toFixed(2)} ${baseline.toFixed(2)} L${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

function trendToneClass(tone: SparklineCardProps['tone']): string {
  if (tone === 'gold') {
    return styles.sparkGold;
  }
  return styles.sparkNavy;
}

function barToneClass(tone: DistributionItem['tone']): string {
  if (tone === 'gold') return styles.fillGold;
  if (tone === 'teal') return styles.fillTeal;
  if (tone === 'slate') return styles.fillSlate;
  return styles.fillNavy;
}

function ringToneClass(tone: RingCardProps['tone']): string {
  if (tone === 'gold') return styles.ringGold;
  return styles.ringNavy;
}

function miniToneClass(tone: SparklineCardProps['tone']): string {
  if (tone === 'gold') return styles.miniGold;
  return styles.miniNavy;
}

export function SparklineCard({ title, subtitle, points, tone = 'navy' }: SparklineCardProps) {
  const chartPoints = toChartCoordinates(points);
  const linePath = buildLinePath(chartPoints);
  const areaPath = buildAreaPath(chartPoints);

  return (
    <article className={`${styles.card} ${styles.sparkCard}`}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>

      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className={`${styles.sparkline} ${trendToneClass(tone)}`} role="img" aria-label={title}>
        <path d={areaPath} className={styles.areaPath} />
        <path d={linePath} className={styles.linePath} />
        {chartPoints.map((point) => (
          <g key={`${point.label}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r={4.6} className={styles.dotOuter} />
            <circle cx={point.x} cy={point.y} r={2.3} className={styles.dotInner} />
          </g>
        ))}
      </svg>

      <footer className={styles.sparkLabels}>
        {points.map((point) => (
          <span key={`${point.label}-label`}>{point.label}</span>
        ))}
      </footer>
    </article>
  );
}

export function DistributionCard({ title, subtitle, items }: DistributionCardProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>

      <ul className={styles.distributionList}>
        {items.map((item) => {
          const width = `${(item.value / maxValue) * 100}%`;

          return (
            <li key={item.label} className={styles.distributionItem}>
              <div className={styles.itemRow}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
              <div className={styles.track}>
                <span className={`${styles.fill} ${barToneClass(item.tone)}`} style={{ width }} />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function RingProgressCard({
  title,
  subtitle,
  value,
  total,
  detail,
  tone = 'navy',
}: RingCardProps) {
  const safeTotal = Math.max(total, 1);
  const ratio = clamp(value / safeTotal, 0, 1);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const percentage = Math.round(ratio * 100);

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>

      <div className={styles.ringWrap}>
        <svg viewBox="0 0 128 128" className={`${styles.ringChart} ${ringToneClass(tone)}`} role="img" aria-label={title}>
          <circle cx="64" cy="64" r={radius} className={styles.ringTrack} />
          <circle
            cx="64"
            cy="64"
            r={radius}
            className={styles.ringFill}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 64 64)"
          />
        </svg>

        <div className={styles.ringCenter}>
          <strong>{percentage}%</strong>
          <span>{detail}</span>
        </div>
      </div>
    </article>
  );
}

export function MiniSparkline({
  points,
  tone = 'navy',
  ariaLabel,
}: {
  points: MiniSparklinePoint[];
  tone?: 'navy' | 'gold';
  ariaLabel: string;
}) {
  const transformed = toChartCoordinates(
    points.map((point, index) => ({ label: `${index + 1}`, value: point.value })),
  );
  const linePath = buildLinePath(transformed);
  const areaPath = buildAreaPath(transformed);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className={`${styles.miniSparkline} ${miniToneClass(tone)}`}
      role="img"
      aria-label={ariaLabel}
    >
      <path d={areaPath} className={styles.areaPath} />
      <path d={linePath} className={styles.linePath} />
    </svg>
  );
}
