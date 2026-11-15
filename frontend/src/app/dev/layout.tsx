import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { designFontVariables } from '../../styles/fonts';

// Dev pages are checked on every request, never prerendered at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'OpenGP dev pages',
  robots: { index: false, follow: false },
};

// Open in development. In a production build they return 404 unless ENABLE_DEV_PAGES=1
// is set (for example on a Netlify deploy preview that should show /dev/tokens).
function devPagesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_DEV_PAGES === '1'
  );
}

export default function DevLayout({ children }: { children: ReactNode }) {
  if (!devPagesEnabled()) notFound();

  // "og-root" maps the --font-* tokens to the next/font variables, which are
  // defined by designFontVariables on this same element (see src/styles/tokens.css).
  return <div className={`og-root ${designFontVariables}`}>{children}</div>;
}
