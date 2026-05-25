import type { ReactNode } from 'react';

type PortalMetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
};

export function PortalMetricCard({ label, value, hint, className }: PortalMetricCardProps) {
  return (
    <article className={className}>
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}
