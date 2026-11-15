import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowUpIcon } from './icons';

// Primary button (Figma component Button): amber, ink label, 36px high, radius 12.
// `icon` is the Figma variant property: none, or an arrow that points up.
type ButtonKind = { icon?: 'none' | 'arrow-up' };

function classes(icon: ButtonKind['icon']): string {
  const base =
    'text-cta inline-flex h-9 items-center justify-center gap-2 rounded-control bg-brand-amber whitespace-nowrap text-brand-ink hover:brightness-95';
  return icon === 'arrow-up' ? `${base} px-4.5` : `${base} min-w-18 px-(--space-10) pb-(--space-off-3)`;
}

export function ButtonLink({
  href,
  icon = 'none',
  children,
}: ButtonKind & { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={classes(icon)}>
      {icon === 'arrow-up' ? <ArrowUpIcon /> : null}
      {children}
    </Link>
  );
}

// A link to a place on the same page (Back to grid). A plain anchor, so it also works before hydration.
export function ButtonAnchor({
  href,
  icon = 'none',
  children,
}: ButtonKind & { href: string; children: ReactNode }) {
  return (
    <a href={href} className={classes(icon)}>
      {icon === 'arrow-up' ? <ArrowUpIcon /> : null}
      {children}
    </a>
  );
}

export function Button({
  icon = 'none',
  children,
  ...rest
}: ButtonKind &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    children: ReactNode;
  }) {
  return (
    <button type="button" {...rest} className={classes(icon)}>
      {icon === 'arrow-up' ? <ArrowUpIcon /> : null}
      {children}
    </button>
  );
}
