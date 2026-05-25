import type { ReactNode } from 'react';

type PortalSectionCardProps = {
  id?: string;
  title: string;
  subtitle?: string;
  className?: string;
  headerAside?: ReactNode;
  children: ReactNode;
};

export function PortalSectionCard({
  id,
  title,
  subtitle,
  className,
  headerAside,
  children,
}: PortalSectionCardProps) {
  const mergedClassName = className ? className : undefined;

  return (
    <article id={id} className={mergedClassName}>
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {headerAside ? <div>{headerAside}</div> : null}
      </header>
      {children}
    </article>
  );
}
