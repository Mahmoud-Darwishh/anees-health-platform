import { useTranslations } from 'next-intl';

export default function HeroSection() {
  const t = useTranslations('home.hero');

  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">{t('title')}</h1>
          <p className="hero-subtitle">{t('subtitle')}</p>
          <button className="cta-button">{t('cta')}</button>
        </div>
      </div>
    </section>
  );
}
