import { useTranslations } from 'next-intl';

export default function AboutSection() {
  const t = useTranslations('home.about');

  return (
    <section className="about-section">
      <div className="container">
        <h2 className="section-title">{t('title')}</h2>
        <p className="section-description">{t('description')}</p>
      </div>
    </section>
  );
}
