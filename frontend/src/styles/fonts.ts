import { Barlow, Barlow_Condensed } from 'next/font/google';

// Fonts of the OpenGP Home redesign that the root layout does not load.
// Inter (--font-body) and Rajdhani (--font-display) already come from src/app/layout.tsx.
//
// These loaders are imported only by the layouts of the new routes (/dev and the (site) group),
// so the old pages download nothing extra. The weights are the ones tokens.css uses:
// Barlow Condensed 600 / 700 / 800 and Barlow 500.

export const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const barlow = Barlow({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-barlow',
  display: 'swap',
});

// Classes that define the two CSS variables above. Put them on the same element as
// the "og-root" class (see src/styles/tokens.css, point 5 of the header).
export const designFontVariables = `${barlowCondensed.variable} ${barlow.variable}`;
