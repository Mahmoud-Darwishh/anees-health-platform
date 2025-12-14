import { useTranslations } from 'next-intl';

export default function FeaturesSection() {
  const t = useTranslations('home.features');

  const features = [
    {
      id: 1,
      title: t('feature1.title'),
      description: t('feature1.description'),
      icon: '🎥',
    },
    {
      id: 2,
      title: t('feature2.title'),
      description: t('feature2.description'),
      icon: '📅',
    },
    {
      id: 3,
      title: t('feature3.title'),
      description: t('feature3.description'),
      icon: '💬',
    },
  ];

  return (
    <section className="features-section">
      <div className="container">
        <h2 className="section-title">{t('title')}</h2>
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.id} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
