import { PageColumn, PageHeader } from '../../../components/home/page-parts';
import { SeriesList } from '../../../components/home/SeriesList';
import { SERIES_THEMES, TOP_SERIES_IDS, themeById } from '../../../lib/home/series-theme';
import type { SeriesTheme } from '../../../lib/home/series-theme';

export const metadata = { title: 'All series' };

export default function AllSeriesPage() {
  const top = TOP_SERIES_IDS.map(themeById).filter((theme): theme is SeriesTheme => theme !== undefined);
  return (
    <PageColumn>
      <PageHeader title="All series">
        Follow the series you care about. Schedules are available for Formula 1 today; the others are on the way.
      </PageHeader>
      <div className="grid gap-4">
        <SeriesList title="Top series" themes={top} />
        <SeriesList title="All series" themes={SERIES_THEMES} />
      </div>
    </PageColumn>
  );
}
