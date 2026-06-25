import { Container } from '@/components/common/layout';
import styles from './ContentHero.module.scss';

interface ContentHeroProps {
  eyebrow?: string;
  title: string;
  lead?: string;
}

/**
 * Branded hero band for content/landing pages — a cream wash with a soft gold
 * glow, a pill eyebrow, the page H1, and a lead. Server component.
 */
export default function ContentHero({ eyebrow, title, lead }: ContentHeroProps) {
  return (
    <section className={styles.hero}>
      <Container>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
      </Container>
    </section>
  );
}
