import type { ReactNode } from 'react';

// Plain empty, error and loading states. The designs for these are shelved (HANDOFF.md section 5),
// so they are deliberately quiet: TODO(design). The rule that matters is in the names: an empty
// result and a failed request are different states and never look the same.

// `level` is the heading level of the title: 1 when the state is the whole page (404, error),
// 2 when it sits under a page title.
export function EmptyState({
  title,
  level = 2,
  children,
}: {
  title: string;
  level?: 1 | 2;
  children?: ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="rounded-surface border border-border-default bg-surface-card p-6 text-center">
      <Heading className="text-section-title">{title}</Heading>
      {children ? <div className="text-footer-body mt-2 text-text-secondary">{children}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Racing data is temporarily unavailable',
  level = 2,
  code,
  children,
}: {
  title?: string;
  level?: 1 | 2;
  /** Error code from the backend (UPSTREAM_UNAVAILABLE, NETWORK, ...). */
  code?: string;
  children?: ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div role="alert" className="rounded-surface border border-border-default bg-surface-card p-6">
      <Heading className="text-section-title text-flag-red">{title}</Heading>
      <div className="text-footer-body mt-2 text-text-secondary">
        {children ?? 'Try again in a moment. This is not the same as there being nothing to show.'}
      </div>
      {code ? <p className="text-caption mt-3 font-mono text-text-tertiary">{code}</p> : null}
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="rounded-surface border border-border-default bg-surface-card p-6">
      <ul className="grid gap-4">
        {Array.from({ length: count }, (_, position) => (
          <li key={position} className="h-5 animate-pulse rounded-micro bg-surface-track" />
        ))}
      </ul>
    </div>
  );
}
