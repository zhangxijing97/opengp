import { getRounds } from '../api-v1/client';
import type { ApiResult } from '../api-v1/client';
import type { RoundsListData } from '../api-v1/types';
import type { SeriesTheme } from './series-theme';

// Where the rounds of one series come from. Every series has a source with the same shape, so
// the Home asks them all the same way:
//   a series the backend serves (today only Formula 1): the real `/api/v1/rounds` request;
//   any other series: a stand-in request that answers at once with no rounds.
// The stand-in is a placeholder, decided with the owner on 2026-11-14: it makes those series
// look like they have no events. Weeks are asked for by track date (`dateBasis=track`). When the backend serves a series, give it an `apiId` in
// series-theme.ts and its requests become real, with no other change.

export interface DateRange {
  from: string;
  to: string;
}

export function requestNotCovered(range: DateRange): Promise<ApiResult<RoundsListData>> {
  return Promise.resolve({
    ok: true,
    data: {
      interval: {
        from: range.from,
        to: range.to,
        tz: 'UTC',
        dateBasis: 'track',
        startsAt: `${range.from}T00:00:00Z`,
        endsAt: `${range.to}T00:00:00Z`,
      },
      rounds: [],
    },
    meta: { availability: 'unsupported' },
  });
}

export function requestSeriesRounds(theme: SeriesTheme, range: DateRange): Promise<ApiResult<RoundsListData>> {
  if (theme.apiId) return getRounds({ ...range, tz: 'UTC', seriesId: theme.apiId, dateBasis: 'track' });
  return requestNotCovered(range);
}
