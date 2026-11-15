// Icons of the Home blocks, exported from the Figma file (page 05, section 8). Colours come from tokens
// through classes, so the icons follow the design system.

type IconProps = { className?: string };

export function RowChevronIcon({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M5.6001 11.25L9.3501 7.5L5.6001 3.75" className="stroke-icon-muted" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The collapse arrow of a section header (18px) and of a series list header (13px). It points up while
// the block is open and down when it is collapsed.
export function CollapseIcon({ size, open, className }: IconProps & { size: 18 | 13; open: boolean }) {
  const d = size === 18 ? 'M13.5 11.25L9 6.75L4.5 11.25' : 'M3.25 8.125L6.5 4.875L9.75 8.125';
  return (
    <svg
      className={`${className ?? ''} ${open ? '' : 'rotate-180'}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={d} className="stroke-text-tertiary" strokeWidth={size === 18 ? 1.5 : 1.08333} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SectionFollowingIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.68323 1.52997C7.71245 1.47094 7.75758 1.42126 7.81353 1.38652C7.86949 1.35178 7.93404 1.33337 7.9999 1.33337C8.06576 1.33337 8.13031 1.35178 8.18626 1.38652C8.24222 1.42126 8.28735 1.47094 8.31656 1.52997L9.85656 4.6493C9.95802 4.85461 10.1078 5.03224 10.293 5.16694C10.4782 5.30164 10.6933 5.38938 10.9199 5.42264L14.3639 5.92664C14.4292 5.93609 14.4905 5.96362 14.5409 6.0061C14.5913 6.04859 14.6289 6.10434 14.6492 6.16704C14.6696 6.22975 14.6721 6.29691 14.6563 6.36093C14.6405 6.42495 14.6071 6.48327 14.5599 6.5293L12.0692 8.95464C11.905 9.1147 11.7821 9.31229 11.7111 9.53039C11.6402 9.74849 11.6233 9.98056 11.6619 10.2066L12.2499 13.6333C12.2614 13.6985 12.2544 13.7657 12.2296 13.8271C12.2048 13.8885 12.1632 13.9417 12.1096 13.9806C12.056 14.0196 11.9926 14.0426 11.9265 14.0472C11.8604 14.0518 11.7944 14.0378 11.7359 14.0066L8.65723 12.388C8.45438 12.2815 8.22868 12.2258 7.99956 12.2258C7.77044 12.2258 7.54475 12.2815 7.3419 12.388L4.2639 14.0066C4.20545 14.0376 4.1395 14.0515 4.07353 14.0468C4.00757 14.0421 3.94424 14.019 3.89076 13.9801C3.83728 13.9412 3.79579 13.8881 3.771 13.8268C3.74622 13.7655 3.73914 13.6984 3.75056 13.6333L4.3379 10.2073C4.3767 9.98112 4.35989 9.7489 4.28892 9.53067C4.21796 9.31243 4.09497 9.11474 3.93056 8.95464L1.4399 6.52997C1.39229 6.48399 1.35856 6.42557 1.34254 6.36135C1.32652 6.29714 1.32886 6.22971 1.34928 6.16676C1.36971 6.10381 1.40741 6.04786 1.45808 6.00529C1.50876 5.96272 1.57037 5.93524 1.6359 5.92597L5.07923 5.42264C5.30607 5.38964 5.52149 5.30201 5.70695 5.16729C5.89242 5.03258 6.04237 4.85482 6.1439 4.6493L7.68323 1.52997Z"
        className="fill-icon-primary stroke-icon-primary"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SectionAllSeriesIcon({ className }: IconProps) {
  const square = 'stroke-icon-primary';
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.00008 2.66675H3.66675C3.11446 2.66675 2.66675 3.11446 2.66675 3.66675V6.00008C2.66675 6.55237 3.11446 7.00008 3.66675 7.00008H6.00008C6.55237 7.00008 7.00008 6.55237 7.00008 6.00008V3.66675C7.00008 3.11446 6.55237 2.66675 6.00008 2.66675Z" className={square} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.3333 2.66675H10C9.44772 2.66675 9 3.11446 9 3.66675V6.00008C9 6.55237 9.44772 7.00008 10 7.00008H12.3333C12.8856 7.00008 13.3333 6.55237 13.3333 6.00008V3.66675C13.3333 3.11446 12.8856 2.66675 12.3333 2.66675Z" className={square} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.00008 9H3.66675C3.11446 9 2.66675 9.44772 2.66675 10V12.3333C2.66675 12.8856 3.11446 13.3333 3.66675 13.3333H6.00008C6.55237 13.3333 7.00008 12.8856 7.00008 12.3333V10C7.00008 9.44772 6.55237 9 6.00008 9Z" className={square} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.3333 9H10C9.44772 9 9 9.44772 9 10V12.3333C9 12.8856 9.44772 13.3333 10 13.3333H12.3333C12.8856 13.3333 13.3333 12.8856 13.3333 12.3333V10C13.3333 9.44772 12.8856 9 12.3333 9Z" className={square} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The star of a series list item: indigo with an ink edge when the series is followed, an outline when not.
export function SeriesStar({ filled, className }: IconProps & { filled: boolean }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7.00008 2.04163L8.51675 5.19163L11.9584 5.65829L9.45008 8.04996L10.0334 11.4333L7.00008 9.79996L3.96675 11.4333L4.55008 8.04996L2.04175 5.65829L5.48341 5.19163L7.00008 2.04163Z"
        className={filled ? 'fill-brand-indigo stroke-brand-ink' : 'fill-none stroke-icon-muted'}
        strokeWidth="1.16667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The round badge of a series in the lists: a disc in the series colour with an ink edge and a cream ring.
export function SeriesBadge({ color, className }: IconProps & { color: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <circle cx="8.06" cy="8.06" r="7.43" strokeWidth="1.26" className="stroke-brand-ink" style={{ fill: color }} />
      <circle cx="8.06" cy="8.06" r="4.57" strokeWidth="1.03" className="stroke-brand-amber-light" />
    </svg>
  );
}
