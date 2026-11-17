import { NextResponse } from 'next/server';
import { isHomeSeasonId, loadStandings } from '../../../lib/home/standings-data';

// The standings behind the Home's right column: drivers and teams of one season, for example
// /home-standings?seasonId=f1:2026. Dynamic on purpose: it asks the backend, which must not happen at build time.
// An answer without failures is cached for a short while by the browser and the CDN; an answer with a failure in
// it is never cached, so the next Try again asks the backend again. A failed request is in `failures` of the
// answer; the status is an error only for a bad request.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId');
  if (!isHomeSeasonId(seasonId)) {
    return NextResponse.json(
      { error: { code: 'INVALID_QUERY', message: '"seasonId" must be a season such as f1:2026.' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const standings = await loadStandings(seasonId);
  if (!standings) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'There are no standings for this season.' } },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(standings, {
    headers: {
      'Cache-Control': standings.failures.length > 0 ? 'no-store' : 'public, max-age=30, s-maxage=60',
    },
  });
}
