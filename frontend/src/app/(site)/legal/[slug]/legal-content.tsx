import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClearStoredData } from '../../../../components/home/ClearStoredData';
import { linkClass } from '../../../../components/home/page-parts';
import { routes } from '../../../../lib/home/routes';
import { FOLLOWING_KEY, SETTINGS_KEY } from '../../../../lib/client-state/keys';

// Plain-language drafts for the pages the footer links to. They are facts about this app, not
// legal advice, and a lawyer has not reviewed them: every page says so. TODO(legal)

export interface LegalPage {
  title: string;
  /** False for the accessibility statement, which is not legal text. */
  draft: boolean;
  body: ReactNode;
}

export const LEGAL_SLUGS = ['terms', 'privacy', 'cookies', 'accessibility', 'notice'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_PAGES: Record<LegalSlug, LegalPage> = {
  terms: {
    title: 'Terms of use',
    draft: true,
    body: (
      <>
        <section>
          <h2 className="text-section-title mb-1">Using OpenGP</h2>
          <p>
            OpenGP is a free, non-commercial service in early development. It may change, be interrupted or
            be withdrawn at any time.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">No guarantee</h2>
          <p>
            Schedules and statuses come from third-party data and can be wrong, late or missing. Do not rely on
            OpenGP where a mistake costs money or safety, such as betting or travel. Check the official source of
            the series first.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">Data and marks</h2>
          <p>
            Data, series names, logos and marks belong to their owners and sources. See the{' '}
            <Link href={routes.legal('notice')} className={linkClass}>legal notice</Link> and{' '}
            <Link href={routes.data} className={linkClass}>About our data</Link>.
          </p>
        </section>
      </>
    ),
  },
  privacy: {
    title: 'Privacy policy',
    draft: true,
    body: (
      <>
        <section>
          <h2 className="text-section-title mb-1">What stays in your browser</h2>
          <p>
            OpenGP saves your settings (time zone, spoiler setting) and the series you follow in your browser’s
            local storage. They are not sent to OpenGP. You can remove them under{' '}
            <Link href={routes.legal('cookies')} className={linkClass}>cookie settings</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">What the servers see</h2>
          <p>
            Opening a page sends a normal request. The hosting providers of the site and of the data service keep
            server logs, which include your IP address and the time of the request.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">Accounts and tracking</h2>
          <p>
            OpenGP has no accounts. The app contains no analytics or advertising scripts. Owner to confirm before
            launch.
          </p>
        </section>
      </>
    ),
  },
  cookies: {
    title: 'Cookie settings',
    draft: true,
    body: (
      <>
        <section>
          <h2 className="text-section-title mb-1">Cookies</h2>
          <p>The OpenGP app does not set cookies.</p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">What is stored instead</h2>
          <p>Two items in your browser’s local storage, both on your device only:</p>
          <ul className="mt-2 grid gap-1">
            <li>
              <code className="text-caption font-mono">{SETTINGS_KEY}</code>: your time zone and spoiler setting.
            </li>
            <li>
              <code className="text-caption font-mono">{FOLLOWING_KEY}</code>: the series you follow.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-section-title mb-2">Remove them</h2>
          <ClearStoredData />
        </section>
      </>
    ),
  },
  accessibility: {
    title: 'Accessibility',
    draft: false,
    body: (
      <>
        <section>
          <h2 className="text-section-title mb-1">Goal</h2>
          <p>OpenGP aims to meet WCAG 2.2 level AA. It does not yet, and this page lists what is known.</p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">Known gaps (last reviewed 14 November 2026)</h2>
          <ul className="grid list-disc gap-1 pl-5">
            <li>Some text colours are below the 4.5:1 contrast ratio on some backgrounds. The design review is open.</li>
            <li>Some text is smaller than 11 pixels.</li>
            <li>The layout is made for desktop screens 1440 pixels wide. There is no phone or tablet layout yet.</li>
            <li>Keyboard focus is shown with a basic outline that has not been designed.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-section-title mb-1">What works</h2>
          <p>
            Search, settings and series pages can be used with the keyboard. The search field follows the
            combobox pattern and the “/” key focuses it. Motion is reduced if your system asks for that.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">Tell us</h2>
          <p>
            If something blocks you, please{' '}
            <Link href={routes.contact} className={linkClass}>contact us</Link>.
          </p>
        </section>
      </>
    ),
  },
  notice: {
    title: 'Legal notice',
    draft: true,
    body: (
      <>
        <section>
          <h2 className="text-section-title mb-1">Independence</h2>
          <p>
            OpenGP is an independent service. It is not affiliated with, endorsed or sponsored by Formula 1, the
            FIA, MotoGP, WEC, NASCAR, IndyCar, Formula E, WRC, IMSA, SRO Motorsports Group or any team. Series
            names, logos and marks belong to their respective owners.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">Data credits</h2>
          <p>
            Formula 1 schedules: Jolpica-F1, CC BY-NC-SA 4.0. Session details: OpenF1. See{' '}
            <Link href={routes.data} className={linkClass}>About our data</Link>.
          </p>
        </section>
        <section>
          <h2 className="text-section-title mb-1">Operator</h2>
          <p>The operator’s name and address are not filled in yet. Owner to complete before launch.</p>
        </section>
      </>
    ),
  },
};

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}
