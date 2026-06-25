import type { FaqItem } from '@/lib/seo/faqs';
import { Container } from '@/components/common/layout';
import styles from './FaqSection.module.scss';

interface FaqSectionProps {
  heading: string;
  faqs: FaqItem[];
  /** Unique id base when several FaqSections share a page (e.g. the /faq hub). */
  id?: string;
}

/**
 * Server-rendered, visible FAQ block for public landing pages.
 *
 * Plain semantic markup (no client JS): the question/answer text is fully in
 * the DOM so search + AI answer engines can extract it. Pair this with a
 * `faqPageSchema` JSON-LD block on the same page so the visible copy and the
 * structured data come from the same source (`@/lib/seo/faqs`) and cannot drift.
 */
export default function FaqSection({ heading, faqs, id = 'faq-section' }: FaqSectionProps) {
  if (!faqs?.length) return null;

  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <Container>
        <h2 id={`${id}-heading`} className={styles.heading}>
          {heading}
        </h2>
        <div className={styles.list}>
          {faqs.map((faq, index) => (
            <div key={`${index}-${faq.question}`} className={styles.item}>
              <h3 className={styles.question}>{faq.question}</h3>
              <p className={styles.answer}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
