import Link from 'next/link';
import type { ReactNode } from 'react';

// Building blocks of the undrawn pages. They only use design tokens and the existing text
// styles. Content pages use the centre column width of the grid (648).

export function PageColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-(--layout-col-main) pt-10 pb-16">{children}</div>;
}

export function PageHeader({
  title,
  children,
  back,
}: {
  title: string;
  children?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6">
      {back ? (
        <Link href={back.href} className="text-caption text-text-secondary hover:underline">
          Back to {back.label}
        </Link>
      ) : null}
      <h1 className="text-range-title mt-1">{title}</h1>
      {children ? <div className="text-footer-body mt-1 text-text-secondary">{children}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-surface border border-border-default bg-surface-card p-6">
      {title ? <h2 className="text-section-title mb-3">{title}</h2> : null}
      {children}
    </section>
  );
}

/** Running text: 13px, relaxed line height, paragraphs separated by space. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="text-footer-body grid gap-3">{children}</div>;
}

/** A label and its value, for facts such as time and status. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-caption text-text-secondary">{item.label}</dt>
          <dd className="text-footer-body">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Quiet inline link style for body text. */
export const linkClass = 'text-brand-indigo underline underline-offset-2';
