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
      {/* Inline SVG so the global Footer doesn't depend on Font Awesome being loaded. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="28"
        height="28"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39-.056 0-.105-.025-.16-.061-.704-.444-1.515-.793-2.193-1.297-1.43-1.061-2.402-2.5-3.13-4.135-.094-.207-.05-.378.117-.567.207-.236.494-.508.65-.79.156-.281.156-.553-.025-.85-.156-.265-.78-1.892-1.066-2.589-.234-.564-.475-.624-.78-.624-.117 0-.234-.012-.351-.012-.234 0-.585.09-.892.43-.305.34-1.16 1.12-1.16 2.747 0 1.624 1.184 3.196 1.346 3.416.156.225 2.32 3.671 5.692 5.143 3.371 1.472 3.371.987 3.98.937.606-.05 2.052-.834 2.345-1.642.293-.81.293-1.498.205-1.642-.085-.144-.305-.234-.585-.366zM16.045 4C9.43 4 4.045 9.385 4.045 16c0 2.346.665 4.529 1.812 6.385L4 28l5.785-1.825A11.94 11.94 0 0 0 16.045 28c6.615 0 12-5.385 12-12s-5.385-12-12-12zm0 21.6c-1.978 0-3.85-.583-5.43-1.682l-.39-.234-3.985 1.255 1.295-3.876-.255-.402a9.93 9.93 0 0 1-1.535-5.262c0-5.512 4.488-10 10-10s10 4.488 10 10c0 5.513-4.488 10.2-9.7 10.2z" />
      </svg>
    </a>
  );
};

export default WhatsAppButton;
