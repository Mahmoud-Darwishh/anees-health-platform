import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { cx } from '@/lib/styles/cx';
import styles from './primitives.module.scss';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type ControlSize = 'sm' | 'md' | 'lg';
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type Experience = 'marketing' | 'clinical' | 'ops' | 'mobile';

const toneClass: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.badgeBrand,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  info: styles.toneInfo,
};

const buttonVariantClass: Record<ButtonVariant, string | undefined> = {
  primary: undefined,
  secondary: styles.buttonSecondary,
  outline: styles.buttonOutline,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
  success: styles.buttonSuccess,
};

const buttonSizeClass: Record<ControlSize, string | undefined> = {
  sm: styles.buttonSm,
  md: undefined,
  lg: styles.buttonLg,
};

const controlSizeClass: Record<ControlSize, string | undefined> = {
  sm: styles.controlSm,
  md: undefined,
  lg: styles.controlLg,
};

const experienceClass: Record<Experience, string> = {
  marketing: styles.experienceMarketing,
  clinical: styles.experienceClinical,
  ops: styles.experienceOps,
  mobile: styles.experienceMobile,
};

function fieldDescriptionIds(...ids: Array<string | undefined>) {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  experience?: Experience;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  experience = 'marketing',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        experienceClass[experience],
        buttonVariantClass[variant],
        buttonSizeClass[size],
        fullWidth && styles.buttonFull,
        className
      )}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {!loading && leadingIcon ? <span className={styles.iconSlot}>{leadingIcon}</span> : null}
      <span className={styles.buttonContent}>{children}</span>
      {trailingIcon ? <span className={styles.iconSlot}>{trailingIcon}</span> : null}
    </button>
  );
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  experience?: Experience;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function ButtonLink({
  children,
  className,
  variant = 'primary',
  size = 'md',
  experience = 'marketing',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      {...props}
      className={cx(
        styles.button,
        experienceClass[experience],
        buttonVariantClass[variant],
        buttonSizeClass[size],
        fullWidth && styles.buttonFull,
        className
      )}
    >
      {leadingIcon ? <span className={styles.iconSlot}>{leadingIcon}</span> : null}
      <span className={styles.buttonContent}>{children}</span>
      {trailingIcon ? <span className={styles.iconSlot}>{trailingIcon}</span> : null}
    </a>
  );
}

