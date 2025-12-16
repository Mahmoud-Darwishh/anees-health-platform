import React, { HTMLAttributes, ReactElement, forwardRef } from 'react';

// Simple wrapper that tags its child with data-reveal and merges classNames.
// Usage: <Reveal as="section" className="foo">...</Reveal>
// or <Reveal><div className="bar">...</div></Reveal>

type Props = {
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: ReactElement;
} & HTMLAttributes<HTMLElement>;

export const Reveal = forwardRef<HTMLElement, Props>(function Reveal(
  { as: Component = 'div', className = '', children, ...rest },
  ref
) {
  // If the child already has className, merge it.
  const childClass = typeof children.props.className === 'string' ? children.props.className : '';
  const mergedClass = [className, childClass].filter(Boolean).join(' ').trim();

  // If user passes their own element via children, clone it to add data-reveal & merged class.
  if (React.isValidElement(children) && Component === 'div' && Object.keys(rest).length === 0) {
    return React.cloneElement(children, {
      'data-reveal': true,
      ref: (children as any).ref || ref,
      className: mergedClass || undefined,
    });
  }

  // Otherwise render chosen wrapper tag.
  return (
    <Component ref={ref as any} data-reveal className={mergedClass || undefined} {...rest}>
      {children}
    </Component>
  );
});
