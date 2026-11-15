import type { SeriesTheme } from '../../lib/home/series-theme';

// The series plate of a session row (Figma component Plate): an ink frame, a band in the series
// colour and the code on white. Only 8 series have a code in the design; any other series falls
// back to its name. TODO(design)
export function SeriesPlate({ theme }: { theme: Pick<SeriesTheme, 'name' | 'color' | 'plateCode'> }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-plate bg-brand-ink p-(--space-off-1_5)">
      <span className="flex h-4.25 overflow-hidden rounded-micro">
        <span aria-hidden="true" className="w-1.25 shrink-0" style={{ backgroundColor: theme.color }} />
        <span className="text-plate-code flex items-center bg-surface-card px-1.5 whitespace-nowrap text-brand-ink">
          {theme.plateCode ?? theme.name}
        </span>
      </span>
    </span>
  );
}
