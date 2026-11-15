import { LogoSymbol } from './icons';

// Symbol plus wordmark (Figma: logo, 141 x 32). "Open" is white and "GP" light indigo: the logo
// only appears on the indigo nav and footer.
export function Logo() {
  return (
    <span className="inline-flex items-center gap-(--space-off-9)">
      <LogoSymbol />
      <span className="text-wordmark">
        <span className="text-text-on-brand">Open</span>
        <span className="text-brand-indigo-light">GP</span>
      </span>
    </span>
  );
}
