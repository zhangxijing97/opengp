import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '../../components/home/Footer';
import { TopNav } from '../../components/home/TopNav';
import { designFontVariables } from '../../styles/fonts';

// The new site. "(site)" is a route group: the folder name is not part of the URL, so these pages are at
// /, /search, /settings and so on, and only they get this nav and footer. The old pages that remain
// (/news) render their own nav. See src/styles/tokens.css for og-root and og-canvas.
// Not indexed until launch. TODO(owner): remove `robots` below when the Home is built.
export const metadata: Metadata = {
  title: { default: 'OpenGP', template: '%s | OpenGP' },
  robots: { index: false, follow: false },
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div id="top" className={`og-root og-canvas ${designFontVariables}`}>
      <TopNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
