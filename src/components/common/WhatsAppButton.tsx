'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

const WhatsAppButton: React.FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const phoneNumber = '201055164595'; // WhatsApp number without + or spaces
  const messageKey = locale === 'ar' ? 'whatsapp.message_ar' : 'whatsapp.message_en';
  const message = encodeURIComponent(t(messageKey, { defaultValue: 'Hello Anees Health!\n\nI am interested and have some enquiries about your healthcare services. Could you please help me with more information?' }));
  const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-btn"
      aria-label={t('whatsapp.label', { defaultValue: 'Chat with us on WhatsApp' })}
      title={t('whatsapp.label', { defaultValue: 'Chat with us on WhatsApp' })}
    >
      <i className="fa-brands fa-whatsapp" />
    </a>
  );
};

export default WhatsAppButton;
