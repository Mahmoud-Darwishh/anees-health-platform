import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  active?: boolean;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  title?: string;
};

const Breadcrumb = ({ items, title }: BreadcrumbProps) => {
  return (
    <div className="breadcrumb-bar overflow-visible">
      <div className="container">
        <div className="row align-items-center inner-banner">
          <div className="col-12 text-center">
            <nav aria-label="breadcrumb" className="page-breadcrumb">
              <ol className="breadcrumb mb-2 justify-content-center">
                {items.map((item, index) => (
                  <li
                    key={`${item.label}-${index}`}
                    className={`breadcrumb-item${item.active ? ' active' : ''}`}
                    aria-current={item.active ? 'page' : undefined}
                  >
                    {item.href && !item.active ? (
                      <Link href={item.href} aria-label={item.label}>
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </li>
                ))}
              </ol>
              {title ? <h2 className="breadcrumb-title">{title}</h2> : null}
            </nav>
          </div>
        </div>
      </div>

      <div className="breadcrumb-bg">
        <img
          src="/assets/img/bg/breadcrumb-icon.png"
          alt="img"
          className="breadcrumb-bg-03"
        />
        <img
          src="/assets/img/bg/breadcrumb-icon.png"
          alt="img"
          className="breadcrumb-bg-04"
        />
      </div>
    </div>
  );
};

export default Breadcrumb;
