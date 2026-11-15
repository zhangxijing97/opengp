'use client';

import { PageColumn } from '../../components/home/page-parts';
import { ErrorState } from '../../components/home/states';

// Catches errors that are thrown while rendering a page of the new site. Expected failures (for example
// the backend being down) are handled in the pages themselves and never get here.
export default function NextError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageColumn>
      <ErrorState title="Something went wrong" level={1} code={error.digest}>
        <p>This page could not be shown.</p>
        <button type="button" onClick={reset} className="mt-3 text-brand-indigo underline underline-offset-2">
          Try again
        </button>
      </ErrorState>
    </PageColumn>
  );
}
