import type { FaqItem } from '@/lib/seo/faqs';

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
    <section className="py-5" aria-labelledby={`${id}-heading`}>
      <div className="container">
        <h2 id={`${id}-heading`} className="h3 mb-4">
          {heading}
        </h2>
        <div className="row">
          {faqs.map((faq, index) => (
            <div key={`${index}-${faq.question}`} className="col-12 col-lg-10 mb-4">
              <h3 className="h6 mb-2">{faq.question}</h3>
              <p className="text-muted mb-0">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
