'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp';
import styles from './contact-us.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

type ServiceKey =
  | 'doctor'
  | 'nursing'
  | 'physio'
  | 'tele'
  | 'lab'
  | 'elderly'
  | 'other';

const SERVICE_KEYS: ServiceKey[] = [
  'doctor',
  'nursing',
  'physio',
  'tele',
  'lab',
  'elderly',
  'other',
];

interface FieldErrors {
  name?: string;
  message?: string;
}

/**
 * Contact form — submits via WhatsApp deep link.
 *
 * No backend write. On submit we:
 *  1. Validate required fields client-side (name + message).
 *  2. Build a formatted WhatsApp message in the user's locale.
 *  3. Open `wa.me/<phone>?text=<encoded>` in a new tab.
 *
 * The user's WhatsApp identity (their phone number) is what we use to reply,
 * so we don't ask for email/phone in the form itself.
 */
export default function ContactForm() {
  const t = useTranslations('contactPage');

  const [name, setName] = useState('');
  const [service, setService] = useState<ServiceKey | ''>('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function serviceLabel(key: ServiceKey): string {
    return t(`form_service_${key}`);
  }

  function buildMessageBody(): string {
    const greeting = t('wa_greeting');
    const nameLabel = t('wa_field_name');
    const serviceField = t('wa_field_service');
    const messageLabel = t('wa_field_message');
    const fallbackService = t('wa_fallback_service');

    const resolvedService = service ? serviceLabel(service) : fallbackService;

    return [
      greeting,
      '',
      `${nameLabel}: ${name.trim()}`,
      `${serviceField}: ${resolvedService}`,
      '',
      `${messageLabel}:`,
      message.trim(),
    ].join('\n');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = t('form_validation_required');
    if (!message.trim()) nextErrors.message = t('form_validation_required');

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const url = buildWhatsAppUrl(buildMessageBody());
    window.open(url, '_blank', 'noopener,noreferrer');
    // Reset the submitting flag shortly after — the user has left the tab,
    // but if they come back we want the button enabled again.
    setTimeout(() => setSubmitting(false), 1500);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label={t('form_aria')} noValidate>
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="contact-name">
          {t('form_name_label')} <span aria-hidden="true">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          className={styles.formInput}
          placeholder={t('form_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          dir="auto"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
        />
        {errors.name && (
          <p id="contact-name-error" className={styles.formError} role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="contact-service">
          {t('form_service_label')}
        </label>
        <select
          id="contact-service"
          name="service"
          className={styles.formSelect}
          value={service}
          onChange={(e) => setService(e.target.value as ServiceKey | '')}
        >
          <option value="">{t('form_service_placeholder')}</option>
          {SERVICE_KEYS.map((key) => (
            <option key={key} value={key}>
              {serviceLabel(key)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="contact-message">
          {t('form_message_label')} <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          className={styles.formTextarea}
          rows={5}
          placeholder={t('form_message_placeholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          dir="auto"
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
        />
        {errors.message && (
          <p id="contact-message-error" className={styles.formError} role="alert">
            {errors.message}
          </p>
        )}
      </div>

      <p className={styles.formHint}>{t('form_required_hint')}</p>

      <button
        type="submit"
        className={styles.formSubmit}
        disabled={submitting}
        aria-label={t('form_submit_aria')}
      >
        <LucideIcon iconClass="fa-brands fa-whatsapp" aria-hidden="true" />
        <span>{t('form_submit')}</span>
      </button>

      <p className={styles.formPrivacy}>{t('form_privacy_note')}</p>
    </form>
  );
}
