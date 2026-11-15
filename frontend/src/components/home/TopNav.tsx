import Link from 'next/link';
import { routes } from '../../lib/home/routes';
import { ButtonLink } from './Button';
import { IconButtonLink } from './IconButton';
import { SettingsIcon } from './icons';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';

// Top nav (Figma component TopNav, 1440 x 64): indigo glass at 80% with a 20px blur and a 3px
// amber line at the bottom. The glass and the line run edge to edge; the content stays on the 1440 grid. Search on the left, logo in the middle, settings and sign in on the
// right, on the 288 / 648 / 288 grid. Sticky: content scrolls under the glass (decision Q8).
export function TopNav() {
  return (
    <header className="og-nav sticky top-0 z-50 h-16 bg-nav-glass backdrop-blur-glass">
      <div className="mx-auto grid h-full w-(--layout-page-width) grid-cols-[var(--layout-col-side)_1fr_var(--layout-col-side)] items-center gap-6 px-(--space-page)">
        <SearchBox searchPath={routes.search} indexPath={routes.searchIndex} />
        <div className="flex justify-center">
          <Link href={routes.home} aria-label="OpenGP home">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center justify-end gap-2">
          <IconButtonLink href={routes.settings} label="Settings" surface="nav">
            <SettingsIcon />
          </IconButtonLink>
          <ButtonLink href={routes.signIn}>SIGN IN</ButtonLink>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-(--space-off-3) bg-brand-amber" />
    </header>
  );
}
