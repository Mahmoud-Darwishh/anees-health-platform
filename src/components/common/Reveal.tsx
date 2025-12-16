import React, { forwardRef } from 'react';
import type { ElementType, HTMLAttributes, ReactElement } from 'react';

// Simple wrapper that tags its child with data-reveal and merges classNames.
// Usage: <Reveal as="section" className="foo">...</Reveal>
// or <Reveal><div className="bar">...</div></Reveal>

type Props<T extends HTMLElement = HTMLElement> = {
  as?: ElementType;
  className?: string;
  children: ReactElement<{ className?: string }>;
} & HTMLAttributes<T>;

export const Reveal = forwardRef<HTMLElement, Props>(function Reveal(
  { as: Component = 'div', className = '', children, ...rest },
  ref
) {
  const childClass = typeof children.props.className === 'string' ? children.props.className : '';
  const mergedClass = [className, childClass].filter(Boolean).join(' ').trim();

  const Comp = Component as ElementType;
  return (
    <Comp ref={ref} {...rest} {...({ 'data-reveal': true } as Record<string, unknown>)} className={mergedClass || undefined}>
      {children}
    </Comp>
  );
});
