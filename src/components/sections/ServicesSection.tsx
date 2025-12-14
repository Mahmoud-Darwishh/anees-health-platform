import { useTranslations } from 'next-intl';

export default function ServicesSection() {
  const t = useTranslations('home.services');

  return (
    <section className="services-section">
      <div className="container">
        <h2 className="section-title">{t('title')}</h2>
        <p className="section-description">{t('description')}</p>
        <div className="services-grid">
          {/* Services will be added here in future development */}
        </div>
      </div>
    </section>
  );
}
