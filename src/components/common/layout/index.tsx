/**
 * Token-based layout primitives — the modern, Bootstrap-free layout system.
 * Native CSS Grid/Flexbox + logical properties, driven by the design tokens.
 *
 *   <Container>  max-width wrapper (mirrors Bootstrap's responsive widths)
 *   <Section>    vertical section padding
 *   <Grid>       responsive auto-fitting card grid (replaces row + col-*)
 *   <Stack>      vertical flow with gap
 *   <Cluster>    horizontal wrap with gap (replaces d-flex gap-*)
 *   <Measure>    readable max-width for long-form prose
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';
import styles from './Layout.module.scss';

const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(' ');

const GAPS = { none: '0', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' } as const;
type Gap = keyof typeof GAPS;

interface BaseProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export function Container({ children, as: Tag = 'div', className }: BaseProps) {
  return <Tag className={cx(styles.container, className)}>{children}</Tag>;
}

export function Section({ children, as: Tag = 'section', className, ...rest }: BaseProps & Record<string, unknown>) {
  return (
    <Tag className={cx(styles.section, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Grid({
  children,
  min = '280px',
  gap = 'lg',
  className,
}: BaseProps & { min?: string; gap?: Gap }) {
  const style = { '--grid-min': min, '--grid-gap': GAPS[gap] } as CSSProperties;
  return (
    <div className={cx(styles.grid, className)} style={style}>
      {children}
    </div>
  );
}

export function Stack({
  children,
  as: Tag = 'div',
  gap = 'md',
  className,
}: BaseProps & { gap?: Gap }) {
  const style = { '--stack-gap': GAPS[gap] } as CSSProperties;
  return (
    <Tag className={cx(styles.stack, className)} style={style}>
      {children}
    </Tag>
  );
}

export function Cluster({
  children,
  as: Tag = 'div',
  gap = 'sm',
  className,
}: BaseProps & { gap?: Gap }) {
  const style = { '--cluster-gap': GAPS[gap] } as CSSProperties;
  return (
    <Tag className={cx(styles.cluster, className)} style={style}>
      {children}
    </Tag>
  );
}

export function Measure({ children, as: Tag = 'div', className }: BaseProps) {
  return <Tag className={cx(styles.measure, className)}>{children}</Tag>;
}
