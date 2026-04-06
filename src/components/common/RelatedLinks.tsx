import Link from 'next/link';

export interface RelatedLinkItem {
  href: string;
  label: string;
}

interface RelatedLinksProps {
  locale: 'en' | 'ar';
  title?: string;
  links: RelatedLinkItem[];
}

export default function RelatedLinks({ locale, title, links }: RelatedLinksProps) {
  const heading =
    title || (locale === 'ar' ? 'روابط ذات صلة' : 'Related links');

  return (
    <section className="py-4">
      <div className="container">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h2 className="h5 mb-3">{heading}</h2>
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-decoration-underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
