import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Round or rounded-square icon button (Figma component IconButton). `surface` is the Figma
// variant property: nav (on the glass), page (white circle), card (grey circle).
export type IconButtonSurface = 'nav' | 'page' | 'card';

const SURFACE: Record<IconButtonSurface, string> = {
  nav: 'size-9 rounded-control border border-text-on-brand/40 bg-text-on-brand/14 text-text-on-brand',
  page: 'size-8.5 rounded-(--radius-full) border border-border-default bg-surface-card text-icon-primary',
  card: 'size-6.5 rounded-(--radius-full) bg-surface-inset text-icon-primary',
};

function classes(surface: IconButtonSurface): string {
  return `inline-flex items-center justify-center hover:brightness-95 ${SURFACE[surface]}`;
}

export function IconButtonLink({
  href,
  label,
  surface,
  children,
}: {
  href: string;
  /** Accessible name; there is no visible text. */
  label: string;
  surface: IconButtonSurface;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} className={classes(surface)}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  surface,
  children,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'aria-label'> & {
  label: string;
  surface: IconButtonSurface;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} {...rest} className={classes(surface)}>
      {children}
    </button>
  );
}
