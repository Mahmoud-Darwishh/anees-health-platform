import { useTranslations } from 'next-intl';

export default function ContactSection() {
  const t = useTranslations('home.contact');

  return (
    <section className="contact-section">
      <div className="container">
        <h2 className="section-title">{t('title')}</h2>
        <p className="section-description">{t('description')}</p>
        <div className="contact-form">
          {/* Contact form will be added here in future development */}
        </div>
      </div>
    </section>
  );
}
