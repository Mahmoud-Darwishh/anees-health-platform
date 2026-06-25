import styles from './ArticleSections.module.scss';

export interface ArticleSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

interface ArticleSectionsProps {
  sections: ArticleSection[];
}

/**
 * Renders a list of editorial/health-content sections (H2 + paragraphs +
 * optional bullets) with brand prose styling. Server component, no client JS.
 */
export default function ArticleSections({ sections }: ArticleSectionsProps) {
  return (
    <div className={styles.prose}>
      {sections.map((section, i) => (
        <section key={i}>
          <h2>{section.heading}</h2>
          {section.body.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {section.bullets && section.bullets.length > 0 ? (
            <ul>
              {section.bullets.map((b, k) => (
                <li key={k}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