interface FieldChromeProps {
  label?: ReactNode;
  optionalText?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  experience?: Experience;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, FieldChromeProps {
  controlSize?: ControlSize;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export function Input({
  id,
  className,
  label,
  optionalText,
  hint,
  error,
  experience = 'marketing',
  controlSize = 'md',
  startAdornment,
  endAdornment,
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cx(styles.field, experienceClass[experience], className)}>
      {label || optionalText ? (
        <div className={styles.labelRow}>
          {label ? (
            <label className={styles.label} htmlFor={inputId}>
              {label}
            </label>
          ) : null}
          {optionalText ? <span className={styles.optionalText}>{optionalText}</span> : null}
        </div>
      ) : null}
      <div className={cx(styles.control, controlSizeClass[controlSize], Boolean(error) && styles.controlInvalid)}>
        {startAdornment ? (
          <span className={cx(styles.adornment, styles.adornmentStart)}>{startAdornment}</span>
        ) : null}
        <input
          {...props}
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={fieldDescriptionIds(ariaDescribedBy, hintId, errorId)}
        />
        {endAdornment ? <span className={cx(styles.adornment, styles.adornmentEnd)}>{endAdornment}</span> : null}
      </div>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, FieldChromeProps {
  controlSize?: ControlSize;
}

export function Textarea({
  id,
  className,
  label,
  optionalText,
  hint,
  error,
  experience = 'marketing',
  controlSize = 'md',
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? `textarea-${generatedId}`;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className={cx(styles.field, experienceClass[experience], className)}>
      {label || optionalText ? (
        <div className={styles.labelRow}>
          {label ? (
            <label className={styles.label} htmlFor={textareaId}>
              {label}
            </label>
          ) : null}
          {optionalText ? <span className={styles.optionalText}>{optionalText}</span> : null}
        </div>
      ) : null}
      <div className={cx(styles.control, styles.textareaControl, controlSizeClass[controlSize], Boolean(error) && styles.controlInvalid)}>
        <textarea
          {...props}
          id={textareaId}
          className={styles.textarea}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={fieldDescriptionIds(ariaDescribedBy, hintId, errorId)}
        />
      </div>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>, FieldChromeProps {
  controlSize?: ControlSize;
}

export function Select({
  id,
  className,
  label,
  optionalText,
  hint,
  error,
  experience = 'marketing',
  controlSize = 'md',
  children,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={cx(styles.field, experienceClass[experience], className)}>
      {label || optionalText ? (
        <div className={styles.labelRow}>
          {label ? (
            <label className={styles.label} htmlFor={selectId}>
              {label}
            </label>
          ) : null}
          {optionalText ? <span className={styles.optionalText}>{optionalText}</span> : null}
        </div>
      ) : null}
      <div className={cx(styles.control, styles.selectControl, controlSizeClass[controlSize], Boolean(error) && styles.controlInvalid)}>
        <select
          {...props}
          id={selectId}
          className={styles.select}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={fieldDescriptionIds(ariaDescribedBy, hintId, errorId)}
        >
          {children}
        </select>
        <span className={styles.selectChevron} aria-hidden="true" />
      </div>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return <span {...props} className={cx(styles.badge, toneClass[tone], className)} />;
}

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Exclude<Tone, 'brand'>;
  withDot?: boolean;
}

export function StatusPill({ children, className, tone = 'neutral', withDot = true, ...props }: StatusPillProps) {
  return (
    <span {...props} className={cx(styles.statusPill, toneClass[tone], className)}>
      {withDot ? <span className={styles.statusDot} aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  experience?: Experience;
}

const cardPaddingClass: Record<NonNullable<CardProps['padding']>, string> = {
  none: styles.cardPaddingNone,
  sm: styles.cardPaddingSm,
  md: styles.cardPaddingMd,
  lg: styles.cardPaddingLg,
};

export function Card({
  children,
  className,
  eyebrow,
  title,
  description,
  actions,
  footer,
  padding = 'md',
  experience = 'marketing',
  ...props
}: CardProps) {
  return (
    <div {...props} className={cx(styles.card, experienceClass[experience], cardPaddingClass[padding], className)}>
      {eyebrow || title || description || actions ? (
        <div className={styles.cardHeader}>
          <div>
            {eyebrow ? <p className={styles.cardEyebrow}>{eyebrow}</p> : null}
            {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
            {description ? <p className={styles.cardDescription}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.cardActions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </div>
  );
}

export interface TableShellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  experience?: Experience;
}

export function TableShell({
  children,
  className,
  title,
  description,
  actions,
  footer,
  experience = 'ops',
  ...props
}: TableShellProps) {
  return (
    <div {...props} className={cx(styles.tableShell, experienceClass[experience], className)}>
      {title || description || actions ? (
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderText}>
            {title ? <h2 className={styles.tableTitle}>{title}</h2> : null}
            {description ? <p className={styles.tableDescription}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.cardActions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={styles.tableScroller}>{children}</div>
      {footer ? <div className={styles.tableFooter}>{footer}</div> : null}
    </div>
  );
}

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: 'start' | 'center';
  experience?: Experience;
}

export function PageHeader({
  className,
  eyebrow,
  title,
  description,
  actions,
  align = 'start',
  experience = 'marketing',
  ...props
}: PageHeaderProps) {
  return (
    <header
      {...props}
      className={cx(styles.pageHeader, experienceClass[experience], align === 'center' && styles.pageHeaderCentered, className)}
    >
      <div className={styles.pageHeaderInner}>
        <div className={styles.pageHeaderText}>
          {eyebrow ? <p className={styles.pageEyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.pageTitle}>{title}</h1>
          {description ? <p className={styles.pageDescription}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.pageActions}>{actions}</div> : null}
      </div>
    </header>
  );
}

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  experience?: Experience;
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  actions,
  compact = false,
  experience = 'ops',
  ...props
}: EmptyStateProps) {
  return (
    <div {...props} className={cx(styles.emptyState, experienceClass[experience], compact && styles.emptyCompact, className)}>
      {icon ? <span className={styles.emptyIcon}>{icon}</span> : null}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {description ? <p className={styles.emptyDescription}>{description}</p> : null}
      {actions ? <div className={styles.emptyActions}>{actions}</div> : null}
    </div>
  );
}

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: Exclude<Tone, 'brand'>;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  experience?: Experience;
}

export function Toast({
  className,
  tone = 'neutral',
  title,
  description,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
  experience = 'ops',
  role,
  ...props
}: ToastProps) {
  return (
    <div
      {...props}
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={cx(styles.toast, experienceClass[experience], toneClass[tone], className)}
    >
      <div className={styles.toastContent}>
        {title ? <p className={styles.toastTitle}>{title}</p> : null}
        {description ? <p className={styles.toastDescription}>{description}</p> : null}
        {action ? <div className={styles.toastAction}>{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className={styles.toastDismiss} onClick={onDismiss} aria-label={dismissLabel}>
          <span aria-hidden="true">x</span>
        </button>
      ) : null}
    </div>
  );
}

export interface BottomActionBarProps extends HTMLAttributes<HTMLDivElement> {
  summary?: ReactNode;
  actions: ReactNode;
  mobileOnly?: boolean;
  experience?: Experience;
}

export function BottomActionBar({
  className,
  summary,
  actions,
  mobileOnly = true,
  experience = 'mobile',
  ...props
}: BottomActionBarProps) {
  return (
    <div {...props} className={cx(styles.bottomActionBar, experienceClass[experience], mobileOnly && styles.bottomMobileOnly, className)}>
      <div className={styles.bottomActionInner}>
        {summary ? <div className={styles.bottomSummary}>{summary}</div> : null}
        <div className={styles.bottomActions}>{actions}</div>
      </div>
    </div>
  );
}
