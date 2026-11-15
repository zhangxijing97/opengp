import Link from 'next/link';
import { routes } from '../../lib/home/routes';
import { ButtonAnchor } from './Button';
import { Logo } from './Logo';

// Footer (Figma component Footer, 1440 x 347): an indigo sticker with a white edge, an arc at the
// top left and a chamfer at the top right, flush with the bottom of the page. The sticker runs edge
// to edge of the window; the text stays on the 1440 grid. Link targets: docs/design/UNDRAWN.md.
//
// The sticker is drawn in three slices, because its shape is not the same at every width: a left cap
// with the arc, a right cap with the chamfer (both are the vectors exported from Figma, cut at the
// straight part) and a plain band in between. Like the Figma frame, the footer clips its content.

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'PRODUCT',
    links: [
      { label: 'Schedule', href: routes.home },
      { label: 'All series', href: routes.allSeries },
    ],
  },
  {
    heading: 'DATA',
    links: [
      { label: 'About our data', href: routes.data },
      { label: 'Report a data issue', href: `${routes.contact}?topic=data` },
    ],
  },
  {
    heading: 'COMPANY',
    links: [
      { label: 'About', href: routes.about },
      { label: 'Contact', href: routes.contact },
    ],
  },
];

const LEGAL_LINKS = [
  { label: 'Terms of use', href: routes.legal('terms') },
  { label: 'Privacy policy', href: routes.legal('privacy') },
  { label: 'Cookie settings', href: routes.legal('cookies') },
  { label: 'Accessibility', href: routes.legal('accessibility') },
  { label: 'Legal notice', href: routes.legal('notice') },
];

const linkClass = 'text-footer-body hover:underline';

// Width of a cap in px: the arc and the chamfer are 24px, plus 6px of straight edge.
const CAP = 30;

function FooterSticker() {
  return (
    <div aria-hidden="true" className="og-sticker-shadow absolute inset-x-0 top-[9px] h-[345px]">
      {/* The band: indigo with the white edge on top. It reaches 1px under each cap so no seam shows. */}
      <div className="absolute inset-y-0 top-[2px] right-[29px] left-[29px] border-t-[3px] border-surface-card bg-brand-indigo" />
      <svg className="absolute top-0 left-0" width={CAP} height="345" viewBox="6 0 30 345" fill="none">
        <path d="M6 345V29C6 15.74 16.74 5 30 5H36V345Z" className="fill-brand-indigo" />
        <path d="M4.5 346V29C4.5 14.9116 15.9116 3.5 30 3.5H36" className="stroke-surface-card" strokeWidth="3" />
      </svg>
      <svg className="absolute top-0 right-0" width={CAP} height="345" viewBox="1416 0 30 345" fill="none">
        <path d="M1416 5H1422L1446 29V345H1416Z" className="fill-brand-indigo" />
        <path d="M1416 3.5H1422.62L1447.5 28.3789V346" className="stroke-surface-card" strokeWidth="3" />
      </svg>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="og-nav relative h-[347px] w-full overflow-hidden bg-surface-page text-text-on-brand">
      <FooterSticker />

      <div className="relative mx-auto h-full w-(--layout-page-width)">
        <div className="absolute top-[42px] left-(--space-page) flex w-[1272px] gap-6 pt-9">
          <div className="w-72 shrink-0">
            <Link href={routes.home} aria-label="OpenGP home" className="inline-block">
              <Logo />
            </Link>
            <p className="text-footer-body mt-3 w-66">
              Every racing series in one schedule — results, standings and the weekend ahead, in your time.
            </p>
          </div>
          <div className="flex-1" />
          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading.toLowerCase()} className="flex w-40 shrink-0 flex-col gap-2.5">
              <h2 className="text-footer-heading">{column.heading}</h2>
              {column.links.map((link) => (
                <Link key={link.label} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="absolute top-[214px] left-(--space-page) flex w-[1272px] flex-col gap-3 border-t border-border-default pt-5 pb-7">
          <p className="text-footer-fine w-[900px]">
            OpenGP is an independent service. It is not affiliated with, endorsed or sponsored by Formula 1, the
            FIA, MotoGP, WEC, NASCAR, IndyCar, Formula E, WRC, IMSA, SRO Motorsports Group or any team. Series
            names, logos and marks belong to their respective owners.
          </p>
          <ul className="flex items-center gap-4">
            <li className="text-footer-legal">© 2026 OpenGP</li>
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-footer-legal hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="absolute top-[58px] right-[-3px]">
            <ButtonAnchor href="#top" icon="arrow-up">
              BACK TO GRID
            </ButtonAnchor>
          </div>
        </div>
      </div>
    </footer>
  );
}
